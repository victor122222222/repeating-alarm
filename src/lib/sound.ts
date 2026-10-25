// Sonidos generados con Web Audio. Cada llamada dura unos 1,8 s y se repite
// mientras la alarma no se desbloquea.
export function playTone(ctx: AudioContext, tone: string) {
  void ctx.resume()
  const t0 = ctx.currentTime
  const out = ctx.createGain()
  out.gain.value = 0.9
  const compressor = ctx.createDynamicsCompressor()
  out.connect(compressor)
  compressor.connect(ctx.destination)
  const note = (
    type: OscillatorType,
    from: number,
    to: number,
    start: number,
    length: number,
    volume = 0.6,
  ) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(from, t0 + start)
    oscillator.frequency.linearRampToValueAtTime(to, t0 + start + length)
    gain.gain.setValueAtTime(0.0001, t0 + start)
    gain.gain.exponentialRampToValueAtTime(volume, t0 + start + 0.02)
    gain.gain.setValueAtTime(volume, t0 + start + length - 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + start + length)
    oscillator.connect(gain)
    gain.connect(out)
    oscillator.start(t0 + start)
    oscillator.stop(t0 + start + length + 0.02)
  }
  if (tone === 'Sirena') {
    for (let i = 0; i < 4; i++)
      note('sawtooth', i % 2 ? 1400 : 700, i % 2 ? 700 : 1400, i * 0.45, 0.45)
  } else if (tone === 'Pitido') {
    for (let i = 0; i < 4; i++) note('square', 2000, 2000, i * 0.45, 0.25)
  } else {
    const base = tone === 'Brisa' ? 660 : tone === 'Órbita' ? 440 : 880
    for (let i = 0; i < 4; i++) {
      const f = base + (i % 3) * 110
      note('triangle', f, f, i * 0.45, 0.35, 0.8)
    }
  }
}
