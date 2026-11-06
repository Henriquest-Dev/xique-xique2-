// =============================================================================
// Áudio 100% procedural (WebAudio) — sem ficheiros externos.
// Só arranca depois de um gesto do utilizador, como exigem os navegadores.
// =============================================================================

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  glide?: number;
};

class SoundService {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  private ambientOn = false;
  private volume = 0.5;
  private birdTimer: number | null = null;

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  public setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
  }

  private play(tone: Tone) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + (tone.delay ?? 0);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t0);
    if (tone.glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, tone.glide), t0 + tone.dur);
    const peak = tone.gain ?? 0.12;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.05);
  }

  public playClick() {
    this.init();
    this.play({ freq: 540, dur: 0.06, type: 'triangle', gain: 0.07 });
  }

  public playCoin() {
    this.init();
    this.play({ freq: 880, dur: 0.09, type: 'square', gain: 0.05 });
    this.play({ freq: 1320, dur: 0.16, type: 'square', gain: 0.045, delay: 0.07 });
  }

  public playBuild() {
    this.init();
    this.play({ freq: 180, dur: 0.18, type: 'sawtooth', gain: 0.07, glide: 90 });
    this.play({ freq: 320, dur: 0.12, type: 'triangle', gain: 0.06, delay: 0.12 });
    this.play({ freq: 480, dur: 0.16, type: 'triangle', gain: 0.05, delay: 0.22 });
  }

  public playDoor() {
    this.init();
    this.play({ freq: 220, dur: 0.22, type: 'sine', gain: 0.08, glide: 140 });
  }

  public playDoorbell() {
    this.init();
    this.play({ freq: 659, dur: 0.5, type: 'sine', gain: 0.14 });
    this.play({ freq: 523, dur: 0.7, type: 'sine', gain: 0.14, delay: 0.45 });
  }

  public playKnock() {
    this.init();
    for (let i = 0; i < 3; i++) this.play({ freq: 150, dur: 0.09, type: 'square', gain: 0.1, delay: i * 0.22, glide: 90 });
  }

  public playBakeChime() {
    this.init();
    this.play({ freq: 1046, dur: 0.24, type: 'sine', gain: 0.06 });
    this.play({ freq: 1318, dur: 0.3, type: 'sine', gain: 0.05, delay: 0.1 });
  }

  public playHarvest() {
    this.init();
    this.play({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.06 });
    this.play({ freq: 880, dur: 0.16, type: 'triangle', gain: 0.05, delay: 0.08 });
  }

  public playDeliverySuccess() {
    this.init();
    [523, 659, 784, 1046].forEach((freq, i) =>
      this.play({ freq, dur: 0.18, type: 'triangle', gain: 0.055, delay: i * 0.09 }),
    );
  }

  public playError() {
    this.init();
    this.play({ freq: 240, dur: 0.16, type: 'sawtooth', gain: 0.06, glide: 160 });
  }

  public playVote() {
    this.init();
    this.play({ freq: 440, dur: 0.12, type: 'square', gain: 0.05 });
    this.play({ freq: 660, dur: 0.2, type: 'square', gain: 0.045, delay: 0.14 });
    this.play({ freq: 990, dur: 0.24, type: 'sine', gain: 0.04, delay: 0.3 });
  }

  public playFootstep() {
    this.init();
    this.play({ freq: 120 + Math.random() * 40, dur: 0.05, type: 'triangle', gain: 0.025 });
  }

  public playSplash() {
    this.init();
    this.play({ freq: 700, dur: 0.22, type: 'sine', gain: 0.06, glide: 220 });
  }

  public playHorn() {
    this.init();
    this.play({ freq: 330, dur: 0.18, type: 'square', gain: 0.04 });
    this.play({ freq: 392, dur: 0.22, type: 'square', gain: 0.035, delay: 0.02 });
  }

  public playSeagull() {
    this.init();
    this.play({ freq: 1200, dur: 0.12, type: 'sine', gain: 0.02, glide: 900 });
    this.play({ freq: 1100, dur: 0.1, type: 'sine', gain: 0.018, delay: 0.14, glide: 800 });
  }

  // ---------------------------------------------------------------------------
  // Ambiente: mar + vento + pássaros (ruído filtrado, gerado em tempo real)
  // ---------------------------------------------------------------------------
  public setAmbient(enabled: boolean) {
    this.init();
    if (!this.ctx || !this.master) return;
    if (enabled && !this.ambientOn) this.startAmbient();
    if (!enabled && this.ambientOn) this.stopAmbient();
  }

  private startAmbient() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    this.ambientGain = gain;
    this.ambientNodes = [source, filter, gain];
    this.ambientOn = true;

    this.birdTimer = window.setInterval(() => {
      if (!this.ambientOn) return;
      if (Math.random() < 0.55) this.playSeagull();
      else this.play({ freq: 2200 + Math.random() * 600, dur: 0.07, type: 'sine', gain: 0.014 });
    }, 6500);
  }

  private stopAmbient() {
    this.ambientNodes.forEach((node) => {
      try {
        if (node instanceof AudioBufferSourceNode) node.stop();
        node.disconnect();
      } catch {
        /* já parado */
      }
    });
    this.ambientNodes = [];
    this.ambientGain = null;
    this.ambientOn = false;
    if (this.birdTimer) {
      clearInterval(this.birdTimer);
      this.birdTimer = null;
    }
  }

  public dispose() {
    this.stopAmbient();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}

export const sound = new SoundService();
