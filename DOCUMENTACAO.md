# Xique-Xique 2 — Documentação do projeto

> Cidade baiana à beira-mar em 3D, feita com React + Vite + Three.js. Um só
> save local, sem servidor: o mundo, a economia, as casas e o jornal vivem no
> `localStorage` do navegador.
>
> Este documento cobre a arquitetura, os controlos, os biomas, os sistemas de
> jogo e o histórico de alterações desde a primeira edição.

---

## 1. Visão geral

| Item | Valor |
| --- | --- |
| Nome | Xique-Xique 2 · Cidade do Caramelo |
| Tipo | MMO local / simulação de cidade em terceira pessoa |
| Stack | React 19, Vite 8, Three.js 0.187, TypeScript 7, Tailwind 4 |
| Persistência | `localStorage` (`xiquexique2_save_v3`) |
| Assets | pacotes Kenney (Mini, Blocky, Cube Pets, Nature, City) + modelos procedurais |
| Idioma da UI | Português (Brasil) |
| UI | sem emojis; ícones SVG inline (`GameIcon`) e `lucide-react` |

Objetivo do jogo: explorar a cidade a pé, comprar e decorar um lote, trabalhar
(padaria, fazenda, pesca, entregas), abrir negócios legais, arriscar no mercado
paralelo, votar na eleição e acompanhar tudo no **Jornal Chique-Chique**.

---

## 2. Como correr

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção (dist/)
npm run lint     # tsc --noEmit
```

O servidor de desenvolvimento usa `--host=0.0.0.0` para poder ser aberto a
partir do telemóvel na mesma rede.

---

## 3. Estrutura do código

```
src/
  App.tsx                  # orquestração de ecrãs, painéis e HUD
  types/game.ts            # contrato de domínio (estado, lotes, negócios, jornal)
  game/
    GameEngine.ts          # renderer, loop, câmara, input, NPCs, colisões
    world.ts               # terreno, mar, cidade, lotes, biomas, vegetação
    terrain.ts             # alturas, costa, areia, lagoa
    models.ts              # modelos procedurais (casas, palmeiras, acácias, cactos)
    actors.ts              # avatares 3D/2D, pets, NPCs e animações
    traffic.ts             # carros e comboio
    constants.ts           # geografia, catálogo, negócios, mercado paralelo
  services/
    gameState.ts           # estado, economia, casas, negócios, jornal, save
    sound.ts               # áudio sintetizado (Web Audio)
  components/              # HUD, modais (casa, mercado, jornal, negócios, ...)
```

---

## 4. Mundo e biomas

O mapa tem 1280 × 1280 m, mar em `Y = 0`, cidade em `Y ≈ 4` e uma malha de
terreno de 170 × 170 segmentos. A cor do terreno é calculada por vértice e
combinada em seis biomas:

| Bioma | Onde | Paleta / vegetação |
| --- | --- | --- |
| Praia / orla | faixa costeira (oeste e norte) | areia clara, palmeiras, rochas |
| Urbano | centro, praça, avenidas | verde urbano, casas e lotes |
| Fazenda | sudeste (`x > 245`, `z 335..540`) | terra lavrada, canteiros, celeiro |
| Floresta — *Mata da Lagoa* | sudoeste (`x -500..-170`, `z 330..600`) | verde escuro, árvores densas |
| Savana — *Savana do Sertão* | sudoeste, à volta da mata | dourado, acácias, capim seco |
| Árido — *Areal do Vento* | sul (`x > 150`, `z 190..340`) | terra vermelha, mandacarus, rochas |

Além disso há morros (terreno acima de `Y = 12` ganha tom de rocha) e a Lagoa
Municipal com margens de areia.

Vegetação procedural fundida numa única geometria por bioma (menos draw calls):
`buildPalm` (tronco curvo + folhas em lâminas pendentes + cocos), `buildAcacia`
(copa em chapéu-de-sol), `buildCactus`, `buildDryGrass`, `buildBush`.

Marcos com viagem de táxi: Praça do Caramelo, Prefeitura, Padaria Central,
Hospital, Estádio, Xique Park, Lagoa, Fazendas, Estação, Mercado da Orla,
Vila Nova, Condomínio Chique-Chique, Aeroporto, Mirante, **Mata da Lagoa**,
**Savana do Sertão** e **Areal do Vento**.

---

## 5. As quatro câmaras

Só existem quatro modos (tipo `CameraMode` em `GameEngine.ts`):

| Modo | Rótulo | Comportamento |
| --- | --- | --- |
| `third` | 3.ª pessoa | câmara atrás e acima, distância controlada pelo scroll/pinça |
| `shoulder` | 2.ª pessoa | ombro direito, 3,6 m, segue o olhar |
| `first` | 1.ª pessoa | nos olhos (1,66 m), esconde o modelo do jogador |
| `top` | Câmara de cima | vista alta (~52 m) quase vertical |

- Tecla **F** ou botão de câmara no HUD percorre as quatro por ordem.
- O HUD mostra sempre o rótulo do modo ativo.
- A câmara aproxima-se sozinha quando a posição ideal cair na água ou dentro do
  terreno, e a 1.ª pessoa reduz o `near plane` para 0,06 m.

---

## 6. Controlos

| Ação | Teclado / rato | Toque |
| --- | --- | --- |
| Mover | `WASD` / setas | joystick |
| Correr | `Shift` | joystick ao máximo |
| Interagir | `E` | botão de interação |
| Rodar câmara | arrastar / `Q` `E` | arrastar |
| Zoom | scroll / pinça | pinça |
| Trocar câmara | `F` | botão de câmara |
| Fechar painel | `Esc` | botão fechar |

---

## 7. Personagens e animações

- **84 opções** de personagem: 12 Kenney Mini, 18 Blocky, 24 pets 3D (Cube Pets)
  e 30 animais 2D do pacote de sprites.
- Pré-visualização 3D real no seletor de personagem (`CharacterSelect3D`).
- Companheiros: caramelo, gato, capivara, galinha, panda.
- Animação processual por tipo de rig:
  - **humanoide** — passada com amplitude por velocidade; a correr o tronco
    inclina, os braços dobram e o corpo salta mais; parado, olha em volta.
  - **quadrúpede** — galope com as patas cruzadas e balanceio do corpo.
  - **billboard 2D** — bob, inclinação e *squash & stretch* a correr.
- **Alinhamento ao solo**: todos os modelos são assentes para que o ponto mais
  baixo fique em `y = 0` (`groundModel`), e a altura usada pelos atores é a
  superfície real da malha (`getSurfaceHeight`), não a altura analítica. Isto
  resolveu os personagens e pets enterrados nas encostas.

---

## 8. Casas e decoração em tempo real

- Compra do lote → casa construída na hora, com fachada configurável
  (estilo, cor de parede e telhado) e controlo de acesso.
- **Editor de interiores** (grelha de 8 × 7 m, 1 célula = 1 m):
  - catálogo com preço, área e devolução de 50% ao remover;
  - **arrastar e largar** com pointer events: pega num móvel colocado e larga-o
    noutra célula (`moveFurniture`);
  - arrastar do catálogo para a planta também coloca o móvel;
  - fantasma verde/vermelho mostra se cabe; a soleira da porta fica sempre livre;
  - rotação em 90°, remoção e pré-visualização 3D lado a lado.
- Tudo em tempo real: o preview e o estado reagem ao movimento imediato.

---

## 9. Economia e empregos

- Carteira com livro-razão (ganhos/despesas) e estatísticas.
- Padaria: receitas, qualidade e fornada paga conforme o acerto.
- Fazenda: plantar, esperar e colher (cenoura, milho, cana, tomate).
- Pesca na Lagoa (gasta isca).
- Entregas de encomendas com prazo e gorjeta.
- Táxi municipal cobrado por distância.
- Leis da cidade (ex.: lei da horta) alteram preços e multas.
- Eleição municipal com candidatos, votos simulados e resultado.

---

## 10. Negócios (rendimento passivo)

Painel **Negócios** (ícone de pasta no HUD). Quatro negócios, cada um com três
níveis:

| Negócio | Abertura | Nível 1 |
| --- | --- | --- |
| Banca no Mercado da Orla | X$ 650 | X$ 3/min |
| Padaria Central | X$ 900 | X$ 5/min |
| Barraca de Praia | X$ 1.400 | X$ 8/min |
| Oficina do Jonas | X$ 2.200 | X$ 12/min |

- Cada nível soma +65% ao rendimento.
- O rendimento acumula até 12 horas e é recolhido manualmente.
- Melhorar custa uma fração do preço base por nível.
- Abrir um negócio grava um evento no registo da cidade.

---

## 11. Mercado paralelo

Mesma janela, secção vermelha. Mecânica de risco/recompensa:

| Carga | Retorno | Risco | Multa |
| --- | --- | --- | --- |
| Caixotes de cenoura sem selo | até X$ 240 | 22% | X$ 90+ |
| Peixe fora da lota | até X$ 360 | 34% | X$ 150+ |
| Garrafas de cachaça artesanal | até X$ 520 | 46% | X$ 240+ |

- Uma carga de cada vez, prazo de 4 minutos.
- Ao entregar há uma roleta: entrega limpa (lucro) ou fiscalização (multa,
  registo policial e estatística de multas).
- Abandonar a carga não dá nada, mas também não arrisca.
- **Tráfico de cenouras**: X$ 120 de compra, retorno X$ 260, 30% de risco de
  apreensão (multa de X$ 80). É o negócio de entrada para quem tem pouco saldo.

---

## 12. Jornal Chique-Chique e motor de registo

- **Motor de registo da cidade**: `gameState.recordCityEvent(kind, texto)`
  guarda até 80 eventos com dia, hora e categoria (`negocio`, `crime`, `obra`,
  `eleicao`, `emprego`, `registo`).
- Alimentado por: compra de lotes, abertura e melhoria de negócios, cargas
  entregues ou apreendidas, negócio de cenouras, edições do jornal.
- **Jornal Chique-Chique** (ícone de jornal no HUD):
  - primeira página em papel com manchete gerada a partir dos eventos;
  - resumo do dia, registos recentes e arquivo de edições anteriores;
  - botão “Imprimir nova edição” para gerar uma edição nova a qualquer momento.
- `cityDigest()` devolve contagens por categoria para o painel e para o telefone.

---

## 13. Telemóvel, formato de ecrã e definições

- `GameSettings`: som ambiente, etiquetas dos moradores, gráficos altos e
  **formato do ecrã**.
- Formato: `auto` (ecrã inteiro), `9:16` (vertical) ou `16:9` (horizontal).
  O palco do jogo é centrado e recebe barras negras nas margens quando o
  formato escolhido não coincide com a janela. Disponível no Menu de pausa e nas
  definições do telefone.
- Painel de administração: economia de teste, **cheat +X$ 10.000**, hora do dia,
  eleição, agricultura e teletransporte.

---

## 14. Persistência

- Save único em `localStorage` com `version: 3` e migração automática de saves
  antigos (v1/v2), incluindo lotes, interiores, eleição, definições e agora
  negócios, mercado paralelo, registo e edições do jornal.
- Gravação automática a cada 20 s, ao fechar/recarregar, e após cada ação.
- Exportar/importar save em JSON no painel de administração.

---

## 15. Otimizações aplicadas

- **Geometria fundida** por categoria (palmeiras, arbustos, rochas, acácias,
  cactos, capim, postes, bancos) → poucas draw calls.
- **InstancedMesh** para árvores, postes, bancos e janelas.
- Modelos de carros **normalizados** (alinhamento do eixo maior, escala por
  comprimento, rodas no chão) e velocidade em metros/segundo.
- Câmara com anti-clipping no terreno/água.
- Sombras PCF, `pixelRatio` limitado e opção de gráficos reduzidos.
- Terreno com cor por vértice em vez de texturas.

---

## 16. Verificação

```bash
npx tsc --noEmit              # 0 erros
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
```

Checklist manual:
1. Quatro câmaras com `F` (3.ª, 2.ª, 1.ª, cima) e rótulo no HUD.
2. Personagem e pet visíveis de dia e de noite, com os pés no chão.
3. Carros a circular nas duas faixas e comboio na linha.
4. Palmeiras da marginal com tronco curvo e folhas pendentes.
5. Biomas: mata, savana e areal com cores e vegetação próprias.
6. Casa: comprar lote, arrastar móveis na planta, remover e rodar.
7. Negócios: abrir, melhorar, recolher; contrabando e cenouras.
8. Jornal: gerar edição e confirmar os eventos no registo.
9. Telemóvel: alternar 9:16 / 16:9 e confirmar as barras negras.

---

## 17. Histórico de alterações

### Edição 1 — base jogável
- Mundo 3D com terreno, mar, 124 lotes, praça, avenidas e marcos.
- Avatar com seleção, save local, HUD e primeiro ciclo de economia.

### Edição 2 — cidade viva
- NPCs a passear, trânsito, comboio, iluminação dia/noite e som ambiente.
- Empregos (padaria, fazenda, pesca), entregas, táxi, eleição e leis.

### Edição 3 — identidade visual
- Remoção total de emojis → ícones SVG inline (`GameIcon`).
- 24 pets 3D e 30 animais 2D; pré-visualização WebGL no seletor de personagem.
- Luz noturna corrigida (piso de luz para a cidade continuar legível).

### Edição 4 — câmaras, trânsito e casas
- Quatro câmaras (3.ª, 2.ª, 1.ª pessoa e cima) com ciclo por `F`.
- Carros reconstruídos e a andar em m/s; palmeiras procedurais refeitas.
- Editor de interiores com arrastar e largar em tempo real.
- Animação de caminhada e corrida para humanoides, quadrúpedes e sprites.
- Formato de ecrã 9:16 / 16:9 / automático para telemóvel.
- Correção do alinhamento ao solo (personagens e pets já não ficam enterrados).

### Edição 5 — biomas e economia paralela
- Biomas de floresta, savana e árido com cores, vegetação e marcos próprios.
- Negócios com níveis e rendimento passivo.
- Mercado paralelo: contrabando com risco/multa e tráfico de cenouras.
- Motor de registo da cidade + Jornal Chique-Chique com edições geradas.
- Cheat de dinheiro no painel de administração.
- Esta documentação.

---

## 18. Limitações conhecidas

- O jogo é single-player local; o “MMO” é simulado no navegador.
- O save vive no navegador: limpar os dados do site apaga a cidade.
- A entrega das cargas do mercado paralelo é resolvida no painel, não por
  deslocação física até um ponto do mapa.
- Sem áudio gravado: todos os sons são sintetizados em tempo real.
