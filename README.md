# Xique-Xique 2 — Cérebro do Projeto

> Arquivo mestre. Quando for editar qualquer coisa, basear-se aqui.
> Última atualização: 2026-11-05

## Estado atual
- **Jogável:** sim (localhost:3000)
- **Stack:** React 19 + Vite 8 + Three.js 0.187 + TypeScript 7 + Tailwind 4
- **Save:** `localStorage` `xiquexique2_save_v3`
- **Sem emojis na UI** | Ícones SVG inline via `GameIcon`

## Feito (concluído)
### Mundo & Câmeras
- [x] 4 câmeras: 3ª pessoa, 2ª pessoa (ombro), 1ª pessoa, cima (tecla F / HUD)
- [x] Terreno 1280x1280, mar, praia, morros, lagoa
- [x] Biomas: Praia/Orla, Urbano, Fazenda, **Floresta (Mata da Lagoa)**, **Savana (Savana do Sertão)**, **Árido (Areal do Vento)**
- [x] Palmeiras, acácias, cactos, capim seco procedurais
- [x] Trânsito (carros) e comboio
- [x] Marcos com táxi

### Personagens, Animação & Pets
- [x] Seleção de personagem (Mini, Blocky, Pets 3D, Sprites 2D) com preview 3D
- [x] Animações walk/run distintas (humanoide, quadrúpede, billboard 2D)
- [x] Pets/companheiros
- [x] **Alinhamento ao solo** via `groundModel()` + `getSurfaceHeight()` (personagens não enterrados)
- [x] Correção de queda/enterro para personagens pequenos

### Casas, Decoração & UI
- [x] Compra de lote, construção de casa
- [x] **Editor de interiores com drag & drop** (móveis, rotação, remoção, fantasma válido/inválido)
- [x] HUD, telefone, definições
- [x] Formato de ecrã **9:16 / 16:9 / auto** (letterbox)
- [x] Sem emojis

### Economia, Empregos & Cidade
- [x] Carteira, padaria, fazenda, pesca, entregas, táxi
- [x] Leis, eleição municipal
- [x] **Negócios** (rendimento passivo, níveis, recolha)
- [x] **Mercado paralelo / contrabando** (risco, multa, apreensão)
- [x] **Tráfico de cenouras** (compra/venda)
- [x] **Cheat de dinheiro** (AdminModal)
- [x] **Motor de registo da cidade** (`recordCityEvent`, `cityDigest`)
- [x] **Jornal Chique-Chique** (edições, manchetes, arquivo)

### Técnico
- [x] Save v3 com migração
- [x] Otimizações (geometria fundida, instancing)
- [x] `tsc --noEmit` sem erros
- [x] Debug hooks removidos

## Por fazer / Ideias
### Crítico (funcionamento)
- [ ] **Prevenir queda do personagem** - reforçar ancora ao solo em todos os rigs (testar spawn/teleporte/câmeras)
- [ ] **Colisões mais rígidas** - evitar atravessar muros/objetos
- [ ] **Interações entre usuários** - já programadas? Verificar estado real e polir UI/feedback

### Jogabilidade
- [ ] Mais animações (idle variado, emote, sentar, conversar)
- [ ] Sistema de interação NPC (diálogos ramificados)
- [ ] Missões dinâmicas baseadas no registo da cidade
- [ ] Mais negócios e rotas de contrabando

### Conta, Social & Mídia
- [ ] **Sistema de conta** vinculado ao **Instagram** (login/perfil)
- [ ] **Captura/Gravação de tela** para criar **animação cinematográfica** (câmera livre/orbit, transições)
- [ ] Exportar vídeo/clipe para postar no **Rhythm**
- [ ] Perfis públicos, galeria de clipes
- [ ] Sistema de amizade/interações entre contas

### Polimento
- [ ] Som ambiente por bioma
- [ ] Mais decoração por bioma
- [ ] Otimização mobile
- [ ] Tutorial

## Arquivos-chave
- `src/game/GameEngine.ts` - loop, câmeras, física/solo, input
- `src/game/actors.ts` - rigs, animações, `groundModel()`
- `src/game/terrain.ts` - alturas, `getSurfaceHeight()`
- `src/game/world.ts` - biomas, vegetação
- `src/services/gameState.ts` - estado, economia, negócios, jornal, registo
- `src/types/game.ts` - contratos
- `src/App.tsx` - UI
- `DOCUMENTACAO.md` - documentação completa

## Comandos
```bash
npm run dev    # localhost:3000
npm run build
npx tsc --noEmit
```

## Notas
- "Cérebro" = referência rápida. Detalhes completos em `DOCUMENTACAO.md`.
- Qualquer nova feature deve ser registrada aqui (Feito ou Por fazer).
- Focar em estabilidade (solo/animação/colisões) antes de features sociais.
