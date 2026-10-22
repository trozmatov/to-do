/**
 * Web Audio API yordamida yoqimli va yengil sintezator ovozlari.
 * Tashqi audio fayllar kerak emas, to'liq oflayn ishlaydi.
 */

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) audioCtx = new AudioContextClass()
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/**
 * Vazifa bajarilganda yoqimli marimba/chime akkordi (C6 - E6 - G6)
 */
export function playCompleteSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  // 3 ta mayin notalar: C6 (1046.5Hz), E6 (1318.5Hz), G6 (1568Hz)
  const notes = [
    { freq: 1046.5, delay: 0, dur: 0.28 },
    { freq: 1318.5, delay: 0.08, dur: 0.32 },
    { freq: 1568.0, delay: 0.16, dur: 0.45 },
  ]

  notes.forEach(({ freq, delay, dur }) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + delay)

    // Mayin attack va silliq exponential decay
    gain.gain.setValueAtTime(0.0001, now + delay)
    gain.gain.exponentialRampToValueAtTime(0.14, now + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + delay)
    osc.stop(now + delay + dur + 0.05)
  })
}

/**
 * Pomodoro taymeri tugaganda chalinuvchi mayin gong/signal
 */
export function playTimerFinishSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const notes = [587.33, 880, 1174.66] // D5, A5, D6

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + idx * 0.15)

    gain.gain.setValueAtTime(0.0001, now + idx * 0.15)
    gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.15 + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 0.8)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * 0.15)
    osc.stop(now + idx * 0.15 + 0.9)
  })
}

/**
 * Vazifa vaqti yetganda eslatma signali (2 qisqa mayin beep)
 */
export function playReminderSound() {
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  ;[0, 0.18].forEach((delay) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now + delay)

    gain.gain.setValueAtTime(0.0001, now + delay)
    gain.gain.exponentialRampToValueAtTime(0.18, now + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + delay)
    osc.stop(now + delay + 0.15)
  })
}
