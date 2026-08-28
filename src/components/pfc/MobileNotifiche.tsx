'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { formatDate } from '@/lib/pfc-utils'
import { toast } from 'sonner'
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  FileText,
  MessageSquare,
  AlertTriangle,
  Upload,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notifica {
  id: string
  tipo: string
  titolo: string
  corpo?: string
  letta: boolean
  dataCreazione: string
  [key: string]: unknown
}

const NOTIF_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  documento_nuovo: { icon: FileText, color: '#059669', bg: '#ecfdf5' },
  messaggio: { icon: MessageSquare, color: '#0284c7', bg: '#eff6ff' },
  avviso: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
  richiesta_upload: { icon: Upload, color: '#7c3aed', bg: '#f5f3ff' },
  scadenza: { icon: Clock, color: '#dc2626', bg: '#fef2f2' },
}

export default function MobileNotifiche() {
  const showNotifPanel = usePfcStore((s) => s.showNotifPanel)
  const setShowNotifPanel = usePfcStore((s) => s.setShowNotifPanel)
  const setNNotifiche = usePfcStore((s) => s.setNNotifiche)

  const [notifiche, setNotifiche] = useState<Notifica[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifiche = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.notifiche.list()
      const list = (res.notifiche as unknown as Notifica[]) ?? []
      setNotifiche(list)
      setNNotifiche(list.filter((n) => !n.letta).length)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [setNNotifiche])

  useEffect(() => {
    if (showNotifPanel) loadNotifiche()
  }, [showNotifPanel, loadNotifiche])

  async function handleSegnaLetta(id: string) {
 try {
      await api.notifiche.segnaLetta(id)
      setNotifiche((prev) => prev.map((n) => (n.id === id ? { ...n, letta: true } : n)))
      setNNotifiche((prev) => Math.max(0, prev - 1))
    } catch {
      toast.error('Errore')
    }
  }

  async function handleSegnaLette() {
    try {
      await api.notifiche.segnaLette()
      setNotifiche((prev) => prev.map((n) => ({ ...n, letta: true })))
      setNNotifiche(0)
      toast.success('Tutte lette')
    } catch {
      toast.error('Errore')
    }
  }

  async function handlePulisciLette() {
    try {
      await api.notifiche.pulisciLette()
      setNotifiche((prev) => prev.filter((n) => !n.letta))
      toast.success('Notifiche lette eliminate')
    } catch {
      toast.error('Errore')
    }
  }

  if (!showNotifPanel) return null

  const nonLette = notifiche.filter((n) => !n.letta)

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm anim-fade-in"
        onClick={() => setShowNotifPanel(false)}
      />

      {/* Panel */}
      <div className="relative mt-auto max-h-[85vh] flex flex-col bg-white rounded-t-3xl shadow-2xl anim-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-500" />
            Notifiche
            {nonLette.length > 0 && (
              <span className="ml-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                {nonLette.length} nuove
              </span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {nonLette.length > 0 && (
              <button
                onClick={handleSegnaLette}
                className="flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tutte
              </button>
            )}
            <button
              onClick={() => setShowNotifPanel(false)}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
            </div>
          )}

          {!loading && notifiche.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Nessuna notifica</p>
            </div>
          )}

          <div className="space-y-2">
            {notifiche.map((n, i) => {
              const cfg = NOTIF_CONFIG[n.tipo] ?? { icon: Bell, color: '#64748b', bg: '#f8fafc' }
              const IconComp = cfg.icon
              return (
                <div
                  key={n.id}
                  className={cn(
                    'anim-file-enter flex items-start gap-3 p-3 rounded-xl border transition-all',
                    !n.letta
                      ? 'bg-white border-slate-100 shadow-card'
                      : 'bg-slate-50/50 border-slate-100'
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {!n.letta && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                      <p className={cn('text-sm', !n.letta ? 'font-semibold text-slate-900' : 'font-medium text-slate-600')}>
                        {n.titolo}
                      </p>
                    </div>
                    {n.corpo && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 pl-4">{n.corpo}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1 pl-4">{formatDate(n.dataCreazione)}</p>
                  </div>
                  {!n.letta && (
                    <button
                      onClick={() => handleSegnaLetta(n.id)}
                      className="flex-shrink-0 p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                      aria-label="Segna come letta"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Clear read */}
          {notifiche.some((n) => n.letta) && (
            <button
              onClick={handlePulisciLette}
              className="flex items-center justify-center gap-2 w-full mt-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Elimina notifiche lette
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
