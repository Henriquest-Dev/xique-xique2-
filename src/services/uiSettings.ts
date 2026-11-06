// Settings disponíveis pela UI (SettingsModal / AdminModal) e persistidos em
// st.settings. Um ficheiro apenas: evita espalhar estas chaves por gameState,
// engine, HUD e componentes e garante que qualquer nova definição é usada em
// todo o lado (loop, câmera, UI, admin).

import type { GameSettings } from '../types/game';

export const UI_SETTINGS_KEYS = {
  // Persistem em st.settings e são lidas pelo engine
  aspect: 'settings.aspect',
  ambient: 'settings.ambient',
  showTags: 'settings.showTags',
  highQuality: 'settings.highQuality',

  // Novos — ciclo dia/noite
  daySpeed: 'settings.daySpeed',

  // Novos — mecânica de pet
  companionFollow: 'settings.companionFollow',
} as const;

// Chaves que o GameEngine conhece e aplica durante o loop.
export const ENGINE_SETTINGS_KEYS = [
  'ambient',
  'showTags',
  'highQuality',
  'daySpeed',
  'companionFollow',
] as const;

export type GameSettingsUiKey = keyof typeof UI_SETTINGS_KEYS;

export function isGameSettingsUiKey(key: string): key is GameSettingsUiKey {
  return key in UI_SETTINGS_KEYS;
}

export function gameSettingsUiLabel(key: GameSettingsUiKey): string {
  return {
    aspect: 'Formato do ecrã',
    ambient: 'Ambiente sonoro',
    showTags: 'Etiquetas dos moradores',
    highQuality: 'Sombra e detalhe alta qualidade',
    daySpeed: 'Velocidade do dia e da noite',
    companionFollow: 'Animal de estimação a acompanhar',
  }[key];
}

export function gameSettingsUiHint(key: GameSettingsUiKey): string {
  return {
    aspect: 'Portrait 9:16, landscape 16:9 ou ecrã cheio.',
    ambient: 'Reproduz ambiente do jogo enquanto estás em cena.',
    showTags: 'Mostra o nome e profissão sobre cada morador.',
    highQuality: 'Ativa sombras e aumento de pixel ratio. More lento em máquinas fracas.',
    daySpeed: 'Dia e noite de 20 minutos cada, intercalados. Podes acelerar o tempo.',
    companionFollow: 'Quando ativado, o teu animal de estimação acompanha-te. Se desativares, fica em casa.',
  }[key];
}

export function gameSettingsDefaultValue(key: GameSettingsUiKey): GameSettings[GameSettingsUiKey] {
  const defaults: Record<GameSettingsUiKey, GameSettings[GameSettingsUiKey]> = {
    aspect: 'auto',
    ambient: true,
    showTags: true,
    highQuality: true,
    daySpeed: 'normal',
    companionFollow: true,
  };
  return defaults[key];
}

export function gameSettingsOptions(key: GameSettingsUiKey): Array<{ value: GameSettings[GameSettingsUiKey]; label: string }> {
  return {
    aspect: [
      { value: 'auto' as const, label: 'Automático (mobile → portrait, ecrã → cheio)' },
      { value: 'portrait' as const, label: 'Portrait 9:16' },
      { value: 'landscape' as const, label: 'Landscape 16:9' },
    ],
    ambient: [
      { value: true as const, label: 'Ligado' },
      { value: false as const, label: 'Desligado' },
    ],
    showTags: [
      { value: true as const, label: 'Mostrar' },
      { value: false as const, label: 'Esconder' },
    ],
    highQuality: [
      { value: true as const, label: 'Alta qualidade (sombra + detalhe)' },
      { value: false as const, label: 'Qualidade reduzida' },
    ],
    daySpeed: [
      { value: 'normal' as const, label: 'Dia e noite de 20 min (tempo real)' },
      { value: 'fast' as const, label: 'Dia e noite de ~40 s (acelerado)' },
    ],
    companionFollow: [
      { value: true as const, label: 'Acompanha o jogador' },
      { value: false as const, label: 'Fica em casa quando saio' },
    ],
  }[key];
}
