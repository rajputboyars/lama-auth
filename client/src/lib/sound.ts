let ctx: AudioContext | null = null;

/** Tiny synthesized blips: no audio files to ship. */
export function playTradeSound(kind: 'win' | 'loss' | 'fail') {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    const [from, to] = kind === 'win' ? [520, 880] : kind === 'loss' ? [440, 220] : [200, 160];
    osc.type = kind === 'fail' ? 'square' : 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + 0.15);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  } catch {
    /* audio unavailable */
  }
}
