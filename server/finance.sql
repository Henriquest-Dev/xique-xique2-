-- =============================================================================
-- Xique-Xique 2 — LÓGICA FINANCEIRA NO SERVIDOR (PostgreSQL / Supabase)
-- Corre DEPOIS de schema.sql. Espelha src/finance/engine.ts e src/finance/catalog.ts.
--
-- REGRA DE OURO ANTI-BATOTA: o cliente NUNCA envia "quanto ganhou" nem escreve saldos.
-- Só chama estas funções; cada uma valida tudo (quem é, quanto, limites, cooldowns) e
-- grava de forma atómica. O papel de dono ('owner') vive na tabela players, só tu
-- o defines (UPDATE manual no painel do Supabase), nunca vem do navegador.
-- =============================================================================

-- ---- Configuração (mesmos números de catalog.ts) -----------------------------
create table if not exists fin_config (key text primary key, value numeric not null);
insert into fin_config (key, value) values
  ('transfer_pct', 0.02), ('transfer_min', 1), ('transfer_max', 50000), ('transfer_daily', 100000), ('transfer_daily_new', 5000),
  ('iva_pct', 0.16), ('earn_cap_hour', 3000), ('earn_over_cap', 0.1),
  ('bank_rate', 0.02), ('bank_term_h', 24), ('bank_orig', 0.01), ('bank_max', 20000), ('bank_late', 0.05),
  ('agiota_rate', 0.10), ('agiota_term_h', 6), ('agiota_max', 1500), ('agiota_late', 0.25), ('agiota_ltv', 0.6),
  ('grace_h', 6), ('land_ttl_h', 24), ('land_spacing', 14), ('land_max_stakes', 3), ('garage_max', 5), ('buyback', 0.5)
on conflict (key) do nothing;
create or replace function cfg(k text) returns numeric language sql stable as $$ select value from fin_config where key = k $$;

alter table players add column if not exists role text not null default 'player' check (role in ('player','owner'));
alter table lots    add column if not exists x real;
alter table lots    add column if not exists z real;

insert into accounts (id, kind, label) values
  ('platform:revenue','merchant','Receitas da plataforma (dono)'),
  ('platform:concessionaria','merchant','Concessionária Xique Motors (dono)'),
  ('npc:agiota','npc','Agiota — Seu Tiago')
on conflict do nothing;

-- ---- Tabelas ------------------------------------------------------------------
create table if not exists fin_credit (
  player_id uuid primary key references players(id) on delete cascade,
  score int not null default 500 check (score between 300 and 850),
  on_time int not null default 0, late int not null default 0, defaults int not null default 0,
  blocked_until timestamptz
);
create table if not exists fin_loans (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  kind text not null check (kind in ('bank','agiota')),
  principal bigint not null check (principal > 0),
  taken_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid bigint not null default 0 check (paid >= 0),
  penalty bigint not null default 0,
  collateral_lot int references lots(id),
  status text not null default 'active' check (status in ('active','paid','defaulted','seized')),
  late_applied boolean not null default false
);
create index if not exists fin_loans_active on fin_loans (player_id) where status = 'active';
create table if not exists fin_stakes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  x real not null, z real not null,
  created_at timestamptz not null default now(), expires_at timestamptz not null
);
create table if not exists fin_car_catalog (
  id text primary key, name text not null, vehicle text not null,
  price bigint not null check (price > 0), cost bigint not null check (cost > 0), stock int not null check (stock >= 0),
  check (price >= cost)
);
insert into fin_car_catalog values
  ('sedan','Sedan Xique','sedan',2400,1700,12), ('taxi','Táxi Amarelo','taxi',2600,1850,8), ('suv','SUV Luxo','suv',6800,4900,6),
  ('sports','Desportivo GT','sports',12500,8800,3), ('truck','Camião de Carga','truck',5200,3700,6), ('quad','Moto 4','quad',900,600,15)
on conflict do nothing;
create table if not exists fin_garage (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  model text not null references fin_car_catalog(id), paid bigint not null, plate text not null,
  bought_at timestamptz not null default now()
);
create table if not exists fin_income_rules (
  kind text primary key, min_pay int not null, max_pay int not null, cooldown_s int not null
);
insert into fin_income_rules values ('job',20,140,45), ('quest',30,300,120), ('harvest',6,60,20), ('taxi',10,120,30) on conflict do nothing;
create table if not exists fin_earn_log (id bigserial primary key, player_id uuid not null, kind text not null, amount bigint not null, at timestamptz not null default now());
create index if not exists fin_earn_log_p on fin_earn_log (player_id, at desc);

-- ---- Ajudantes ----------------------------------------------------------------
create or replace function fin_me() returns players language plpgsql stable security definer set search_path = public as $$
declare p players; begin
  select * into p from players where auth_user_id = auth.uid();
  if p.id is null then raise exception 'not_authenticated'; end if;
  return p;
end $$;
create or replace function fin_acc(pid uuid) returns text language sql immutable as $$ select 'player:' || pid::text $$;
create or replace function fin_err(code text, msg text) returns jsonb language sql immutable as $$ select jsonb_build_object('ok', false, 'error', code, 'message', msg) $$;
create or replace function fin_has_license(pid uuid, lic text) returns boolean language sql stable as $$
  select exists (select 1 from licenses where player_id = pid and license = lic and issued_at + (case lic when 'obra' then 60 when 'motorista' then 90 else 30 end || ' days')::interval > now())
$$;
create or replace function fin_city(p players) returns text language sql stable as $$ select case when p.realm = 'cidade' then 'city:treasury' else 'city:' || p.realm end $$;

-- ---- Rendimento decidido PELO SERVIDOR (o cliente só diz "acabei o trabalho X") --
create or replace function fin_earn(p_kind text, p_ref text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); r fin_income_rules; last_at timestamptz; used bigint; amt bigint; pay bigint; room bigint;
begin
  select * into r from fin_income_rules where kind = p_kind;
  if r.kind is null then return fin_err('invalid', 'Tipo de rendimento inválido.'); end if;
  select max(at) into last_at from fin_earn_log where player_id = me.id and kind = p_kind;
  if last_at is not null and now() - last_at < make_interval(secs => r.cooldown_s) then return fin_err('cooldown', 'Calma: ainda estás a descansar do último trabalho.'); end if;
  amt := r.min_pay + floor(random() * (r.max_pay - r.min_pay + 1));
  select coalesce(sum(amount), 0) into used from fin_earn_log where player_id = me.id and at > now() - interval '1 hour';
  room := greatest(0, cfg('earn_cap_hour')::bigint - used);
  pay := least(amt, room) + round((amt - least(amt, room)) * cfg('earn_over_cap'));
  insert into fin_earn_log (player_id, kind, amount) values (me.id, p_kind, amt);
  if pay > 0 then perform post_transfer('world:mint', fin_acc(me.id), pay, 'job', 'Rendimento: ' || p_kind, null); end if;
  return jsonb_build_object('ok', true, 'paid', pay, 'message', 'Recebeste X$ ' || pay);
end $$;

-- ---- Transferências -----------------------------------------------------------
create or replace function fin_transfer(p_to_handle text, p_amount bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); dest players; fee bigint; sent_today bigint; lim bigint; bal bigint; res jsonb;
begin
  if p_amount is null or p_amount < 1 then return fin_err('invalid', 'Valor inválido.'); end if;
  if p_amount > cfg('transfer_max') then return fin_err('limit', 'Acima do máximo por transferência.'); end if;
  select * into dest from players where handle = lower(replace(p_to_handle, '@', ''));
  if dest.id is null then return fin_err('not_found', 'Não encontrei esse cidadão.'); end if;
  if dest.id = me.id then return fin_err('invalid', 'Não podes transferir para ti mesmo.'); end if;
  fee := greatest(cfg('transfer_min')::bigint, round(p_amount * cfg('transfer_pct')));
  perform 1 from accounts where id = fin_acc(me.id) for update;   -- serializa pedidos do mesmo jogador
  select balance into bal from accounts where id = fin_acc(me.id);
  if bal < p_amount + fee then return fin_err('insufficient', 'Saldo insuficiente.'); end if;
  select coalesce(sum(amount), 0) into sent_today from ledger_entries le join transactions t on t.id = le.tx_id
    where le.account_id = fin_acc(me.id) and le.direction = 'debit' and t.category = 'transfer' and le.created_at > now() - interval '1 day';
  lim := case when now() - me.created_at < interval '1 day' then cfg('transfer_daily_new') else cfg('transfer_daily') end;
  if sent_today + p_amount > lim then return fin_err('limit', 'Limite diário de transferências atingido.'); end if;
  res := post_transfer(fin_acc(me.id), fin_acc(dest.id), p_amount, 'transfer', 'Transferência para @' || dest.handle, null);
  if not (res->>'ok')::boolean then return res; end if;
  perform post_transfer(fin_acc(me.id), 'platform:revenue', fee, 'fee', 'Comissão de transferência', null);
  return jsonb_build_object('ok', true, 'fee', fee, 'message', 'Transferência enviada.');
end $$;

-- ---- Crédito ------------------------------------------------------------------
create or replace function fin_owed(l fin_loans) returns bigint language sql stable as $$
  select case when l.status <> 'active' then 0 else greatest(0,
    l.principal + round(l.principal * (case l.kind when 'bank' then cfg('bank_rate') else cfg('agiota_rate') end)
      * least(extract(epoch from (now() - l.taken_at)) / 3600.0, (case l.kind when 'bank' then cfg('bank_term_h') else cfg('agiota_term_h') end) * 3))
    + l.penalty - l.paid) end
$$;
create or replace function fin_lot_value(lid int) returns bigint language sql stable as $$ select coalesce(round(price * 0.6), 0) from lots where id = lid $$;
create or replace function fin_net_worth(pid uuid) returns bigint language sql stable as $$
  select coalesce((select balance from accounts where id = fin_acc(pid)), 0)
       + coalesce((select sum(fin_lot_value(id)) from lots where owner_id = pid), 0)
       + coalesce((select sum(round(paid * cfg('buyback'))) from fin_garage where player_id = pid), 0)
$$;
create or replace function fin_credit_limit(pid uuid, p_kind text, p_lot int default null) returns bigint language plpgsql stable security definer set search_path = public as $$
declare c fin_credit; base numeric; lim numeric;
begin
  select * into c from fin_credit where player_id = pid;
  if c.player_id is null then c := row(pid, 500, 0, 0, 0, null)::fin_credit; end if;
  if c.blocked_until is not null and c.blocked_until > now() then return 0; end if;
  if p_kind = 'bank' then
    if c.score < 400 then return 0; end if;
    base := (300 + 0.25 * fin_net_worth(pid)) * (c.score / 700.0);
    return greatest(0, least(cfg('bank_max'), floor(base / 10) * 10))::bigint;
  end if;
  lim := 400;
  if p_lot is not null and exists (select 1 from lots where id = p_lot and owner_id = pid) then lim := 400 + floor(fin_lot_value(p_lot) * cfg('agiota_ltv')); end if;
  return least(cfg('agiota_max'), lim)::bigint;
end $$;

create or replace function fin_take_loan(p_kind text, p_amount bigint, p_lot int default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); lender text; lim bigint; used bigint; fee bigint; n int; maxn int; ln uuid; term numeric; orig numeric; minamt bigint; res jsonb;
begin
  if p_kind not in ('bank','agiota') then return fin_err('invalid', 'Tipo de crédito inválido.'); end if;
  perform 1 from accounts where id = fin_acc(me.id) for update;
  lender := case p_kind when 'bank' then 'bank:reserve' else 'npc:agiota' end;
  maxn := case p_kind when 'bank' then 1 else 2 end;
  minamt := case p_kind when 'bank' then 100 else 50 end;
  term := case p_kind when 'bank' then cfg('bank_term_h') else cfg('agiota_term_h') end;
  orig := case p_kind when 'bank' then cfg('bank_orig') else 0 end;
  if p_amount is null or p_amount < minamt then return fin_err('invalid', 'Valor abaixo do mínimo.'); end if;
  select count(*), coalesce(sum(principal), 0) into n, used from fin_loans where player_id = me.id and kind = p_kind and status = 'active';
  if n >= maxn then return fin_err('limit', 'Já tens o máximo de empréstimos ativos deste tipo.'); end if;
  if p_lot is not null then
    if not exists (select 1 from lots where id = p_lot and owner_id = me.id) then return fin_err('forbidden', 'Esse lote não é teu.'); end if;
    if exists (select 1 from fin_loans where collateral_lot = p_lot and status = 'active') then return fin_err('blocked', 'Esse lote já está em garantia.'); end if;
  end if;
  lim := fin_credit_limit(me.id, p_kind, p_lot);
  if lim <= 0 then return fin_err('blocked', 'Crédito recusado (histórico ou bloqueio).'); end if;
  if p_amount + used > lim then return fin_err('limit', 'Acima do teu limite de crédito.'); end if;
  fee := round(p_amount * orig);
  insert into fin_loans (player_id, kind, principal, due_at, collateral_lot) values (me.id, p_kind, p_amount, now() + make_interval(hours => term::int), p_lot) returning id into ln;
  res := post_transfer(lender, fin_acc(me.id), p_amount, 'loan', 'Empréstimo ' || p_kind, 'loan:' || ln);
  if not (res->>'ok')::boolean then raise exception 'loan_failed:%', res->>'error'; end if;   -- desfaz o insert
  if fee > 0 then perform post_transfer(fin_acc(me.id), 'platform:revenue', fee, 'fee', 'Taxa de abertura de crédito', null); end if;
  return jsonb_build_object('ok', true, 'loanId', ln, 'message', 'Empréstimo concedido.');
exception when others then
  if sqlerrm like 'loan_failed:%' then return fin_err('stock', 'O credor não tem fundos agora.'); end if;
  raise;
end $$;

create or replace function fin_repay(p_loan uuid, p_amount bigint default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); l fin_loans; owed bigint; pay bigint; bal bigint; left bigint;
begin
  perform 1 from accounts where id = fin_acc(me.id) for update;
  select * into l from fin_loans where id = p_loan and player_id = me.id and status = 'active' for update;
  if l.id is null then return fin_err('not_found', 'Empréstimo não encontrado.'); end if;
  owed := fin_owed(l);
  select balance into bal from accounts where id = fin_acc(me.id);
  pay := least(coalesce(p_amount, owed), owed, bal);
  if pay <= 0 then return fin_err('insufficient', 'Sem saldo para pagar.'); end if;
  perform post_transfer(fin_acc(me.id), case l.kind when 'bank' then 'bank:reserve' else 'npc:agiota' end, pay, 'repay', 'Pagamento de empréstimo', null);
  update fin_loans set paid = paid + pay where id = l.id returning * into l;
  left := fin_owed(l);
  if left <= 0 then
    update fin_loans set status = 'paid' where id = l.id;
    if now() <= l.due_at then
      insert into fin_credit (player_id, score, on_time) values (me.id, 525, 1)
        on conflict (player_id) do update set score = least(850, fin_credit.score + 25), on_time = fin_credit.on_time + 1;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'left', left, 'message', case when left <= 0 then 'Empréstimo quitado!' else 'Pagamento registado.' end);
end $$;

-- Cobranças (agendar de minuto a minuto: pg_cron ou Edge Function). Multas, penhoras, cobradores.
create or replace function fin_tick_loans() returns int language plpgsql security definer set search_path = public as $$
declare l fin_loans; k text; lender text; late numeric; owed bigint; bal bigint; grab bigint; val bigint; take bigint; n int := 0;
begin
  for l in select * from fin_loans where status = 'active' and due_at < now() order by due_at for update skip locked loop
    lender := case l.kind when 'bank' then 'bank:reserve' else 'npc:agiota' end;
    late := case l.kind when 'bank' then cfg('bank_late') else cfg('agiota_late') end;
    if not l.late_applied then
      update fin_loans set late_applied = true, penalty = penalty + round(principal * late) where id = l.id returning * into l;
      insert into fin_credit (player_id, score, late) values (l.player_id, 460, 1)
        on conflict (player_id) do update set score = greatest(300, fin_credit.score - 40), late = fin_credit.late + 1;
      n := n + 1;
    end if;
    if now() > l.due_at + make_interval(hours => cfg('grace_h')::int) then
      owed := fin_owed(l);
      select balance into bal from accounts where id = fin_acc(l.player_id);
      grab := least(owed, bal);
      if grab > 0 then
        perform post_transfer(fin_acc(l.player_id), lender, grab, 'seizure', 'Penhora/cobrador', null);
        update fin_loans set paid = paid + grab where id = l.id; owed := owed - grab;
      end if;
      if owed > 0 and l.collateral_lot is not null then
        val := fin_lot_value(l.collateral_lot); take := least(owed, val);
        update lots set owner_id = null where id = l.collateral_lot;
        perform post_transfer('city:treasury', lender, least(take, (select balance from accounts where id = 'city:treasury')), 'seizure', 'Lote penhorado', null);
        if val - take > 0 then perform post_transfer('city:treasury', fin_acc(l.player_id), least(val - take, (select balance from accounts where id = 'city:treasury')), 'refund', 'Excedente da penhora', null); end if;
        update fin_loans set paid = paid + take, status = 'seized' where id = l.id;
      elsif owed > 0 then update fin_loans set status = 'defaulted' where id = l.id;
      else update fin_loans set status = 'paid' where id = l.id;
      end if;
      if (select status from fin_loans where id = l.id) <> 'paid' then
        insert into fin_credit (player_id, score, defaults, blocked_until) values (l.player_id, 380, 1, now() + interval '7 days')
          on conflict (player_id) do update set score = greatest(300, fin_credit.score - 120), defaults = fin_credit.defaults + 1, blocked_until = now() + interval '7 days';
      end if;
      n := n + 1;
    end if;
  end loop;
  delete from fin_stakes where expires_at < now();
  return n;
end $$;

-- ---- Terrenos: marcar coordenada e comprar na Prefeitura -----------------------
create or replace function fin_land_price(px real, pz real) returns bigint language sql immutable as $$
  select (round(least(1800, greatest(250, 450 - 1.2 * sqrt(px*px + pz*pz) + 600 * exp(-sqrt(px*px + pz*pz) / 120.0))) / 5) * 5)::bigint
$$;
create or replace function fin_mark_stake(px real, pz real, p_buildable boolean default true) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); st uuid; n int;
begin
  -- NOTA: p_buildable vem do cliente só como pré-filtro de UX. A verificação real de
  -- estradas/água usa a tabela fin_no_build (retângulos) que preenches com o mapa.
  delete from fin_stakes where expires_at < now();
  select count(*) into n from fin_stakes where player_id = me.id;
  if n >= cfg('land_max_stakes') then return fin_err('limit', 'Máximo de marcações atingido.'); end if;
  if px < -430 or px > 650 or pz < -380 or pz > 150 then return fin_err('blocked', 'Fora da área edificável.'); end if;
  if exists (select 1 from fin_no_build b where px between b.min_x and b.max_x and pz between b.min_z and b.max_z) then return fin_err('blocked', 'Não se pode construir aqui.'); end if;
  if exists (select 1 from lots where x is not null and sqrt((x-px)^2 + (z-pz)^2) < cfg('land_spacing'))
     or exists (select 1 from fin_stakes where sqrt((x-px)^2 + (z-pz)^2) < cfg('land_spacing')) then
    return fin_err('blocked', 'Demasiado perto de outro lote.');
  end if;
  insert into fin_stakes (player_id, x, z, expires_at) values (me.id, px, pz, now() + make_interval(hours => cfg('land_ttl_h')::int)) returning id into st;
  return jsonb_build_object('ok', true, 'stakeId', st, 'price', fin_land_price(px, pz), 'message', 'Coordenada marcada.');
end $$;
create table if not exists fin_no_build (min_x real, max_x real, min_z real, max_z real, why text);

create or replace function fin_buy_stake(p_stake uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); s fin_stakes; price bigint; lid int; res jsonb;
begin
  perform 1 from accounts where id = fin_acc(me.id) for update;
  select * into s from fin_stakes where id = p_stake and player_id = me.id and expires_at > now() for update;
  if s.id is null then return fin_err('not_found', 'A marcação expirou ou não existe.'); end if;
  if not fin_has_license(me.id, 'obra') then return fin_err('no_license', 'Precisas do Alvará de Obra.'); end if;
  if exists (select 1 from lots where x is not null and sqrt((x-s.x)^2 + (z-s.z)^2) < cfg('land_spacing')) then
    delete from fin_stakes where id = s.id; return fin_err('blocked', 'O terreno deixou de estar disponível.');
  end if;
  price := fin_land_price(s.x, s.z);
  res := post_transfer(fin_acc(me.id), fin_city(me), price, 'property', 'Compra de terreno', 'stake:' || s.id);
  if not (res->>'ok')::boolean then return fin_err(res->>'error', 'Pagamento recusado.'); end if;
  select coalesce(max(id), 999) + 1 into lid from lots where id >= 1000;
  insert into lots (id, owner_id, price, for_sale, realm, x, z) values (lid, me.id, price, false, me.realm, s.x, s.z);
  delete from fin_stakes where id = s.id;
  return jsonb_build_object('ok', true, 'lotId', lid, 'price', price, 'message', 'Terreno comprado! Casa em construção.');
end $$;

create or replace function fin_sell_lot(p_lot int) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); v bigint; cityacc text; bal bigint; res jsonb;
begin
  perform 1 from lots where id = p_lot and owner_id = me.id for update;
  if not found then return fin_err('forbidden', 'Esse lote não é teu.'); end if;
  if exists (select 1 from fin_loans where collateral_lot = p_lot and status = 'active') then return fin_err('blocked', 'Lote em garantia de empréstimo.'); end if;
  cityacc := fin_city(me); select balance into bal from accounts where id = cityacc;
  v := least(fin_lot_value(p_lot), bal);
  if v <= 0 then return fin_err('stock', 'O cofre da Prefeitura não tem fundos.'); end if;
  res := post_transfer(cityacc, fin_acc(me.id), v, 'sale', 'Venda do lote à Prefeitura', 'sell:' || p_lot || ':' || extract(epoch from now())::bigint);
  if not (res->>'ok')::boolean then return res; end if;
  update lots set owner_id = null where id = p_lot;
  return jsonb_build_object('ok', true, 'value', v, 'message', 'Lote vendido.');
end $$;

-- ---- Concessionária -----------------------------------------------------------
create or replace function fin_buy_car(p_model text) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); m fin_car_catalog; iva bigint; n int; cid uuid; res jsonb; plate text;
begin
  perform 1 from accounts where id = fin_acc(me.id) for update;
  select * into m from fin_car_catalog where id = p_model for update;       -- bloqueia o stock
  if m.id is null then return fin_err('not_found', 'Modelo inexistente.'); end if;
  if not fin_has_license(me.id, 'motorista') then return fin_err('no_license', 'Precisas da Carta de Condução.'); end if;
  select count(*) into n from fin_garage where player_id = me.id;
  if n >= cfg('garage_max') then return fin_err('limit', 'Garagem cheia.'); end if;
  if m.stock <= 0 then return fin_err('stock', 'Modelo esgotado.'); end if;
  iva := round(m.price * cfg('iva_pct'));
  if (select balance from accounts where id = fin_acc(me.id)) < m.price + iva then return fin_err('insufficient', 'Saldo insuficiente.'); end if;
  cid := gen_random_uuid();
  res := post_transfer(fin_acc(me.id), 'platform:concessionaria', m.price, 'vehicle', 'Compra: ' || m.name, 'car:' || cid);
  if not (res->>'ok')::boolean then return fin_err(res->>'error', 'Pagamento recusado.'); end if;
  perform post_transfer(fin_acc(me.id), fin_city(me), iva, 'tax', 'IVA da concessionária', null);
  plate := 'XX-' || (10 + floor(random() * 89))::int || '-' || chr(65 + floor(random()*26)::int) || chr(65 + floor(random()*26)::int);
  insert into fin_garage (id, player_id, model, paid, plate) values (cid, me.id, m.id, m.price, plate);
  update fin_car_catalog set stock = stock - 1 where id = m.id;
  return jsonb_build_object('ok', true, 'carId', cid, 'plate', plate, 'message', 'Carro comprado!');
end $$;

create or replace function fin_sell_car(p_car uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); g fin_garage; v bigint; res jsonb;
begin
  select * into g from fin_garage where id = p_car and player_id = me.id for update;
  if g.id is null then return fin_err('not_found', 'Carro não encontrado.'); end if;
  v := round(g.paid * cfg('buyback'));
  if (select balance from accounts where id = 'platform:concessionaria') < v then return fin_err('stock', 'A concessionária não tem caixa.'); end if;
  res := post_transfer('platform:concessionaria', fin_acc(me.id), v, 'sale', 'Revenda à concessionária', 'sellcar:' || g.id);
  if not (res->>'ok')::boolean then return res; end if;
  delete from fin_garage where id = g.id;
  update fin_car_catalog set stock = stock + 1 where id = g.model;
  return jsonb_build_object('ok', true, 'value', v, 'message', 'Carro vendido.');
end $$;

-- ---- Área do dono (role vem da BASE DE DADOS) -----------------------------------
create or replace function fin_owner_set_car(p_model text, p_price bigint, p_stock int) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me();
begin
  if me.role <> 'owner' then return fin_err('forbidden', 'Só o dono pode fazer isto.'); end if;
  begin
    update fin_car_catalog set price = coalesce(p_price, price), stock = coalesce(p_stock, stock) where id = p_model;
  exception when check_violation then return fin_err('invalid', 'Preço abaixo do custo ou stock inválido.'); end;
  return jsonb_build_object('ok', true, 'message', 'Catálogo atualizado.');
end $$;
create or replace function fin_owner_withdraw(p_from text, p_amount bigint) returns jsonb language plpgsql security definer set search_path = public as $$
declare me players := fin_me(); acc text; reserve bigint; res jsonb;
begin
  if me.role <> 'owner' then return fin_err('forbidden', 'Só o dono pode levantar.'); end if;
  if p_from not in ('dealership','revenue') then return fin_err('invalid', 'Conta inválida.'); end if;
  acc := case p_from when 'dealership' then 'platform:concessionaria' else 'platform:revenue' end;
  reserve := case p_from when 'dealership' then 5000 else 0 end;
  if p_amount is null or p_amount <= 0 or (select balance from accounts where id = acc) - reserve < p_amount then return fin_err('insufficient', 'Acima do disponível.'); end if;
  res := post_transfer(acc, fin_acc(me.id), p_amount, 'transfer', 'Levantamento do dono', null);
  return res;
end $$;

-- ---- Segurança: nada de escrita direta; só as funções acima -------------------------
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke execute on function post_transfer(text,text,bigint,text,text,text) from anon, authenticated, public';
    execute 'revoke execute on function fin_tick_loans() from anon, authenticated, public';
    execute 'grant execute on function fin_earn(text,text), fin_transfer(text,bigint), fin_take_loan(text,bigint,int), fin_repay(uuid,bigint), fin_mark_stake(real,real,boolean), fin_buy_stake(uuid), fin_sell_lot(int), fin_buy_car(text), fin_sell_car(uuid), fin_owner_set_car(text,bigint,int), fin_owner_withdraw(text,bigint) to authenticated';
  end if;
end $$;
alter table fin_loans enable row level security; alter table fin_stakes enable row level security; alter table fin_garage enable row level security; alter table fin_credit enable row level security;
create policy "ver os próprios empréstimos" on fin_loans for select using (player_id = (select id from players where auth_user_id = auth.uid()));
create policy "ver as próprias marcações" on fin_stakes for select using (player_id = (select id from players where auth_user_id = auth.uid()));
create policy "ver a própria garagem" on fin_garage for select using (player_id = (select id from players where auth_user_id = auth.uid()));
create policy "ver o próprio crédito" on fin_credit for select using (player_id = (select id from players where auth_user_id = auth.uid()));
