'use client'

import { useEffect, useState } from 'react'
import { getApiUrl, setApiUrl, api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { toast } from 'sonner'
import { Settings, X, Save, Wifi, WifiOff, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function SettingsScreen() {
  const settingsOpen = usePfcStore((s) => s.settingsOpen)
  const setSettingsOpen = usePfcStore((s) => s.setSettingsOpen)

  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)

  useEffect(() => {
    if (settingsOpen) {
      setUrl(getApiUrl())
      setSaved(false)
      setTestResult(null)
    }
  }, [settingsOpen])

  function handleSave() {
    const trimmed = url.trim().replace(/\/+$/, '')
    if (!trimmed) {
      toast.error('Inserisci un URL valido')
      return
    }
    setApiUrl(trimmed)
    setSaved(true)
    setTestResult(null)
    toast.success('URL salvato. Ricarica l\'app per applicare.')
  }

  async function handleTest() {
    if (!url.trim()) {
      toast.error('Inserisci un URL prima di testare')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      setApiUrl(url.trim().replace(/\/+$/, ''))
      await api.setup()
      setTestResult('ok')
      toast.success('Connessione riuscita!')
    } catch {
      setTestResult('fail')
      toast.error('Impossibile connettersi al server')
    } finally {
      setTesting(false)
    }
  }

  if (!settingsOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm anim-fade-in"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Panel */}
      <div className="relative mt-auto max-h-[80vh] flex flex-col bg-white rounded-t-3xl shadow-2xl anim-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            Impostazioni
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {/* Backend URL */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                URL Backend Server
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setSaved(false)
                  setTestResult(null)
                }}
                placeholder="https://esempio.pfc.it"
                className={cn(
                  'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900',
                  'placeholder:text-slate-400',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400'
                )}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                L&apos;indirizzo del server PFC a cui connettersi
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!url.trim()}
                className={cn(
                  'flex-1 h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2',
                  'bg-gradient-to-r from-emerald-600 to-emerald-500',
                  'shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all',
                  'disabled:opacity-50 disabled:active:scale-100'
                )}
              >
                <Save className="w-4 h-4" />
                Salva
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !url.trim()}
                className={cn(
                  'h-12 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                  'border border-slate-200 text-slate-700 hover:bg-slate-50',
                  'active:scale-[0.98] disabled:opacity-50'
                )}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : testResult === 'ok' ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : testResult === 'fail' ? (
                  <WifiOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                {testing ? 'Test...' : 'Testa'}
              </button>
            </div>

            {testResult === 'ok' && (
              <p className="text-sm text-emerald-600 font-medium anim-fade-in flex items-center gap-1.5">
                <Wifi className="w-4 h-4" />
                Connessione riuscita
              </p>
            )}
            {testResult === 'fail' && (
              <p className="text-sm text-red-500 font-medium anim-fade-in flex items-center gap-1.5">
                <WifiOff className="w-4 h-4" />
                Impossibile connettersi
              </p>
            )}

            {/* App info */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Informazioni</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">App:</span> Portale PFC Mobile
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Versione:</span> 1.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
