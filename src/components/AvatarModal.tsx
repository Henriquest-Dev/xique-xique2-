import { useState } from 'react';
import { AvatarConfig } from '../types/game';
import { gameState } from '../services/gameState';
import { Button, Modal } from './ui';
import { CharacterSelect } from './CharacterSelect3D';
import { IconUser } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AvatarModal({ open, onClose }: Props) {
  const state = gameState.getState();
  const [config, setConfig] = useState<AvatarConfig>(state.avatar);
  const [name, setName] = useState(state.playerName);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Perfil do cidadão"
      subtitle="Escolhe o teu corpo Kenney e confirma o nome"
      icon={<IconUser size={20} className="text-amber-400" />}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">As alterações aparecem no mundo imediatamente.</p>
          <Button
            onClick={() => {
              gameState.setPlayerName(name);
              gameState.setAvatar({ ...config, name });
              onClose();
            }}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Nome</label>
      <input
        value={name}
        onChange={(event) => setName(event.target.value.slice(0, 28))}
        className="mb-4 w-full rounded-xl border border-2 border-[#3c4686] bg-[#0b0f2c] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/60"
        maxLength={28}
      />
      <CharacterSelect
        config={config}
        onChange={(next) => setConfig({ ...next, name })}
        onConfirm={() => {}}
        onCancel={onClose}
        showActions={false}
      />
    </Modal>
  );
}
