// =============================================================================
// Modelos procedurais low-poly (casas, edifícios cívicos, mobiliário urbano)
// Todas as peças são fundidas numa única geometria com cor por vértice,
// o que mantém o número de draw calls baixo mesmo com 124 lotes.
// =============================================================================

import * as THREE from 'three';
import { HouseStyle } from '../types/game';

const C = {
  foundation: '#94a3b8',
  concrete: '#cbd5e1',
  pavement: '#e2e8f0',
  asphalt: '#334155',
  white: '#f8fafc',
  cream: '#fef3c7',
  wood: '#8b5a2b',
  darkWood: '#5b3a1a',
  glass: '#bfdbfe',
  gold: '#f5b52e',
  iron: '#334155',
  red: '#b91c1c',
  terracotta: '#c2410c',
  green: '#2f855a',
  darkGreen: '#1f6f4a',
  blue: '#1d4ed8',
  sky: '#38bdf8',
  sand: '#f2d7a0',
  stone: '#a8a29e',
  pink: '#f9a8d4',
  orange: '#f97316',
  black: '#0f172a',
  cactus: '#4c7a4f',
  dryGrass: '#c2a55c',
  straw: '#d9c184',
};

export interface HouseBuild {
  geometry: THREE.BufferGeometry;
  windows: { x: number; y: number; z: number; rotY: number }[];
  height: number;
}

class Builder {
  private parts: THREE.BufferGeometry[] = [];

  public mesh(geometry: THREE.BufferGeometry, color: string, transform?: (g: THREE.BufferGeometry) => void): this {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (transform) transform(g);
    g.deleteAttribute('uv');
    g.deleteAttribute('tangent');
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  public box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, rotY = 0): this {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, (g) => {
      if (rotY) g.rotateY(rotY);
      g.translate(x, y, z);
    });
  }

  public cyl(rTop: number, rBottom: number, h: number, seg: number, x: number, y: number, z: number, color: string): this {
    return this.mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), color, (g) => g.translate(x, y, z));
  }

  public cone(r: number, h: number, seg: number, x: number, y: number, z: number, color: string, rotY = 0): this {
    return this.mesh(new THREE.ConeGeometry(r, h, seg), color, (g) => {
      if (rotY) g.rotateY(rotY);
      g.translate(x, y, z);
    });
  }

  public sphere(r: number, x: number, y: number, z: number, color: string, detail = 1): this {
    return this.mesh(new THREE.IcosahedronGeometry(r, detail), color, (g) => g.translate(x, y, z));
  }

  /** Telhado de duas águas; cumeeira no eixo X, beirais em ±Z. */
  public gable(w: number, d: number, h: number, x: number, y: number, z: number, color: string): this {
    const hw = w / 2;
    const hd = d / 2;
    const positions = [
      // inclinação +Z
      -hw, 0, hd, hw, 0, hd, hw, h, 0,
      -hw, 0, hd, hw, h, 0, -hw, h, 0,
      // inclinação -Z
      hw, 0, -hd, -hw, 0, -hd, -hw, h, 0,
      hw, 0, -hd, -hw, h, 0, hw, h, 0,
      // empena -X
      -hw, 0, -hd, -hw, 0, hd, -hw, h, 0,
      // empena +X
      hw, 0, hd, hw, 0, -hd, hw, h, 0,
    ];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return this.mesh(geo, color, (g) => g.translate(x, y, z));
  }

  public build(): THREE.BufferGeometry {
    const merged = mergeParts(this.parts);
    this.parts = [];
    return merged;
  }
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 1) {
    parts[0].computeBoundingSphere();
    return parts[0];
  }
  // Fusão manual (evita dependência extra e funciona com position/normal/color).
  let vertexCount = 0;
  let indexCount = 0;
  parts.forEach((part) => {
    vertexCount += part.attributes.position.count;
    indexCount += part.index ? part.index.count : part.attributes.position.count;
  });

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);

  let vOffset = 0;
  let iOffset = 0;
  parts.forEach((part) => {
    const p = part.attributes.position;
    const n = part.attributes.normal;
    const c = part.attributes.color;
    for (let i = 0; i < p.count; i++) {
      positions[(vOffset + i) * 3] = p.getX(i);
      positions[(vOffset + i) * 3 + 1] = p.getY(i);
      positions[(vOffset + i) * 3 + 2] = p.getZ(i);
      normals[(vOffset + i) * 3] = n ? n.getX(i) : 0;
      normals[(vOffset + i) * 3 + 1] = n ? n.getY(i) : 1;
      normals[(vOffset + i) * 3 + 2] = n ? n.getZ(i) : 0;
      colors[(vOffset + i) * 3] = c.getX(i);
      colors[(vOffset + i) * 3 + 1] = c.getY(i);
      colors[(vOffset + i) * 3 + 2] = c.getZ(i);
    }
    if (part.index) {
      for (let i = 0; i < part.index.count; i++) indices[iOffset + i] = part.index.getX(i) + vOffset;
      iOffset += part.index.count;
    } else {
      for (let i = 0; i < p.count; i++) indices[iOffset + i] = vOffset + i;
      iOffset += p.count;
    }
    vOffset += p.count;
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

// -----------------------------------------------------------------------------
// Casas — 8 x 7 m, paredes 3 m, telhado até 5 m. Porta em +X.
// Interior: quarto, sala, cozinha, varanda
// -----------------------------------------------------------------------------
export function buildHouse(style: HouseStyle, wallColor: string, roofColor: string): HouseBuild {
  const b = new Builder();
  const windows: HouseBuild['windows'] = [];
  const W = 8;
  const D = 7;
  const wallH = 3;
  const baseY = 4.0;

  // Fundação e soleira
  b.box(W + 0.5, 0.35, D + 0.5, 0, 0.17, 0, C.foundation);
  b.box(1.6, 0.12, 1.8, W / 2 + 0.8, 0.06, 0, C.pavement);

  const twoFloors = style === 'sobrado';
  const wallHeight = twoFloors ? 5.4 : wallH;

  // Corpo
  b.box(W, wallHeight, D, 0, 0.35 + wallHeight / 2, 0, wallColor);
  // Rodapé
  b.box(W + 0.08, 0.45, D + 0.08, 0, 0.6, 0, shade(wallColor, -0.18));

  // Porta e moldura
  b.box(0.16, 2.15, 1.15, W / 2 + 0.02, 1.43, 0, C.darkWood);
  b.box(0.2, 0.14, 1.35, W / 2 + 0.02, 2.55, 0, C.wood);
  b.mesh(new THREE.SphereGeometry(0.06, 8, 8), C.gold, (g) => g.translate(W / 2 + 0.14, 1.4, 0.38));
  // Degraus
  b.box(1.4, 0.16, 1.6, W / 2 + 0.6, 0.08, 0, C.concrete);
  b.box(1.1, 0.16, 1.3, W / 2 + 0.85, 0.24, 0, C.concrete);

  // Placa do número
  b.box(0.08, 0.36, 0.6, W / 2 + 0.03, 2.72, -1.2, C.black);
  b.box(0.06, 0.26, 0.48, W / 2 + 0.07, 2.72, -1.2, C.gold);

  // Janelas frontais (duas)
  const windowYs = twoFloors ? [1.55, 4.2] : [1.7];
  windowYs.forEach((y) => {
    [-1.95, 1.95].forEach((z) => {
      b.box(0.16, 0.12, 1.1, W / 2 + 0.03, y - 0.52, z, C.white);
      windows.push({ x: W / 2 + 0.09, y: y - 0.5, z: z - 0.5, rotY: Math.PI / 2 });
    });
  });

  // Janelas laterais
  [-1.8, 1.8].forEach((x) => {
    b.box(1.0, 0.95, 0.1, x, 1.75, -D / 2 - 0.02, C.glass);
    windows.push({ x: x - 0.5, y: 1.27, z: -D / 2 - 0.06, rotY: Math.PI });
    b.box(1.0, 0.95, 0.1, x, 1.75, D / 2 + 0.02, C.glass);
    windows.push({ x: x - 0.5, y: 1.27, z: D / 2 + 0.06, rotY: 0 });
  });

  // Telhado
  if (style === 'moderna') {
    b.box(W + 0.6, 0.35, D + 0.6, 0, 0.35 + wallHeight + 0.18, 0, roofColor);
    b.box(1.6, 0.07, 1.6, -1.8, 0.35 + wallHeight + 0.4, 0.8, C.sky);
    // Caixa de água
    b.cyl(0.55, 0.55, 0.9, 10, 2.2, 0.35 + wallHeight + 0.85, -1.6, C.white);
  } else if (style === 'sobrado') {
    b.gable(W + 0.8, D + 0.8, 1.5, 0, 0.35 + wallHeight, 0, roofColor);
    // Varanda
    b.box(2.2, 0.18, 2.6, W / 2 + 0.4, 3.35, 1.7, C.wood);
    b.box(0.08, 0.9, 2.6, W / 2 + 1.45, 3.85, 1.7, C.white);
    for (let z = 0.55; z <= 2.9; z += 0.45) {
      b.box(0.06, 0.9, 0.06, W / 2 + 1.45, 3.85, z, C.white);
    }
  } else if (style === 'terrea') {
    b.gable(W + 1.0, D + 1.0, 1.35, 0, 0.35 + wallHeight, 0, roofColor);
    b.box(W + 1.0, 0.12, D + 1.0, 0, 0.35 + wallHeight - 0.02, 0, shade(roofColor, -0.12));
    // Alpendre
    b.box(2.4, 0.12, 3.0, W / 2 + 0.2, 2.95, 0, shade(roofColor, -0.1));
    [1.2, 2.8].forEach((z) => b.cyl(0.07, 0.07, 2.5, 6, W / 2 + 1.2, 1.55, z, C.white));
  } else {
    // Colonial: telhado cerâmico + chaminé + sótão
    b.gable(W + 0.9, D + 0.9, 1.8, 0, 0.35 + wallHeight, 0, roofColor);
    b.box(0.75, 1.5, 0.75, -2.0, 0.35 + wallHeight + 0.9, 1.4, shade(roofColor, -0.2));
    b.box(0.95, 0.18, 0.95, -2.0, 0.35 + wallHeight + 1.7, 1.4, C.stone);
    b.box(1.9, 0.1, 2.8, W / 2 + 0.1, 3.05, 0, shade(roofColor, -0.05));
    [-1.1, 1.1].forEach((z) => b.cyl(0.06, 0.06, 2.4, 6, W / 2 + 1.0, 1.95, z, C.white));
  }

  // Caixa de correio, arbusto e muro baixo
  b.box(0.3, 0.75, 0.3, W / 2 + 1.9, 0.68, -1.7, C.darkWood);
  b.box(0.42, 0.32, 0.5, W / 2 + 1.9, 1.18, -1.7, C.red);
  b.sphere(0.35, W / 2 + 2.4, 0.6, 1.9, C.green, 0);
  b.box(3.6, 0.5, 0.12, W / 2 + 2.2, 0.6, 2.9, shade(wallColor, -0.25));

  // Caminho até ao passeio
  for (let i = 0; i < 4; i++) {
    b.box(0.9, 0.05, 0.9, W / 2 + 2.1 + i * 0.95, 0.04, 0, C.pavement);
  }

  // Interior da casa: quarto, sala, cozinha, varanda
  const interiorY = baseY + 0.5;
  // Quarto (cama e roupeiro) - esquerda traseira
  b.box(2.5, 2.5, 2.0, -1.5, interiorY, -1.5, '#ffe8e1'); // parede rosa claro
  b.box(2.7, 0.9, 1.8, -1.0, interiorY + 1.2, -1.2, '#e91e63'); // cama
  b.box(3.5, 1.8, 0.5, -0.8, interiorY + 2.0, -0.5, '#80cbc4'); // roupeiro
  // Sala de estar - centro
  b.box(3.0, 2.5, 2.0, -0.5, interiorY, -0.5, '#fff5e1'); // parede clara
  b.box(1.5, 1.2, 1.2, 0.5, interiorY + 1.0, 0.5, '#ffb347'); // sofá
  b.box(2.5, 1.0, 0.3, 0.0, interiorY + 0.5, 0.2, '#55392b'); // tapete
  // Cozinha - direita
  b.box(2.5, 2.5, 2.0, 1.5, interiorY, 2.0, '#ffe4b5'); // parede amarela clara
  b.box(2.0, 1.2, 1.5, 1.5, interiorY + 1.0, 2.3, '#b71c1c'); // fogão
  b.box(2.5, 1.0, 1.0, 1.5, interiorY + 0.5, 1.5, '#7b1e1e'); // geladeira
  // Varanda - frente
  b.box(4.0, 1.0, 2.0, W / 2 - 0.5, interiorY + 0.5, D + 0.5, '#c8e6c9'); // piso da varanda
  b.box(3.5, 2.0, 1.5, W / 2 - 1.0, interiorY + 2.0, 1.0, '#689f38'); // planta varanda

  const geometry = b.build();
  geometry.translate(0, baseY, 0);
  return { geometry, windows, height: 0.35 + wallHeight + 1.8 };
}

function shade(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  if (amount >= 0) c.lerp(new THREE.Color('#ffffff'), amount);
  else c.lerp(new THREE.Color('#000000'), -amount);
  return `#${c.getHexString()}`;
}

// -----------------------------------------------------------------------------
// Edifícios cívicos
// -----------------------------------------------------------------------------
export type CivicKind = 'prefeitura' | 'padaria' | 'hospital' | 'estadio' | 'mercado' | 'praca' | 'piscina' | 'estacao';

export function buildCivic(kind: CivicKind): THREE.BufferGeometry {
  const b = new Builder();
  if (kind === 'prefeitura') {
    b.box(46, 1.0, 30, 0, 0.5, 0, C.foundation);
    b.box(44, 9, 28, 0, 5.5, 0, C.white);
    b.box(44.4, 0.5, 28.4, 0, 9.9, 0, C.concrete);
    for (let z = -10; z <= 10; z += 4) b.cyl(0.7, 0.8, 8.6, 10, 23.4, 5.3, z, C.cream);
    b.box(3, 8.4, 24, 23.4, 5.3, 0, shade(C.cream, 0.05));
    b.box(8, 3.2, 8, 23.4, 10.6, 0, C.cream);
    b.cone(6.4, 2.6, 4, 23.4, 13.2, 0, C.white, Math.PI / 4);
    b.box(6, 5.4, 6, 0, 12.8, 0, C.white);
    b.sphere(3.1, 0, 16.4, 0, C.gold, 1);
    b.cyl(0.07, 0.07, 5.2, 6, 0, 20.8, 0, C.iron);
    b.box(0.06, 1.3, 2.1, 0, 22.4, 1.2, C.green);
    b.box(0.08, 1.0, 0.5, 0, 22.4, 0.4, C.gold);
    // Escadaria e entrada leste
    for (let i = 0; i < 3; i++) b.box(2.2, 0.25, 14 - i * 1.4, 24.8 + i * 0.6, 0.3 + i * 0.25, 0, C.concrete);
    b.box(1.2, 2.8, 4.2, 22.1, 2.1, 0, C.darkWood);
    // Janelas
    for (let z = -12; z <= 12; z += 4) {
      if (Math.abs(z) < 2) continue;
      b.box(0.1, 2.0, 1.5, 22.05, 3.2, z, C.glass);
      b.box(0.1, 2.0, 1.5, 22.05, 7.2, z, C.glass);
    }
    b.box(36, 0.06, 4, 0, 4.05, 0, C.pavement);
  } else if (kind === 'padaria') {
    b.box(29, 0.5, 23, 0, 0.25, 0, C.foundation);
    b.box(28, 6.5, 22, 0, 3.5, 0, C.cream);
    b.cone(17.5, 3.2, 4, 0, 8.2, 0, C.terracotta, Math.PI / 4);
    b.box(29.5, 0.25, 23.5, 0, 6.85, 0, shade(C.terracotta, -0.15));
    // Toldo listado
    for (let i = 0; i < 6; i++) {
      b.box(3.4, 0.16, 2.2, -14.6, 4.0, -8 + i * 3.2, i % 2 === 0 ? C.red : C.white);
    }
    b.box(0.2, 2.6, 13, -14.1, 2.5, 0, C.glass);
    b.box(1.0, 3.0, 5.4, -14.4, 2.1, 0, C.darkWood);
    b.cyl(0.9, 1.1, 5.0, 8, 8.5, 8.6, 6.5, C.stone);
    b.sphere(0.55, -9, 7.4, 0, C.gold, 0);
    b.box(7.5, 0.8, 0.25, -9, 7.4, 0, C.darkWood);
    b.box(6.8, 0.55, 0.12, -9, 7.4, 0.16, C.gold);
    // Mesas exteriores
    [-6, 6].forEach((z) => {
      b.cyl(0.8, 0.8, 0.1, 10, -17, 0.85, z, C.white);
      b.cyl(0.07, 0.07, 0.85, 6, -17, 0.4, z, C.iron);
      b.cyl(0.7, 0.7, 0.08, 8, -17, 0.45, z, C.wood);
    });
  } else if (kind === 'hospital') {
    b.box(54, 0.7, 38, 0, 0.35, 0, C.foundation);
    b.box(52, 11, 36, 0, 6.0, 0, C.white);
    b.box(52.5, 0.6, 36.5, 0, 11.6, 0, C.concrete);
    // Faixa azul
    b.box(52.3, 0.7, 36.3, 0, 2.6, 0, C.sky);
    // Cruz vermelha nas duas fachadas
    b.box(6, 1.7, 0.3, 0, 8.5, 18.1, C.red);
    b.box(1.7, 6, 0.3, 0, 8.5, 18.1, C.red);
    b.box(0.3, 1.7, 6, 26.1, 8.5, 0, C.red);
    b.box(0.3, 6, 1.7, 26.1, 8.5, 0, C.red);
    // Entrada sul + canopy
    b.box(18, 0.7, 7, 0, 4.4, 20, C.concrete);
    [-6, 6].forEach((x) => b.cyl(0.18, 0.18, 3.4, 8, x, 2.4, 22.5, C.iron));
    b.box(5.4, 2.9, 0.5, 0, 1.9, 18.1, C.glass);
    b.box(7, 3.2, 0.4, 0, 2.0, 18.3, C.white);
    // Helicóptero-pad
    b.cyl(7, 7, 0.35, 20, 0, 11.85, 0, C.asphalt);
    b.box(4.4, 0.05, 0.5, 0, 12.05, 0, C.white);
    b.box(0.5, 0.05, 4.4, 0, 12.05, 0, C.white);
    // Janelas em grelha
    for (let floor = 0; floor < 3; floor++) {
      for (let x = -22; x <= 22; x += 5.5) {
        b.box(2.8, 1.3, 0.1, x, 3.6 + floor * 2.8, 18.05, C.glass);
      }
    }
  } else if (kind === 'estadio') {
    // Bancadas em anel aberto, para o relvado continuar visível
    b.mesh(new THREE.CylinderGeometry(66, 66, 8, 40, 1, true), C.concrete, (g) => g.translate(0, 4, 0));
    b.mesh(new THREE.RingGeometry(56, 66, 40).rotateX(-Math.PI / 2), C.concrete, (g) => g.translate(0, 8.2, 0));
    b.mesh(new THREE.RingGeometry(48, 58, 40).rotateX(-Math.PI / 2), C.white, (g) => g.translate(0, 10.4, 0));
    b.mesh(new THREE.CylinderGeometry(46, 46, 4, 40, 1, true), C.white, (g) => g.translate(0, 8.2, 0));
    // Relvado
    b.cyl(45, 45, 0.35, 40, 0, 4.9, 0, C.green);
    b.box(0.4, 0.3, 72, 0, 5.1, 0, C.white);
    b.cyl(9, 9, 0.4, 24, 0, 5.1, 0, C.white);
    b.cyl(8.4, 8.4, 0.45, 24, 0, 5.15, 0, C.green);
    // Balizas
    [-40, 40].forEach((x) => {
      b.box(0.25, 3.2, 0.25, x, 6.7, -4, C.white);
      b.box(0.25, 3.2, 0.25, x, 6.7, 4, C.white);
      b.box(0.25, 0.25, 8, x, 8.2, 0, C.white);
    });
    // Torres de iluminação
    [[-44, -38], [44, -38], [-44, 38], [44, 38]].forEach(([x, z]) => {
      b.cyl(0.5, 0.9, 24, 8, x, 16, z, C.iron);
      b.box(3.6, 2.2, 0.8, x, 28.4, z, C.white);
      b.box(3.2, 0.5, 0.9, x, 28.4, z + 0.5, C.gold);
    });
    // Entrada sul
    b.box(20, 7, 8, 0, 7.5, 63, C.white);
    b.box(14, 4, 0.4, 0, 5.5, 59, C.glass);
  } else if (kind === 'mercado') {
    b.box(30, 0.6, 22, 0, 0.3, 0, C.foundation);
    b.box(26, 5.2, 18, 0, 3.0, 0, C.cream);
    b.box(30, 0.4, 22, 0, 5.9, 0, C.terracotta);
    for (let x = -10; x <= 10; x += 5) b.cyl(0.18, 0.18, 5.4, 8, x, 3.1, 9.6, C.white);
    b.box(28, 0.35, 4, 0, 5.7, 9.6, C.red);
    b.box(0.2, 3.0, 8, -13.1, 2.2, 0, C.glass);
    b.box(0.2, 2.4, 2.4, 13.1, 2.0, 0, C.darkWood);
    // Bancas exteriores
    for (let i = 0; i < 3; i++) {
      b.box(4.4, 0.8, 2.4, -12 + i * 12, 0.7, -12.5, C.wood);
      b.box(4.8, 0.15, 2.8, -12 + i * 12, 1.2, -12.5, i % 2 ? C.orange : C.red);
      b.box(0.2, 2.2, 0.2, -14.2 + i * 12, 1.6, -12.5, C.darkWood);
      b.box(0.2, 2.2, 0.2, -9.8 + i * 12, 1.6, -12.5, C.darkWood);
    }
  } else if (kind === 'piscina') {
    // Deck
    b.box(34, 0.35, 22, 0, 0.18, 0, C.pavement);
    b.box(26, 0.4, 14, 0, 0.22, 0, C.sky);
    b.box(24, 0.2, 12, 0, 0.35, 0, C.blue);
    // Espreguiçadeiras
    for (let i = 0; i < 5; i++) {
      b.box(2.2, 0.25, 0.9, 14.5, 0.45, -6 + i * 3, C.white);
      b.box(0.9, 0.6, 0.9, 14.5, 0.3, -6 + i * 3, C.wood);
    }
    b.box(0.4, 2.3, 0.4, -16, 1.4, -10, C.white);
    b.box(0.4, 2.3, 0.4, -16, 1.4, 10, C.white);
    b.box(0.2, 0.2, 20, -16, 2.55, 0, C.white);
  } else if (kind === 'praca') {
    b.cyl(28, 28, 0.2, 40, 0, 0.1, 0, C.pavement);
    b.cyl(24, 24, 0.12, 40, 0, 0.22, 0, shade(C.pavement, -0.05));
    // Desenho radial
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      b.box(23, 0.04, 1.1, Math.cos(a) * 13, 0.3, Math.sin(a) * 13, C.white, -a);
    }
  } else if (kind === 'estacao') {
    b.box(46, 0.9, 12, 0, 0.45, 0, C.concrete);
    b.box(42, 0.5, 10, 0, 4.6, 0, C.terracotta);
    for (let x = -18; x <= 18; x += 6) b.cyl(0.16, 0.16, 4.0, 8, x, 2.6, 3.8, C.iron);
    b.box(14, 3.4, 6, 0, 1.9, -2, C.cream);
    b.box(4, 2.4, 0.2, 0, 1.5, 1.1, C.glass);
    b.box(0.25, 0.25, 10, 0, 2.0, 4.9, C.iron);
  }
  const geo = b.build();
  geo.computeBoundingSphere();
  return geo;
}

export const CIVIC_ANCHOR: Record<CivicKind, { x: number; z: number; y?: number; rotY?: number }> = {
  prefeitura: { x: -145, z: -28, y: 4 },
  padaria: { x: 135, z: -28, y: 4 },
  hospital: { x: 180, z: -180, y: 4 },
  estadio: { x: -260, z: 235, y: 4 },
  mercado: { x: -320, z: -175, y: 4 },
  praca: { x: 0, z: 0, y: 4.3 },
  piscina: { x: 370, z: -35, y: 4 },
  estacao: { x: 20, z: 536, y: 4.1 },
};

// -----------------------------------------------------------------------------
// Fonte do Caramelo
// -----------------------------------------------------------------------------
export function buildFountain(): { geometry: THREE.BufferGeometry; water: THREE.Mesh } {
  const b = new Builder();
  b.cyl(4.6, 5.0, 0.8, 24, 0, 0.4, 0, C.stone);
  b.cyl(4.1, 4.1, 0.45, 24, 0, 0.9, 0, C.sky);
  b.cyl(0.8, 1.2, 2.4, 14, 0, 2.1, 0, C.stone);
  b.cyl(2.2, 1.6, 0.35, 18, 0, 3.3, 0, C.stone);
  b.cyl(1.9, 1.9, 0.3, 18, 0, 3.5, 0, C.sky);
  // Corpo do caramelo em dourado
  b.sphere(0.85, 0.15, 4.55, 0.1, C.gold, 1);
  b.sphere(0.52, 1.0, 4.95, 0.1, C.gold, 1);
  b.cone(0.22, 0.42, 6, 0.95, 5.4, -0.1, C.gold);
  b.cone(0.22, 0.42, 6, 1.15, 5.4, 0.25, C.gold);
  b.box(0.18, 0.55, 0.18, -0.35, 4.15, 0.45, C.gold);
  b.box(0.18, 0.55, 0.18, -0.35, 4.15, -0.35, C.gold);
  b.box(0.18, 0.55, 0.18, 0.6, 4.15, 0.45, C.gold);
  b.box(0.18, 0.55, 0.18, 0.6, 4.15, -0.35, C.gold);
  b.cyl(0.08, 0.08, 0.8, 6, -0.6, 4.6, 0.15, C.gold);
  const geometry = b.build();
  geometry.translate(0, 4.1, 0);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(4.15, 4.15, 0.5, 28),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.1, metalness: 0.2 })
  );
  water.position.y = 4.55;
  water.receiveShadow = true;
  return { geometry, water };
}

// -----------------------------------------------------------------------------
// Mobiliário urbano (instanciável)
// -----------------------------------------------------------------------------
export function buildStreetLamp(): THREE.BufferGeometry {
  const b = new Builder();
  b.cyl(0.12, 0.16, 5.0, 8, 0, 2.5, 0, C.iron);
  b.box(1.1, 0.1, 0.1, 0.55, 4.9, 0, C.iron);
  b.cyl(0.28, 0.18, 0.5, 6, 1.05, 4.65, 0, C.gold);
  b.box(0.42, 0.55, 0.42, 0, 0.35, 0, C.iron);
  return b.build();
}

export function buildBench(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(1.9, 0.1, 0.55, 0, 0.55, 0, C.wood);
  b.box(1.9, 0.45, 0.08, 0, 0.85, -0.25, C.wood);
  [-0.75, 0.75].forEach((x) => b.box(0.1, 0.55, 0.5, x, 0.3, 0, C.iron));
  return b.build();
}

export function buildTrashBin(): THREE.BufferGeometry {
  const b = new Builder();
  b.cyl(0.38, 0.32, 0.9, 8, 0, 0.45, 0, C.darkGreen);
  b.cyl(0.42, 0.42, 0.1, 8, 0, 0.95, 0, C.iron);
  return b.build();
}

export function buildBusStop(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(3.2, 0.1, 1.5, 0, 2.7, 0, C.sky);
  [-1.5, 1.5].forEach((x) => b.box(0.1, 2.7, 0.1, x, 1.35, -0.6, C.iron));
  b.box(3.0, 0.1, 0.45, 0, 0.55, 0.35, C.wood);
  b.box(3.0, 0.5, 0.08, 0, 0.85, 0.5, C.wood);
  b.box(1.2, 0.7, 0.08, 0, 3.3, 0, C.white);
  return b.build();
}

export function buildKiosk(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(6, 0.3, 4, 0, 0.15, 0, C.wood);
  b.box(5.6, 2.6, 3.6, 0, 1.6, 0, C.cream);
  b.box(6.2, 0.25, 4.2, 0, 3.0, 0, C.terracotta);
  b.box(4.2, 1.0, 0.2, 0, 2.0, 1.9, C.glass);
  b.box(4.6, 0.18, 0.8, 0, 1.6, 2.2, C.wood);
  b.box(6.4, 0.25, 4.4, 0, 3.2, 0, C.red);
  return b.build();
}

export function buildLifeguard(): THREE.BufferGeometry {
  const b = new Builder();
  b.box(2.6, 0.2, 2.6, 0, 2.2, 0, C.wood);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([x, z]) => b.cyl(0.1, 0.12, 2.2, 6, x, 1.1, z, C.wood));
  b.box(2.4, 1.4, 0.15, 0, 3.0, -1.2, C.red);
  b.cone(2.0, 0.9, 4, 0, 3.3, 0, C.white, Math.PI / 4);
  return b.build();
}

/**
 * Palmeira procedural (o pack Kenney não inclui palmeiras).
 * Tronco curvo em segmentos afunilados + coroa de folhas em lâminas que
 * arqueiam para baixo, com cocos junto à coroa.
 */
export function buildPalm(height = 6, lean = 0.9, seed = 0): THREE.BufferGeometry {
  const b = new Builder();
  const trunkColor = (i: number) => (i % 2 === 0 ? C.wood : C.darkWood);
  const segments = Math.max(7, Math.round(height * 1.6));
  const leanAngle = seed * 1.7;
  const dirX = Math.cos(leanAngle);
  const dirZ = Math.sin(leanAngle);

  // --- Tronco: cada segmento é um cilindro afunilado ligeiramente deslocado ---
  const pointAt = (t: number) => {
    const bend = Math.pow(t, 1.9) * lean;
    return new THREE.Vector3(dirX * bend, height * t, dirZ * bend);
  };

  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const start = pointAt(t0);
    const end = pointAt(t1);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const dir = end.clone().sub(start);
    const length = dir.length();
    const rTop = THREE.MathUtils.lerp(0.17, 0.3, t1);
    const rBottom = THREE.MathUtils.lerp(0.17, 0.3, t0);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    b.mesh(new THREE.CylinderGeometry(rTop, rBottom, length * 1.04, 8), trunkColor(i), (g) => {
      g.applyQuaternion(quat);
      g.translate(mid.x, mid.y, mid.z);
    });
    // Anel de base para dar textura ao tronco
    if (i % 3 === 1) {
      b.mesh(new THREE.CylinderGeometry(rTop * 1.12, rTop * 1.12, length * 0.16, 8), C.darkWood, (g) => {
        g.applyQuaternion(quat);
        g.translate(mid.x, mid.y, mid.z);
      });
    }
  }

  const crown = pointAt(1);
  // Coqueiro: capa de folhas velhas na base da coroa
  b.sphere(0.42, crown.x, crown.y - 0.16, crown.z, C.darkWood, 0);

  // --- Folhas: 4 lâminas por folha, arqueando para baixo ---
  const fronds = 10;
  for (let f = 0; f < fronds; f += 1) {
    const angle = (f / fronds) * Math.PI * 2 + seed * 0.9;
    const basePitch = 0.72 + (f % 3) * 0.14;
    let anchor = crown.clone();
    for (let s = 0; s < 4; s += 1) {
      const pitch = basePitch - s * 0.42;
      const segLength = 0.95 - s * 0.07;
      const width = 0.62 - s * 0.11;
      const thickness = 0.14 - s * 0.02;
      const cos = Math.cos(pitch);
      const sin = Math.sin(pitch);
      const end = new THREE.Vector3(
        anchor.x + Math.sin(angle) * cos * segLength,
        anchor.y + sin * segLength,
        anchor.z + Math.cos(angle) * cos * segLength,
      );
      const color = (f + s) % 2 === 0 ? C.green : C.darkGreen;
      b.mesh(new THREE.BoxGeometry(width, thickness, segLength), color, (g) => {
        g.translate(0, 0, segLength / 2);
        g.rotateX(-pitch);
        g.rotateY(angle);
        g.translate(anchor.x, anchor.y, anchor.z);
      });
      anchor = end;
    }
  }

  // --- Cocos ---
  for (let c = 0; c < 4; c += 1) {
    const a = (c / 4) * Math.PI * 2 + seed;
    b.sphere(0.17, crown.x + Math.cos(a) * 0.3, crown.y - 0.34, crown.z + Math.sin(a) * 0.3, C.orange, 0);
  }

  return b.build();
}

/** Acácia da savana: tronco que se abre numa copa em chapéu-de-sol. */
export function buildAcacia(height = 7, seed = 0): THREE.BufferGeometry {
  const b = new Builder();
  const lean = 0.4 + (seed % 3) * 0.18;
  b.mesh(new THREE.CylinderGeometry(0.16, 0.34, height * 0.62, 7), C.darkWood, (g) => {
    g.translate(0, height * 0.31, 0);
    g.rotateZ(0.06);
  });
  // Dois ramos em Y
  [-1, 1].forEach((side, index) => {
    const len = height * 0.3;
    b.mesh(new THREE.CylinderGeometry(0.1, 0.17, len, 6), C.wood, (g) => {
      g.translate(0, len / 2, 0);
      g.rotateZ(side * (0.5 + lean * 0.2));
      g.translate(side * 0.25, height * 0.6, index === 0 ? -0.15 : 0.15);
    });
  });
  // Copa achatada em três almofadas
  const crownY = height * 0.86;
  const pads: [number, number, number, number][] = [
    [0, 0, 0, 1],
    [1.5, -0.15, 0.9, 0.72],
    [-1.4, -0.1, -0.8, 0.66],
    [0.3, -0.2, -1.5, 0.6],
  ];
  pads.forEach(([x, y, z, s], i) => {
    const radius = height * 0.24 * s;
    b.mesh(new THREE.IcosahedronGeometry(radius, 1), i % 2 ? C.green : C.darkGreen, (g) => {
      g.scale(1.35, 0.42, 1.35);
      g.translate(x, crownY + y, z);
    });
  });
  return b.build();
}

/** Mandacaru / cato do bioma árido. */
export function buildCactus(height = 4, seed = 0): THREE.BufferGeometry {
  const b = new Builder();
  const arms = 1 + (seed % 3);
  b.mesh(new THREE.CylinderGeometry(0.34, 0.46, height, 9), C.cactus, (g) => g.translate(0, height / 2, 0));
  b.mesh(new THREE.IcosahedronGeometry(0.34, 0), C.cactus, (g) => g.translate(0, height, 0));
  for (let i = 0; i < arms; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const y = height * (0.42 + i * 0.14);
    b.mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 8), C.cactus, (g) => {
      g.rotateZ(Math.PI / 2);
      g.translate(side * 0.5, y, 0);
    });
    b.mesh(new THREE.CylinderGeometry(0.2, 0.22, height * 0.28, 8), C.cactus, (g) => {
      g.translate(side * 0.95, y + height * 0.14, 0);
    });
  }
  return b.build();
}

/** Tufo de capim seco da savana. */
export function buildDryGrass(seed = 0): THREE.BufferGeometry {
  const b = new Builder();
  const blades = 5;
  for (let i = 0; i < blades; i += 1) {
    const angle = (i / blades) * Math.PI * 2 + seed;
    const height = 0.7 + ((seed + i) % 4) * 0.16;
    b.mesh(new THREE.ConeGeometry(0.1, height, 3), i % 2 ? C.dryGrass : C.straw, (g) => {
      g.translate(0, height / 2, 0);
      g.rotateZ(Math.cos(angle) * 0.35);
      g.rotateX(Math.sin(angle) * 0.35);
      g.translate(Math.cos(angle) * 0.16, 0, Math.sin(angle) * 0.16);
    });
  }
  return b.build();
}

/** Vegetação rasteira / arbusto. */
export function buildBush(): THREE.BufferGeometry {
  const b = new Builder();
  b.sphere(0.75, 0, 0.6, 0, C.green, 0);
  b.sphere(0.5, 0.6, 0.45, 0.2, C.darkGreen, 0);
  b.sphere(0.45, -0.5, 0.4, -0.2, C.darkGreen, 0);
  return b.build();
}

/** Rocha low-poly. */
export function buildRock(): THREE.BufferGeometry {
  const b = new Builder();
  b.sphere(1.0, 0, 0.5, 0, C.stone, 0);
  b.sphere(0.55, 0.8, 0.3, 0.3, C.stone, 0);
  return b.build();
}
