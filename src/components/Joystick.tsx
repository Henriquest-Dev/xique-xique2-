import { useEffect, useRef, useState } from 'react';

interface Props {
  onChange: (x: number, y: number) => void;
}

export function Joystick({ onChange }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [pointerId, setPointerId] = useState<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const radius = 46;

  useEffect(() => {
    return () => onChange(0, 0);
  }, [onChange]);

  const updateFromEvent = (clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx = (dx / distance) * radius;
      dy = (dy / distance) * radius;
    }
    setKnob({ x: dx, y: dy });
    onChange(dx / radius, -dy / radius);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setPointerId(event.pointerId);
        updateFromEvent(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointerId !== event.pointerId) return;
        updateFromEvent(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        if (pointerId !== event.pointerId) return;
        setPointerId(null);
        setKnob({ x: 0, y: 0 });
        onChange(0, 0);
      }}
      onPointerCancel={() => {
        setPointerId(null);
        setKnob({ x: 0, y: 0 });
        onChange(0, 0);
      }}
      className="pointer-events-auto relative h-28 w-28 touch-none rounded-full border border-white/15 bg-black/30 backdrop-blur-md"
      style={{ boxShadow: 'inset 0 0 24px rgba(0,0,0,0.4)' }}
    >
      <div className="absolute inset-4 rounded-full border border-white/10" />
      <div
        className="absolute h-12 w-12 rounded-full border border-amber-200/40 bg-amber-300/70 shadow-lg"
        style={{
          left: `calc(50% - 24px + ${knob.x}px)`,
          top: `calc(50% - 24px + ${knob.y}px)`,
          transition: pointerId === null ? 'left 0.15s, top 0.15s' : 'none',
        }}
      />
    </div>
  );
}
