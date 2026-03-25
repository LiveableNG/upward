'use client'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export default function Home() {
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)

  if (!mounted) return null

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-between bg-background p-8 safe-area-inset-top safe-area-inset-bottom overflow-hidden relative">
      {/* Glow effects */}
      <div
        className="absolute -top-[20%] -right-[20%] w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, var(--glow-1) 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-[20%] -left-[20%] w-[300px] h-[300px] rounded-full blur-[100px] pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, var(--glow-2) 0%, transparent 70%)' }}
      />

      <div className="z-10 w-full flex flex-col items-center gap-12 mt-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4V20M12 4L8 8M12 4L16 8"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mt-4">Upward Pay</h1>
          <p className="text-muted text-sm uppercase tracking-widest font-medium">For Tenants</p>
        </div>

        <div className="text-center flex flex-col gap-4 max-w-[280px]">
          <h2 className="text-3xl font-extrabold leading-tight">Pay rent. Grow your future.</h2>
          <p className="text-muted text-base">
            The smartest way to manage your home payments and build your credit score.
          </p>
        </div>
      </div>

      <div className="z-10 w-full flex flex-col gap-4 mb-8">
        <button className="w-full bg-accent text-white font-bold h-14 rounded-2xl shadow-xl shadow-accent/10 active:scale-[0.98] transition-all">
          Get Started
        </button>
        <button className="w-full bg-surface border border-border text-foreground font-semibold h-14 rounded-2xl active:scale-[0.98] transition-all">
          Sign In
        </button>
        <p className="text-center text-xs text-muted mt-2">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>

      <style jsx>{`
        .animate-in {
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  )
}
