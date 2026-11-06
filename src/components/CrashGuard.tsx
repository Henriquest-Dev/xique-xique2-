import React from 'react';
import { webglInfo, buildReport } from '../services/diagnostics';

/** Rede de segurança: se qualquer parte do jogo rebentar, mostra a causa em vez de um ecrã vazio. */
export class CrashGuard extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() {
    if (!this.state.err) return this.props.children;
    const gl = webglInfo();
    const noGl = /webgl/i.test(this.state.err.message) || /NÃO/.test(gl);
    return (
      <div style={{ minHeight: '100vh', background: '#04101a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>O jogo não conseguiu arrancar</h1>
        {noGl && <p style={{ maxWidth: 380, marginTop: 12, fontSize: 14, color: '#fcd34d' }}>Este navegador não consegue usar gráficos 3D (WebGL). Ative a "aceleração por hardware" nas definições do navegador, ou experimente o Chrome ou o Edge atualizados.</p>}
        <p style={{ maxWidth: 380, marginTop: 12, fontSize: 13, background: 'rgba(239,68,68,.15)', color: '#fecaca', padding: '8px 12px', borderRadius: 12, wordBreak: 'break-word' }}>{this.state.err.message}</p>
        <p style={{ maxWidth: 380, marginTop: 10, fontSize: 12, color: '#94a3b8' }}>Placa gráfica: {gl}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300, marginTop: 20 }}>
          <button style={{ padding: 12, borderRadius: 12, background: '#fbbf24', color: '#111', fontWeight: 800, border: 0 }} onClick={() => { try { localStorage.setItem('xx_lite', '1'); } catch { /* */ } location.reload(); }}>Tentar modo leve</button>
          <button style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.1)', color: '#fff', fontWeight: 700, border: 0 }} onClick={() => location.reload()}>Tentar de novo</button>
          <button style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.1)', color: '#fff', fontWeight: 700, border: 0 }} onClick={() => { void navigator.clipboard?.writeText(buildReport()); }}>Copiar relatório do erro</button>
        </div>
      </div>
    );
  }
}
