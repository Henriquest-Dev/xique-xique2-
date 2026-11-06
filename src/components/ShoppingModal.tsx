import { useEffect, useReducer } from 'react';
import { gameState } from '../services/gameState';
import { liveStore, SHOPS } from '../services/liveStore';
import { Button, Modal, Pill, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShoppingModal({ open, onClose }: Props) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => liveStore.subscribe(rerender), []);
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(rerender, 2000);
    return () => window.clearInterval(id);
  }, [open]);
  if (!open) return null;
  const wallet = gameState.getState().wallet;
  const mine = SHOPS.filter((s) => liveStore.shopOwned(s.id));
  const pending = mine.reduce((a, s) => a + liveStore.shopPending(s.id), 0);

  const card = (id: string) => {
    const s = SHOPS.find((x) => x.id === id)!;
    const own = liveStore.shopOwned(s.id);
    const pend = liveStore.shopPending(s.id);
    return (
      <div key={s.id} className={`rounded-2xl border p-3 ${own ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-2 border-[#3c4686]/70 bg-[#10153a]'}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-white">{s.name}</p>
            <p className="text-[11px] text-slate-400">
              Rende X$ {s.income}/min · {s.kind === 'aluguer' ? `caução ${money(s.cost)}` : `preço ${money(s.cost)}`}
            </p>
          </div>
          <Pill tone={own ? 'good' : s.kind === 'aluguer' ? 'info' : 'warn'}>{own ? 'Tua' : s.kind === 'aluguer' ? 'Por alugar' : 'À venda'}</Pill>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {!own && (
            <Button
              disabled={wallet < s.cost}
              onClick={() => {
                if (liveStore.startShop(s.id)) gameState.toast(`${s.name} é tua! Passa para recolher o rendimento.`, 'reward');
              }}
              className="px-3 py-1.5 text-xs"
            >
              {s.kind === 'aluguer' ? 'Alugar' : 'Comprar'} · {money(s.cost)}
            </Button>
          )}
          {own && (
            <>
              <Button
                disabled={pend <= 0}
                onClick={() => {
                  const got = liveStore.collectShop(s.id);
                  if (got) gameState.toast(`+${money(got)} da ${s.name}`, 'reward');
                }}
                className="px-3 py-1.5 text-xs"
              >
                Recolher {money(pend)}
              </Button>
              <Button variant="ghost" onClick={() => liveStore.leaveShop(s.id)} className="px-3 py-1.5 text-xs">
                {s.kind === 'aluguer' ? 'Devolver' : 'Vender (60%)'}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Shopping Chique Center"
      subtitle="As lojas rendem mesmo quando estás longe (até 2 h acumuladas)"
      icon={<GameIcon name="market" size={22} className="text-amber-400" />}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            Carteira <b className="text-amber-300">{money(wallet)}</b> · {mine.length} loja(s)
          </p>
          <Button
            disabled={pending <= 0}
            onClick={() => {
              let total = 0;
              mine.forEach((s) => (total += liveStore.collectShop(s.id)));
              if (total) gameState.toast(`Recolheste ${money(total)} de todas as lojas`, 'reward');
            }}
          >
            Recolher tudo · {money(pending)}
          </Button>
        </div>
      }
    >
      <SectionTitle>Lojas por alugar (ala norte)</SectionTitle>
      <div className="mb-4 grid gap-2 sm:grid-cols-2">{SHOPS.filter((s) => s.kind === 'aluguer').map((s) => card(s.id))}</div>
      <SectionTitle>Lojas à venda (ala sul)</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2">{SHOPS.filter((s) => s.kind === 'compra').map((s) => card(s.id))}</div>
    </Modal>
  );
}
