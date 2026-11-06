import { ShoppingBasket, Store, Tag } from 'lucide-react';
import { gameState } from '../services/gameState';
import { MARKET_ITEMS } from '../game/constants';
import { Button, Modal, Pill, SectionTitle, money } from './ui';
import { GameIcon } from './GameIcon';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MarketModal({ open, onClose }: Props) {
  const state = gameState.getState();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mercado da Orla"
      subtitle="Peixe fresco, sementes e mercearia · Bairro da Marginal"
      icon={<GameIcon name="cart" size={22} className="text-amber-400" />}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Carteira: <strong className="text-amber-300">{money(state.wallet)}</strong>
          </span>
          <span>{state.inventory.reduce((total, item) => total + item.count, 0)} itens no bornal</span>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionTitle right={<Store size={15} className="text-slate-400" />}>À venda</SectionTitle>
          <div className="space-y-2">
            {MARKET_ITEMS.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2.5">
                <GameIcon name={item.icon} size={20} className="shrink-0 text-amber-300" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-100">{item.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{item.description}</p>
                </div>
                <span className="text-xs font-bold text-amber-300">{money(item.price)}</span>
                <Button
                  className="px-3 py-1.5 text-xs"
                  disabled={state.wallet < item.price}
                  onClick={() => gameState.buyMarketItem(item.id)}
                >
                  Comprar
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle right={<ShoppingBasket size={15} className="text-slate-400" />}>O teu bornal</SectionTitle>
          {state.inventory.length === 0 ? (
            <p className="rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3 text-xs text-slate-400">
              O bornal está vazio.
            </p>
          ) : (
            <div className="space-y-2">
              {state.inventory.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 rounded-xl border border-2 border-[#3c4686]/70 bg-[#10153a] px-3 py-2">
                  <GameIcon name={item.icon} size={18} className="shrink-0 text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-100">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.count}× · {item.category === 'seed' ? 'semente' : item.category === 'food' ? 'comida' : item.category === 'crop' ? 'colheita' : 'ferramenta'}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{money(item.price)}</span>
                  <Button variant="ghost" className="px-2.5 py-1 text-[11px]" onClick={() => gameState.sellItem(item.id)}>
                    <Tag size={12} /> Vender
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-2 border-[#3c4686]/70 bg-[#10153a] p-3">
            <SectionTitle>Como abastecer</SectionTitle>
            <ul className="space-y-1 text-[11px] text-slate-400">
              <li className="flex items-start gap-1.5"><GameIcon name="carrot" size={12} className="mt-0.5 shrink-0 text-slate-400" />Sementes: planta na Fazenda do Sul.</li>
              <li className="flex items-start gap-1.5"><GameIcon name="worm" size={12} className="mt-0.5 shrink-0 text-slate-400" />Isca: pesca na Lagoa Municipal.</li>
              <li className="flex items-start gap-1.5"><GameIcon name="bread" size={12} className="mt-0.5 shrink-0 text-slate-400" />Pão: podes também assar na Padaria Central.</li>
            </ul>
            <div className="mt-2">
              <Pill tone="info">Lei 104 ativa: colheitas +20%</Pill>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
