'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { formatDate } from '@/lib/pfc-utils'
import { toast } from 'sonner'
import {
  MessageSquare,
  Archive,
  Upload,
  CheckCheck,
  Undo2,
  Loader2,
  RefreshCw,
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Messaggio {
  id: string
  titolo: string
  corpo: string
  dataInvio: string
  letto: boolean
  archiviato: boolean
  richiedeUpload: boolean
  uploadDescrizione?: string
  haRisposta: boolean
  allegatoNome?: string
}

type MessaggioTab = 'attivi' | 'archiviati'

export default function MobileMessaggi() {
  const user = usePfcStore((s) => s.user)
  const [tab, setTab] = useState<MessaggioTab>('attivi')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadMessaggi = useCallback(async (showRefresh = false) => {
    if (!user) return
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.messaggi.list(user.username)
      setMessaggi((res.messaggi as unknown as Messaggio[]) ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore caricamento messaggi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    loadMessaggi()
  }, [loadMessaggi])

  const attivi = messaggi.filter((m) => !m.archiviato)
  const archiviati = messaggi.filter((m) => m.archiviato)
  const displayList = tab === 'attivi' ? attivi : archiviati
  const unreadCount = attivi.filter((m) => !m.letto).length

  async function handleSegnaLetti() {
    try {
      await api.messaggi.segnaLetti()
      setMessaggi((prev) => prev.map((m) => ({ ...m, letto: true })))
      toast.success('Tutti contrassegnati come letti')
    } catch {
      toast.error('Errore')
    }
  }

  async function handleArchivia(id: string) {
    try {
      await api.messaggi.archivia(id)
      setMessaggi((prev) => prev.map((m) => (m.id === id ? { ...m, archiviato: true } : m)))
      toast.success('Messaggio archiviato')
    } catch {
      toast.error('Errore')
    }
  }

  async function handleDearchivia(id: string) {
    try {
      await api.messaggi.dearchivia(id)
      setMessaggi((prev) => prev.map((m) => (m.id === id ? { ...m, archiviato: false } : m)))
      toast.success('Messaggio ripristinato')
    } catch {
      toast.error('Errore')
    }
  }

  async function handleUpload(id: string, file: File) {
    setUploadingId(id)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('messaggioId', id)
      await api.risposte.upload(fd)
      toast.success('File inviato con successo')
      setMessaggi((prev) => prev.map((m) => (m.id === id ? { ...m, haRisposta: true } : m)))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore upload')
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="px-3 pb-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => loadMessaggi(true)}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors',
            refreshing && 'animate-spin'
          )}
          aria-label="Aggiorna"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        {unreadCount > 0 && tab === 'attivi' && (
          <button
            onClick={handleSegnaLetti}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Segna tutti letti
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 mb-4">
        <button
          onClick={() => setTab('attivi')}
          className={cn(
            'flex-1 h-10 rounded-lg text-sm font-semibold transition-all duration-200',
            tab === 'attivi'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Attivi{unreadCount > 0 && ` (${unreadCount})`}
        </button>
        <button
          onClick={() => setTab('archiviati')}
          className={cn(
            'flex-1 h-10 rounded-lg text-sm font-semibold transition-all duration-200',
            tab === 'archiviati'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Archiviati{archiviati.length > 0 && ` (${archiviati.length})`}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && displayList.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {tab === 'attivi' ? 'Nessun messaggio' : 'Nessun messaggio archiviato'}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2">
        {displayList.map((msg, i) => (
          <div
            key={msg.id}
            className={cn(
              'anim-file-enter rounded-xl border bg-white shadow-card transition-all',
              !msg.letto && 'border-emerald-200 bg-emerald-50/40',
              msg.letto && 'border-slate-100',
              expandedId === msg.id && 'ring-1 ring-emerald-200'
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <button
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                    !msg.letto ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!msg.letto && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                    <p className={cn('text-sm truncate', !msg.letto ? 'font-bold text-slate-900' : 'font-medium text-slate-700')}>
                      {msg.titolo}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(msg.dataInvio)}
                  </p>
                  {msg.richiedeUpload && !msg.haRisposta && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Upload className="w-3 h-3" />
                      Richiede upload
                    </span>
                  )}
                  {msg.haRisposta && (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCheck className="w-3 h-3" />
                      Risposto
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {expandedId === msg.id && (
              <div className="px-4 pb-4 anim-fade-in">
                <div className="pl-[52px]">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {msg.corpo}
                  </p>

                  {msg.allegatoNome && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-600 truncate">{msg.allegatoNome}</span>
                    </div>
                  )}

                  {/* Upload for richiedeUpload */}
                  {msg.richiedeUpload && !msg.haRisposta && (
                    <div className="mt-3">
                      {msg.uploadDescrizione && (
                        <p className="text-xs text-slate-500 mb-2">{msg.uploadDescrizione}</p>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[msg.id] = el }}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleUpload(msg.id, f)
                          e.target.value = ''
                        }}
                      />
                      <button
                        onClick={() => fileInputRefs.current[msg.id]?.click()}
                        disabled={uploadingId === msg.id}
                        className={cn(
                          'flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-semibold transition-all',
                          'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white',
                          'shadow-md shadow-emerald-500/20 active:scale-[0.98]',
                          'disabled:opacity-60'
                        )}
                      >
                        {uploadingId === msg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {uploadingId === msg.id ? 'Invio...' : 'Carica file'}
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {tab === 'attivi' ? (
                      <button
                        onClick={() => handleArchivia(msg.id)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archivia
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDearchivia(msg.id)}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Ripristina
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
