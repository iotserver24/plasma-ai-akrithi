'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const networkCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [terminalHtml, setTerminalHtml] = useState('')

  const terminalLines = useMemo(
    () => ['SYSTEM_BOOT: OK', 'CORE_AI_LOADED: 100%', 'PROXY_ESTABLISHED...', 'AUTH_WAITING_INPUT...'],
    [],
  )

  useEffect(() => {
    let cancelled = false
    let lineIndex = 0
    let charIndex = 0

    function tick() {
      if (cancelled) return
      if (lineIndex >= terminalLines.length) return

      const line = terminalLines[lineIndex]
      if (charIndex < line.length) {
        setTerminalHtml((prev) => prev + line.charAt(charIndex))
        charIndex += 1
        window.setTimeout(tick, 50)
        return
      }

      setTerminalHtml((prev) => prev + '<br/>')
      lineIndex += 1
      charIndex = 0
      window.setTimeout(tick, 800)
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [terminalLines])

  useEffect(() => {
    const matrixCanvas: HTMLCanvasElement = matrixCanvasRef.current!
    const networkCanvas: HTMLCanvasElement = networkCanvasRef.current!
    if (!matrixCanvas || !networkCanvas) return

    const matrixCtx = matrixCanvas.getContext('2d')
    const networkCtx = networkCanvas.getContext('2d')
    if (!matrixCtx || !networkCtx) return

    let matrixIntervalId: number | null = null
    let rafId: number | null = null

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight

      matrixCanvas.width = Math.floor(w * dpr)
      matrixCanvas.height = Math.floor(h * dpr)
      matrixCanvas.style.width = `${w}px`
      matrixCanvas.style.height = `${h}px`
      matrixCtx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      networkCanvas.width = Math.floor(w * dpr)
      networkCanvas.height = Math.floor(h * dpr)
      networkCanvas.style.width = `${w}px`
      networkCanvas.style.height = `${h}px`
      networkCtx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Matrix rain
    const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%"'#&_(),.;:?!\\|{}<>[]^~`
    const fontSize = 18
    const columns = () => Math.ceil(window.innerWidth / fontSize)
    let drops = Array.from({ length: columns() }, () => Math.random() * -100)

    function drawMatrix() {
      if (!matrixCtx) return
      // trail
      matrixCtx.fillStyle = 'rgba(11, 15, 20, 0.10)'
      matrixCtx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      matrixCtx.fillStyle = '#00F3FF'
      matrixCtx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`

      // if resized, rebuild drops
      const desired = columns()
      if (drops.length !== desired) {
        drops = Array.from({ length: desired }, () => Math.random() * -100)
      }

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length))
        matrixCtx.fillText(text, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > window.innerHeight && Math.random() > 0.975) drops[i] = 0
        drops[i] += 1
      }
    }

    matrixIntervalId = window.setInterval(drawMatrix, 35)

    // Network particles
    const particleCount = 120
    const connectionDistance = 200
    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = Array.from(
      { length: particleCount },
      () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
      }),
    )

    function animateNetwork() {
      if (!networkCtx) return
      networkCtx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1

        networkCtx.beginPath()
        networkCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        networkCtx.fillStyle = '#00F3FF'
        networkCtx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectionDistance) {
            networkCtx.beginPath()
            networkCtx.moveTo(p.x, p.y)
            networkCtx.lineTo(q.x, q.y)
            networkCtx.strokeStyle = `rgba(0, 243, 255, ${(1 - dist / connectionDistance) * 0.5})`
            networkCtx.lineWidth = 0.5
            networkCtx.stroke()
          }
        }
      }

      rafId = window.requestAnimationFrame(animateNetwork)
    }

    rafId = window.requestAnimationFrame(animateNetwork)

    return () => {
      window.removeEventListener('resize', resize)
      if (matrixIntervalId) window.clearInterval(matrixIntervalId)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center font-mono text-gray-300 relative overflow-hidden px-3 sm:px-4">
      {/* Background Layer */}
      <div className="fixed inset-0 grid-bg -z-10" data-purpose="grid-overlay" />
      <canvas ref={matrixCanvasRef} className="matrix-canvas" aria-hidden />
      <canvas ref={networkCanvasRef} className="network-canvas" aria-hidden />
      <div className="fixed inset-0 bg-linear-to-b from-transparent via-[#0B0F14]/50 to-[#0B0F14] -z-10" />
      <div className="scanline" />

      {/* Decorative Terminal Text (static) */}
      <div
        className="fixed top-6 left-6 text-xs text-[#00F3FF]/40 select-none hidden md:block"
        data-purpose="decorative-terminal"
      >
        <div className="mb-1" dangerouslySetInnerHTML={{ __html: terminalHtml }} />
        <span className="cursor-block" />
      </div>

      {/* Login Container */}
      <section className="w-full max-w-md px-2 sm:px-4" data-purpose="login-form-container">
        <div className="glass-card login-glass-card p-6 sm:p-8 rounded-lg relative overflow-hidden">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00F3FF]/50" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00F3FF]/50" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00F3FF]/50" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00F3FF]/50" />

          {/* Header */}
          <header className="text-center mb-8 sm:mb-10" data-purpose="login-header">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#00F3FF] tracking-tighter mb-2 italic">
              Plasma AI
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-[#00F3FF]/60">
              Self Hosted AI Coding Agent
            </p>
          </header>

          {/* Form (reuses existing LoginForm behavior) */}
          <div data-purpose="auth-form">
            <LoginForm />
          </div>

          {/* Footer Info */}
          <footer className="mt-6 sm:mt-8 text-center" data-purpose="login-footer">
            <div className="inline-flex items-center gap-2 text-[10px] text-gray-500 font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-#00F3FF-500/50 animate-pulse" />
              Credentials verified against .env configuration
            </div>
          </footer>
        </div>

        {/* Decorative Bottom Text */}
        <div className="mt-4 sm:mt-6 text-[9px] sm:text-[10px] text-[#00F3FF]/20 flex flex-col sm:flex-row justify-between uppercase tracking-widest px-2 gap-2 sm:gap-0">
          <span>SECURE_ENCLAVE_V.2.4</span>
          <span>NODE_STATUS: READY</span>
        </div>
      </section>
    </main>
  )
}
