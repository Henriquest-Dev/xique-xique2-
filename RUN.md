# Como correr e testar o Xique-Xique 2

Precisas só do Node.js 18+ (já tens). Dentro desta pasta:

```
npm install        # só na primeira vez
npm run doctor     # verifica ambiente, ficheiros e tipos (opcional: npm run doctor:build)
npm run dev        # arranca em http://localhost:3000
```

No Windows podes só fazer duplo clique em `JOGAR.bat` (faz tudo e abre o navegador).

## Como testar e reportar falhas
1. Joga normalmente. Os erros do navegador ficam registados automaticamente.
2. Carrega em Esc (menu de pausa) > **Teste e relatório de falhas**.
3. **Correr auto-teste** mostra OK/FALHA (contas, livro-razão, metro, outdoors, FPS, erros).
4. **Copiar relatório** (ou **Descarregar .json**) e cola-o na conversa comigo. Diz também o que estavas a fazer e, se puderes, envia uma captura de ecrã.

## O que experimentar (roteiro de teste)
- Aeroporto/Porto/Doca: viajar para cada ilha (avião e barco). O comboio só faz viagens dentro da cidade.
- Entrar numa estação de metro (sinal M), ir à plataforma, viajar para outra estação, subir à rua.
- Prefeitura da cidade e de cada ilha: candidatar-te, alugar o carro de campanha (Aluguer), andar pelas ruas e ver os seguidores.
- Outdoors: aproximar-te de um painel e comprar um anúncio; o dirigível também aceita anúncios.
- Usina Nuclear (zona norte): entrar e ver o fluxo de energia.
- Veículos: Moto 4, carros e jet ski (V para devolver).
- Casa: comprar móveis, ficam na mochila e só se colocam dentro de casa.

## Servidor
Sem servidor o jogo grava tudo no navegador (localStorage). Para ligar o servidor ver `server/README.md` e definir `VITE_API_URL` num ficheiro `.env`.
