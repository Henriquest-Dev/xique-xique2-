-- =============================================================================
-- Xique-Xique 2 — esquema PostgreSQL (compatível com Supabase)
-- O cliente nunca altera saldos diretamente: chama funções RPC (abaixo) que
-- validam e gravam tudo de forma atómica. Espelha src/data/ledger.ts.
-- =============================================================================
create extension if not exists pgcrypto;

-- ---- Jogadores -------------------------------------------------------------
create table players (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique,                    -- supabase auth.users.id
  handle        text unique not null,           -- @instagram
  display_name  text not null,
  avatar        jsonb not null default '{}',
  realm         text not null default 'cidade', -- onde está: cidade | savana | floresta | deserto | fazendas | veneza
  pos_x         real not null default 0,
  pos_z         real not null default 0,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ---- Contas e livro-razão (dupla entrada) -----------------------------------
create type account_kind as enum ('player','city','bank','merchant','npc','world');
create table accounts (
  id          text primary key,                 -- player:<uuid> | city:treasury | merchant:mobilia | npc:<id> | world:mint
  kind        account_kind not null,
  label       text not null,
  balance     bigint not null default 0,
  created_at  timestamptz not null default now(),
  -- só contas 'world' podem ficar negativas (emitem dinheiro)
  constraint balance_non_negative check (kind = 'world' or balance >= 0)
);
insert into accounts (id, kind, label) values
  ('world:mint','world','Economia do mundo'),
  ('world:sink','world','Consumo'),
  ('city:treasury','city','Cofre da Prefeitura'),
  ('city:savana','city','Cofre da Prefeitura da Savana'),
  ('city:floresta','city','Cofre da Prefeitura da Floresta'),
  ('city:deserto','city','Cofre da Prefeitura do Deserto'),
  ('city:fazendas','city','Cofre da Prefeitura dos Campos'),
  ('city:veneza','city','Cofre da Prefeitura de Veneza'),
  ('bank:reserve','bank','Reserva do Banco Xique'),
  ('merchant:mobilia','merchant','Loja de móveis'),
  ('merchant:mercado','merchant','Mercados e lojas'),
  ('merchant:imobiliaria','merchant','Imobiliária');

create table transactions (
  id               uuid primary key default gen_random_uuid(),
  category         text not null,
  reason           text not null,
  idempotency_key  text unique,
  created_at       timestamptz not null default now()
);

create table ledger_entries (
  id             bigserial primary key,
  tx_id          uuid not null references transactions(id),
  account_id     text not null references accounts(id),
  direction      text not null check (direction in ('debit','credit')),
  amount         bigint not null check (amount > 0),
  balance_after  bigint not null,
  counterparty   text not null,
  created_at     timestamptz not null default now()
);
create index on ledger_entries (account_id, created_at desc);

-- Transferência atómica e idempotente. Bloqueia as duas contas por ordem de id
-- para evitar deadlocks e recusa saldo insuficiente.
create or replace function post_transfer(
  p_from text, p_to text, p_amount bigint, p_category text, p_reason text, p_key text default null
) returns jsonb language plpgsql security definer as $$
declare
  v_from accounts; v_to accounts; v_tx uuid;
begin
  if p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'invalid_amount'); end if;
  if p_from = p_to then return jsonb_build_object('ok', false, 'error', 'same_account'); end if;
  if p_key is not null then
    select id into v_tx from transactions where idempotency_key = p_key;
    if found then return jsonb_build_object('ok', true, 'txId', v_tx, 'repeated', true); end if;
  end if;
  -- bloqueio ordenado
  perform 1 from accounts where id in (p_from, p_to) order by id for update;
  select * into v_from from accounts where id = p_from;
  select * into v_to   from accounts where id = p_to;
  if v_from.id is null or v_to.id is null then return jsonb_build_object('ok', false, 'error', 'unknown_account'); end if;
  if v_from.kind <> 'world' and v_from.balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'insufficient_funds');
  end if;
  insert into transactions (category, reason, idempotency_key) values (p_category, p_reason, p_key) returning id into v_tx;
  update accounts set balance = balance - p_amount where id = p_from returning * into v_from;
  update accounts set balance = balance + p_amount where id = p_to   returning * into v_to;
  insert into ledger_entries (tx_id, account_id, direction, amount, balance_after, counterparty) values
    (v_tx, p_to,   'credit', p_amount, v_to.balance,   p_from),
    (v_tx, p_from, 'debit',  p_amount, v_from.balance, p_to);
  return jsonb_build_object('ok', true, 'txId', v_tx, 'fromBalance', v_from.balance, 'toBalance', v_to.balance);
end $$;

-- Auditoria: a soma de todas as contas tem de ser sempre 0.
create or replace view economy_audit as
  select coalesce(sum(balance),0) as total, count(*) as accounts from accounts;

-- ---- Banco (conta + poupança com juros) ------------------------------------
create table bank_accounts (
  player_id      uuid primary key references players(id) on delete cascade,
  account_no     text unique not null,
  savings        bigint not null default 0 check (savings >= 0),
  interest_total bigint not null default 0,
  last_accrual   timestamptz not null default now()
);

-- ---- Licenças, residências, inventário, casas -------------------------------
create table licenses   (player_id uuid references players(id) on delete cascade, license text, company text, issued_at timestamptz default now(), primary key (player_id, license));
create table residencies (player_id uuid references players(id) on delete cascade, realm text, paid bigint not null, since timestamptz default now(), primary key (player_id, realm));
create table inventory  (player_id uuid references players(id) on delete cascade, item_id text, count int not null check (count >= 0), primary key (player_id, item_id));
create table resources  (player_id uuid references players(id) on delete cascade, resource text, amount int not null check (amount >= 0), primary key (player_id, resource));

create table lots (
  id           int primary key,
  owner_id     uuid references players(id),
  price        bigint not null,
  for_sale     boolean not null default false,
  realm        text not null default 'cidade'
);

-- Móveis: ficam na mochila (house_id null) até serem colocados dentro da casa.
create table furniture (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references players(id) on delete cascade,
  catalog_id   text not null,
  lot_id       int references lots(id),
  cell_x       int, cell_z int, rot smallint default 0,
  bought_at    timestamptz not null default now(),
  check ((lot_id is null) = (cell_x is null))
);

-- ---- NPCs e missões ----------------------------------------------------------
create table npc_state (
  npc_id      text primary key,
  name        text not null,
  realm       text not null default 'cidade',
  activity    text not null default 'idle',
  spot        text,
  pos_x       real, pos_z real,
  mood        smallint not null default 50,
  energy      smallint not null default 100,
  updated_at  timestamptz not null default now()
);
create table quest_progress (
  player_id   uuid references players(id) on delete cascade,
  npc_id      text not null,
  accepted_at timestamptz,
  done_at     timestamptz,
  primary key (player_id, npc_id)
);

-- ---- Segurança (Supabase RLS): cada jogador só lê os seus dados -------------
alter table players enable row level security;
alter table accounts enable row level security;
alter table ledger_entries enable row level security;
create policy "ver o próprio perfil" on players for select using (auth.uid() = auth_user_id);
create policy "ver a própria conta" on accounts for select using (id = 'player:' || (select id::text from players where auth_user_id = auth.uid()) or kind in ('city'));
create policy "ver o próprio extrato" on ledger_entries for select using (account_id = 'player:' || (select id::text from players where auth_user_id = auth.uid()));
-- Escritas: apenas via funções security definer (post_transfer, buy_furniture, ...).
