# Servidor do Xique-Xique 2 (preparação)

O jogo funciona hoje 100 % no navegador. Esta pasta e `src/data/` preparam a ligação ao servidor.

## Estado
- `src/data/ledger.ts`: livro-razão de dupla entrada (o mesmo algoritmo de `server/schema.sql: post_transfer`).
- `src/data/rules.ts`: de onde vem e para onde vai cada tipo de dinheiro (prémios saem de `world:mint`, passagens/licenças/multas/residências vão para `city:treasury`).
- `src/data/api.ts`: contrato `GameApi`. Com `VITE_API_URL` definido, o jogo passa a usar `RemoteApi`.
- `src/data/npcBrain.ts`: horários dos NPCs em função pura, para correr no servidor.
- `server/schema.sql`: tabelas, função `post_transfer`, auditoria e políticas de segurança.

## Para ligar (quando fores ao servidor)
1. Criar projeto Supabase e correr `server/schema.sql`.
2. Definir `VITE_API_URL` e guardar o token em `localStorage['xx2_token']`.
3. Migrar o save: `data/index.ts` já cria `player:<id>`; no login, chamar `my_balance` e reconciliar.
4. Mover a simulação dos NPCs (`planFor`) para um worker no servidor e enviar posições por websocket.
