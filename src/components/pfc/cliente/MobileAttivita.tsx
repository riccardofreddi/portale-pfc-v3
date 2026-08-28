'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { formatDateAudit } from '@/lib/pfc-utils'
import { toast } from 'sonner'
import {
  ClipboardList,
  RefreshCw,
  Download,
  Upload,
  LogIn,
  LogOut,
  Eye,
  Star,
  MessageSquare,
  FileText,
  Shield,
  Search,
  Trash2,
  Pencil,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  ts: string
  action: string
  detail: string
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  DOWNLOAD_DOC: { label: 'Download documento', icon: Download, color: '#059669' },
  UPLOAD_CASSETTO: { label: 'Upload cassetto', icon: Upload, color: '#0284c7' },
  LOGIN_SUCCESS: { label: 'Accesso effettuato', icon: LogIn, color: '#059669' },
  LOGIN_FAIL: { label: 'Tentativo di accesso', icon: Shield, color: '#dc2626' },
  LOGOUT: { label: 'Disconnessione', icon: LogOut, color: '#64748b' },
  PREVIEW_DOC: { label: 'Anteprima documento', icon: Eye, color: '#7c3aed' },
  TOGGLE_PREFERITO: { label: 'Preferito aggiornato', icon: Star, color: '#d97706' },
  UPLOAD_RISPOSTA: { label: 'Risposta inviata', icon: MessageSquare, color: '#0284c7' },
  ARCHIVIA_MESSAGGIO: { label: 'Messaggio archiviato', icon: FileText, color: '#64748b' },
  DEARCHIVIA_MESSAGGIO: { label: 'Messaggio ripristinato', icon: FileText, color: '#64748b' },
  SEGNA_LETTI: { label: 'Messaggi letti', icon: Eye, color: '#059669' },
  DELETE_CASSETTO: { label: 'Eliminazione cassetto', icon: Trash2, color: '#dc2626' },
  RENAME_CASSETTO: { label: 'Rinominato cassetto', icon: Pencil, color: '#d97706' },
  RICERCA: { label: 'Ricerca effettuata', icon: Search, color: '#64748b' },
  NOTIFICA_LETTA: { label: 'Notifica letta', icon: Bell, color: '#059669' },
}

const PAGE_SIZE = 30

export default function MobileAttivita() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const loadLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const limit = page * PAGE_SIZE
      const res = await api.audit.meList(limit)
      const entries = res.logs ?? []
      setLogs(entries)
      setHasMore(entries.length === limit)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore caricamento')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [page])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  function getConfig(action: string) {
    return ACTION_CONFIG[action] ?? { label: action, icon: FileText, color: '#64748b' }
  }

  return (
    <div className="px-3 pb-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-500" />
          Registro Attività
        </h2>
        <button
          onClick={() => loadLogs(true)}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors',
            refreshing && 'animate-spin'
          )}
          aria-label="Aggiorna"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && logs.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nessuna attività registrata</p>
        </div>
      )}

      {/* Audit entries */}
      <div className="space-y-2">
        {logs.map((entry, i) => {
          const cfg = getConfig(entry.action)
          const IconComp = cfg.icon
          return (
            <div
              key={entry.id}
              className="anim-file-enter flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-card"
              style={{
                animationDelay: `${i * 30}ms`,
                borderLeftWidth: '3px',
                borderLeftColor: cfg.color,
              }}
            >
              <div
                className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
                style={{ background: `${cfg.color}15`, color: cfg.color }}
              >
                <IconComp className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{cfg.label}</p>
                {entry.detail && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{entry.detail}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">{formatDateAudit(entry.ts)}</p>
              </div>
            </div>
          )
        })}

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Carica altre attività
          </button>
        )}
      </div>
    </div>
  )
}
