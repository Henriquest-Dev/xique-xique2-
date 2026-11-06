// Etiquetas 3D desenhadas em canvas (sem ficheiros externos).

import * as THREE from 'three';

interface LabelOptions {
  background?: string;
  color?: string;
  accent?: string;
  fontSize?: number;
  scale?: number;
}

export function createTextSprite(text: string, options: LabelOptions = {}): THREE.Sprite {
  const {
    background = 'rgba(15, 23, 42, 0.88)',
    color = '#f8fafc',
    accent = '#f5b52e',
    fontSize = 44,
    scale = 0.031,
  } = options;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + 70;
  const height = fontSize + 42;
  canvas.width = width;
  canvas.height = height;

  const c = canvas.getContext('2d')!;
  c.font = font;
  c.textBaseline = 'middle';

  const radius = 18;
  c.beginPath();
  c.moveTo(radius, 0);
  c.lineTo(width - radius, 0);
  c.quadraticCurveTo(width, 0, width, radius);
  c.lineTo(width, height - radius);
  c.quadraticCurveTo(width, height, width - radius, height);
  c.lineTo(radius, height);
  c.quadraticCurveTo(0, height, 0, height - radius);
  c.lineTo(0, radius);
  c.quadraticCurveTo(0, 0, radius, 0);
  c.closePath();
  c.fillStyle = background;
  c.fill();

  c.fillStyle = accent;
  c.fillRect(14, height / 2 - fontSize * 0.42, 6, fontSize * 0.84);

  c.fillStyle = color;
  c.fillText(text, 36, height / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width * scale, height * scale, 1);
  sprite.renderOrder = 4;
  sprite.userData.labelText = text;
  return sprite;
}
