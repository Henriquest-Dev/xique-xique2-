// Regras económicas centralizadas: de onde vem e para onde vai cada tipo de dinheiro.
// No servidor estas mesmas regras correm dentro da função post_transfer.
import type { TxCategory } from './types';

/** Deduz a categoria a partir da descrição das chamadas antigas (compatibilidade). */
export function categorize(description: string, kind: 'gain' | 'expense'): TxCategory {
  const d = description.toLowerCase();
  if (/multa/.test(d)) return 'fine';
  if (/aluguer/.test(d)) return 'rent';
  if (/publicidade|an[uú]ncio|candidatura/.test(d)) return 'tax';
  if (/voo|comboio|metro|barco|passagem|viagem/.test(d)) return 'fare';
  if (/licen/.test(d)) return 'license';
  if (/resid[eê]ncia/.test(d)) return 'residency';
  if (/m[oó]vel|decora/.test(d)) return kind === 'gain' ? 'refund' : 'furniture';
  if (/lote|loja|neg[oó]cio|melhoramento/.test(d)) return kind === 'gain' ? 'sale' : 'property';
  if (/miss[aã]o|entrega|fornada|colheita|peixe|brincar|emprego|trabalh/.test(d)) return kind === 'gain' ? 'job' : 'purchase';
  if (/rendimento|renda|juros/.test(d)) return 'interest';
  if (/venda|vendido/.test(d)) return 'sale';
  return kind === 'gain' ? 'other' : 'purchase';
}

/** Cidade/ilha onde o jogador está (define qual cofre recebe taxas e tarifas). */
let ledgerCity = 'cidade';
export const setLedgerCity = (id: string) => { ledgerCity = id; };
export const getLedgerCity = () => ledgerCity;
export const cityAccountId = (city: string) => (city === 'cidade' ? 'city:treasury' : `city:${city}`);

/** Conta que recebe o dinheiro gasto. */
export function sinkFor(category: TxCategory): string {
  switch (category) {
    case 'residency': return 'city:veneza';
    case 'fare': case 'tax': case 'license': case 'fine': return cityAccountId(ledgerCity);
    case 'furniture': return 'merchant:mobilia';
    case 'property': return 'merchant:imobiliaria';
    case 'purchase': return 'merchant:mercado';
    default: return 'world:sink';
  }
}

/** Conta de onde sai o dinheiro ganho. */
export function sourceFor(category: TxCategory): string {
  switch (category) {
    case 'refund': return 'merchant:mobilia';
    default: return 'world:mint';
  }
}
