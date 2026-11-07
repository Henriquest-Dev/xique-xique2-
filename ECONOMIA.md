# Xique-Xique 2 — Economia, monetização e segurança

## 1. Princípio
Livro-razão de dupla entrada (`src/data/ledger.ts`): todo o dinheiro move-se entre contas; a soma de todas as contas é sempre 0. Só as contas `world:*` (criação/destruição de moeda) podem ficar negativas. Cada operação tem chave de idempotência. O saldo mostrado = saldo do razão.

## 2. Fontes de rendimento do jogador (entram por `world:mint`, com teto)
| Fonte | Pagamento | Cooldown |
|---|---|---|
| Trabalho | X$ 20–140 | 45 s |
| Missão | X$ 30–300 | 120 s |
| Colheita | X$ 6–60 | 20 s |
| Táxi (carro próprio) | X$ 10–120 | 30 s |
| Comércio / lojas / indústria | margem de venda | por stock |
| Renda de imóveis | aluguer | por hora |
Teto anti-inflação: 3.000 X$/hora; acima disso paga só 10%.

## 3. Despesas (sumidouros) e licenças
Terrenos (250–1800, mais caro perto do centro), carros (900–12.500 + IVA 16%), licenças com validade (Obra 300/60 dias, Motorista 150/90 dias), comissões, juros, multas.

## 4. Banco e crédito
- Transferência entre jogadores: comissão 2% (mín. 1), máx. 50.000 por operação, 100.000/dia (5.000 nos primeiros dias da conta).
- Banco: 2%/h, prazo 24 h, taxa de abertura 1%, máx. 20.000, depende da pontuação de crédito (300–850) e do património.
- Agiota: 10%/h, prazo 6 h, máx. 1.500, multa de atraso 25%. Com um lote em garantia (60% do valor) o limite sobe. Em incumprimento: carência de 6 h, penhora do saldo, depois do lote; pontuação cai e fica 7 dias sem crédito.

## 5. Terrenos
Lotes à venda compram-se diretamente. Local personalizado: Telefone → Marcar → Prefeitura → Terreno → comprar (precisa do Alvará de Obra). Máx. 3 marcações, expiram em 24 h, distância mínima de 14 m entre lotes, não se constrói em água, encostas ou estradas. A casa é construída automaticamente após a compra.

## 6. Concessionária Xique Motors (só do dono)
Compra/revenda (50%) e catálogo: qualquer jogador compra. Preço, stock e levantamento de caixa: só o dono. A receita vai para `platform:concessionaria`. O dono é definido por `VITE_OWNER_HANDLE` no cliente e, no servidor, pela coluna `players.role = 'owner'` (que só tu alteras no Supabase).

## 7. Monetização
1. Comissão de transferências (2%).
2. Taxas de crédito (abertura 1%) e spread do agiota.
3. Margem da concessionária (preço − custo) + 16% IVA para a cidade.
4. Licenças e renovações.
5. Futuro: cosméticos e pacotes pagos. Regra: dinheiro real só compra cosméticos ou moeda através do servidor (nunca crédito feito no cliente).

## 8. Segurança — o que é e não é possível
- **No navegador nada é inviolável.** Quem abre as ferramentas de desenvolvedor consegue alterar o localStorage. O cliente tem: razão assinado (deteta adulteração), tetos de ganho, `cheatMoney` só em modo DEV. Isto trava curiosos, não atacantes.
- **Proteção real = servidor** (`server/finance.sql`, funções Supabase security definer): o cliente nunca envia valores ganhos nem escreve saldos; o servidor decide pagamentos, aplica cooldowns, limites diários, valida licenças, trava linhas contra corridas (`for update`), e as tabelas ficam sem escrita direta (RLS + revoke). `post_transfer` e `fin_tick_loans` não são chamáveis pelo cliente.
- Antes de lançar com dinheiro real: ligar o modo servidor, agendar `fin_tick_loans()` a cada minuto (pg_cron), preencher `fin_no_build` com as áreas não edificáveis, e fazer testes de carga.
