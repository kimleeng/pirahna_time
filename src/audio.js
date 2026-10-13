export class RiverAudio {
  constructor() { this.enabled = false; this.ctx = null; this.ambient = null; }

  async toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      await this.ctx.resume();
      if (!this.ambient) {
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < data.length; i++) { smooth = (smooth + (Math.random() * 2 - 1) * 0.025) / 1.025; data[i] = smooth * 3.5; }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 800;
        const gain = this.ctx.createGain(); gain.gain.value = 0.13;
        source.connect(filter).connect(gain).connect(this.ctx.destination);
        source.start();
        this.ambient = { source, gain };
      }
      this.ambient.gain.gain.setTargetAtTime(0.13, this.ctx.currentTime, 0.15);
    } else if (this.ambient) {
      this.ambient.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    }
    return this.enabled;
  }

  sound(kind) {
    if (!this.enabled || !this.ctx) return;
    const notes = {
      bite: [740, 988], hook: [260, 370], catch: [392, 494, 587, 784],
      piranha: [190, 140], snap: [160, 90], escape: [330, 247], cast: [560, 300],
    }[kind];
    if (!notes) return;
    notes.forEach((frequency, i) => {
      const start = this.ctx.currentTime + i * 0.09;
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.085, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      oscillator.connect(gain).connect(this.ctx.destination);
      oscillator.start(start); oscillator.stop(start + 0.2);
    });
  }
}
