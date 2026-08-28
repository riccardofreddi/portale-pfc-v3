'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginScreen() {
  const setUser = usePfcStore((s) => s.setUser)
  const setLoadingUser = usePfcStore((s) => s.setLoadingUser)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.error('Inserisci username e password')
      return
    }
    setLoading(true)
    try {
      const res = await api.auth.login(username.trim(), password.trim())
      if (res.ok) {
        const me = await api.auth.me()
        if (me.user && me.user.role === 'client') {
          setUser(me.user)
          toast.success('Benvenuto!')
        } else {
          toast.error('Accesso riservato ai clienti')
          await api.auth.logout()
        }
      } else {
        toast.error(res.error || 'Credenziali non valide')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore di connessione'
      toast.error(message)
    } finally {
      setLoading(false)
      setLoadingUser(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <div className="w-full max-w-sm">
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <span className="text-white font-extrabold text-2xl tracking-tight">PF</span>
            </div>
          </div>

          <h1 className="text-xl font-bold text-center text-slate-800 mb-1">Portale PFC</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Accedi al tuo spazio documentale</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Il tuo username"
                className={cn(
                  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-base',
                  'placeholder:text-slate-400 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="La tua password"
                  className={cn(
                    'w-full h-12 px-4 pr-12 rounded-xl border border-slate-200 bg-white text-slate-900 text-base',
                    'placeholder:text-slate-400 transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-12 rounded-xl font-semibold text-white text-base',
                'bg-gradient-to-r from-emerald-600 to-emerald-500',
                'hover:from-emerald-700 hover:to-emerald-600',
                'active:scale-[0.98] transition-all duration-200',
                'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
                'flex items-center justify-center gap-2'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Accesso...</span>
                </>
              ) : (
                <span>Accedi</span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          Studio commerciale PFC — Portale riservato
        </p>
      </div>
    </div>
  )
}
