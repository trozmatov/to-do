/**
 * Zero-dependency engil va chiroyli Canvas Konfetti effekti.
 * Vazifa bajarilganda bayramona porlash va mikro-animatsiya.
 */

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6']

export function fireConfetti(originX, originY) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '9999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const startX = originX ?? window.innerWidth / 2
  const startY = originY ?? window.innerHeight / 2

  const particleCount = 38
  const particles = []

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 3.5 + Math.random() * 5.5
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
      decay: 0.02 + Math.random() * 0.025,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
    })
  }

  let animationFrameId

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    let alive = false
    for (const p of particles) {
      if (p.alpha <= 0) continue
      alive = true

      p.x += p.vx
      p.y += p.vy
      p.vy += 0.16 // gravity
      p.vx *= 0.98 // drag
      p.alpha -= p.decay
      p.rotation += p.rotSpeed

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = Math.max(0, p.alpha)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7)
      ctx.restore()
    }

    if (alive) {
      animationFrameId = requestAnimationFrame(render)
    } else {
      cancelAnimationFrame(animationFrameId)
      canvas.remove()
    }
  }

  render()
}
