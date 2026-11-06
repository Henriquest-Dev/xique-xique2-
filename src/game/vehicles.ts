// Catálogo de veículos conduzíveis (alugados por tempo limitado).
export interface VehicleDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  minutes: number;
  speed: number;
  run: number;
  /** só anda bem na água (jet ski) */
  water?: boolean;
  /** modelo Kenney; se ausente é procedural */
  model?: string;
  height?: number;
  icon: string;
}

export const VEHICLES: VehicleDef[] = [
  { id: 'quad', name: 'Moto 4', desc: 'Ágil em terra e na areia.', price: 40, minutes: 5, speed: 11, run: 15, icon: 'rocket' },
  { id: 'sedan', name: 'Sedan', desc: 'Carro familiar confortável.', price: 60, minutes: 6, speed: 16, run: 24, model: 'car/sedan', height: 1.5, icon: 'car' },
  { id: 'taxi', name: 'Táxi', desc: 'Amarelo e bem visível.', price: 60, minutes: 6, speed: 16, run: 24, model: 'car/taxi', height: 1.5, icon: 'car' },
  { id: 'suv', name: 'SUV de luxo', desc: 'Para quem tem estilo.', price: 110, minutes: 6, speed: 19, run: 27, model: 'car/suv-luxury', height: 1.8, icon: 'car' },
  { id: 'sports', name: 'Desportivo', desc: 'O mais rápido da cidade.', price: 160, minutes: 5, speed: 23, run: 34, model: 'car/sedan-sports', height: 1.35, icon: 'car' },
  { id: 'truck', name: 'Camião', desc: 'Pesado e robusto.', price: 90, minutes: 6, speed: 13, run: 19, model: 'car/truck', height: 2.6, icon: 'car' },
  { id: 'jetski', name: 'Jet Ski', desc: 'Voa sobre a água. Só no mar.', price: 70, minutes: 6, speed: 14, run: 22, water: true, icon: 'boat' },
  { id: 'campaign', name: 'Carro de campanha', desc: 'Com faixa da tua campanha. Atrai seguidores.', price: 120, minutes: 10, speed: 14, run: 20, model: 'car/van', height: 1.9, icon: 'flag' },
];

export const vehicleById = (id: string) => VEHICLES.find((v) => v.id === id) ?? null;
