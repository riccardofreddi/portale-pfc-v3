'use client'

import { useState } from 'react'
import { usePfcStore } from '@/store/pfc'
import { X, Info, BellRing } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

export default function SettingsScreen() {
  const settingsOpen = usePfcStore((s) => s.settingsOpen)
  const setSettingsOpen = usePfcStore((s) => s.setSettingsOpen)
  const [testing, setTesting] = useState(false)

  if (!settingsOpen) return null

  async function sendTestPush() {
    setTesting(true)
    try {
      const res = (await api.push.fcmTest()) as { ok: boolean; msg?: string }
      if (res.ok) {
        toast.success('Notifica di test inviata! Controlla il telefono.')
      } else {
        toast.error(res.msg ?? 'Invio fallito.')
      }
    } catch (err) {
      toast.error('Errore durante il test delle notifiche.')
      console.error('[SETTINGS] test push fallito:', err)
    } finally {
      setTesting(false)
    }
  }

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
            <Info className="w-5 h-5 text-emerald-500" />
            Informazioni
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
          <div className="space-y-4">
            {/* App info */}
            <div className="mt-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
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

            <p className="text-xs text-slate-400 leading-relaxed">
              Per qualsiasi necessità di configurazione, contatta lo studio. L&apos;app è già
              collegata al server del portale.
            </p>

              {/* Test notifiche push */}
              <button
                onClick={sendTestPush}
                disabled={testing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-sm hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <BellRing className="w-4 h-4" />
                {testing ? 'Invio in corso…' : 'Invia notifica di test'}
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed -mt-2">
                Invia una notifica FCM di prova al tuo telefono per verificare che le push
                funzionino. Devi aver effettuato il login con l&apos;app installata.
              </p>

          </div>
        </div>
      </div>
    </div>
  )
}