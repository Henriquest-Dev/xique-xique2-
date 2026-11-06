import * as THREE from 'three';

/** Faixa/painel de publicidade desenhado em canvas. */
export function textBanner(text: string, bg = '#e11d48', fg = '#ffffff', w = 512, h = 160): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paintBanner(c, text, bg, fg);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  return t;
}

export function paintBanner(c: HTMLCanvasElement, text: string, bg: string, fg: string) {
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(0, 0, c.width, c.height * 0.12);
  g.strokeStyle = 'rgba(0,0,0,0.35)';
  g.lineWidth = 8;
  g.strokeRect(4, 4, c.width - 8, c.height - 8);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = c.height * 0.5;
  g.font = `800 ${size}px Fredoka, Nunito, sans-serif`;
  while (g.measureText(text).width > c.width - 40 && size > 14) {
    size -= 4;
    g.font = `800 ${size}px Fredoka, Nunito, sans-serif`;
  }
  g.fillText(text, c.width / 2, c.height / 2 + 2);
}

export function repaint(tex: THREE.CanvasTexture, text: string, bg: string, fg: string) {
  paintBanner(tex.userData.canvas as HTMLCanvasElement, text, bg, fg);
  tex.needsUpdate = true;
}
