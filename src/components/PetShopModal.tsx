import { useEffect, useReducer, useState } from 'react';
import { gameState } from '../services/gameState';
import { liveStore, PETS, RARITY_STYLE, type Reward } from '../services/liveStore';
import { Button, Modal, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PetShopModal({ open, onClose }: Props) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [reward, setReward] = useState<Reward | null>(null);
  useEffect(() => liveStore.subscribe(rerender), []);
  if (!open) return null;
  const wallet = gameState.getState().wallet;
  const equipped = gameState.getState().avatar.companionId;
  const daily = liveStore.get().daily;

  const open_ = (tier: 'basica' | 'premium') => {
    const r = liveStore.buyBox(tier);
    if (!r) gameState.toast('Saldo insuficiente.', 'warning');
    else setReward(r);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        setReward(null);
        onClose();
      }}
      title="Pet Shop & Mystery Boxes"
      subtitle="Colecciona pets raros que te seguem pela cidade"
      icon={<GameIcon name="market" size={22} className="text-pink-300" />}
      width="max-w-4xl"
      footer={<p className="text-xs text-slate-400">Carteira <b className="text-amber-300">{money(wallet)}</b> · {liveStore.get().ownedPets.length}/{PETS.length} pets · {liveStore.get().boxesOpened} caixas abertas</p>}
    >
      {reward && (
        <div className="mb-4 rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-300/20 to-pink-400/10 p-4 text-center">
          {reward.kind === 'coins' ? (
            <p className="text-lg font-extrabold text-amber-200">+{money(reward.amount)}</p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: RARITY_STYLE[reward.pet.rarity].color }}>
                {RARITY_STYLE[reward.pet.rarity].label}
              </p>
              <p className="text-xl font-extrabold text-white">{reward.pet.name}</p>
              <p className="text-xs text-slate-300">{reward.duplicate ? `Repetido — recebes ${money(reward.refund)}` : 'Novo pet na tua colecção!'}</p>
              {!reward.duplicate && (
                <Button className="mt-2" onClick={() => liveStore.equipPet(reward.pet.id)}>
                  Equipar agora
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/5 p-3">
          <p className="font-bold text-white">Prémio diário</p>
          <p className="text-[11px] text-slate-400">Sequência: {daily.streak} dia(s). Quanto mais dias seguidos, mais moedas.</p>
          <Button
            className="mt-2 w-full"
            disabled={!liveStore.dailyAvailable()}
            onClick={() => {
              const r = liveStore.claimDaily();
              if (r) setReward({ kind: 'coins', amount: r.amount });
            }}
          >
            {liveStore.dailyAvailable() ? 'Receber prémio' : 'Volta amanhã'}
          </Button>
        </div>
        <div className="rounded-2xl border border-amber-300/30 bg-sky-300/5 p-3">
          <p className="font-bold text-white">Caixa Básica · X$ 100</p>
          <p className="text-[11px] text-slate-400">Moedas ou um pet (55%). Pode vir raro!</p>
          <Button className="mt-2 w-full" disabled={wallet < 100} onClick={() => open_('basica')}>Abrir</Button>
        </div>
        <div className="rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/5 p-3">
          <p className="font-bold text-white">Caixa Premium · X$ 450</p>
          <p className="text-[11px] text-slate-400">85% pet, muito mais hipótese de épico e lendário.</p>
          <Button className="mt-2 w-full" disabled={wallet < 450} onClick={() => open_('premium')}>Abrir</Button>
        </div>
      </div>

      <SectionTitle>Colecção e loja</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PETS.map((p) => {
          const owned = liveStore.ownsPet(p.id);
          const st = RARITY_STYLE[p.rarity];
          return (
            <div key={p.id} className="rounded-2xl border bg-[#10153a] p-3" style={{ borderColor: `${st.color}66` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: st.color }}>{st.label}</p>
              <p className="text-sm font-bold text-white">{p.name}</p>
              <div className="mt-2">
                {owned ? (
                  <Button variant="ghost" className="w-full px-3 py-1.5 text-xs" disabled={equipped === p.id} onClick={() => liveStore.equipPet(p.id)}>
                    {equipped === p.id ? 'Equipado' : 'Equipar'}
                  </Button>
                ) : p.price != null ? (
                  <Button className="w-full px-3 py-1.5 text-xs" disabled={wallet < p.price} onClick={() => liveStore.buyPet(p.id)}>
                    Comprar · {money(p.price)}
                  </Button>
                ) : (
                  <p className="rounded-lg bg-[#0b0f2c] px-2 py-1.5 text-center text-[11px] text-slate-400">Só em caixas misteriosas</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
