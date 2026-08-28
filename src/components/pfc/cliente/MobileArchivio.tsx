'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore, type FileItem } from '@/store/pfc'
import { ottieniIconaFile, canPreviewFile, formatDate } from '@/lib/pfc-utils'
import { toast } from 'sonner'
import {
  Search,
  FolderOpen,
  ChevronLeft,
  Download,
  Star,
  Eye,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderItem {
  nome: string
  [key: string]: unknown
}

export default function MobileArchivio() {
  const user = usePfcStore((s) => s.user)
  const annoSelezionato = usePfcStore((s) => s.annoSelezionato)
  const cartellaSelezionata = usePfcStore((s) => s.cartellaSelezionata)
  const setAnno = usePfcStore((s) => s.setAnno)
  const setCartella = usePfcStore((s) => s.setCartella)
  const setPreviewFile = usePfcStore((s) => s.setPreviewFile)

  const [anni, setAnni] = useState<string[]>([])
  const [cartelle, setCartelle] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<Record<string, unknown>>>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [preferitiSet, setPreferitiSet] = useState<Set<string>>(new Set())
  const [togglingFav, setTogglingFav] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const searchInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (!user) return
      if (showRefresh) setRefreshing(true)
      else setLoading(true)
      try {
        const res = await api.documenti.list({
          username: user.username,
          anno: annoSelezionato ?? undefined,
          cartella: cartellaSelezionata ?? undefined,
        })
        if (res.r2NotConfigured) {
          toast.error('Archivio non configurato')
          return
        }
        if (res.anni) setAnni(res.anni.sort((a, b) => b.localeCompare(a)))
        setCartelle((res.cartelle as FolderItem[]) ?? [])
        const fileList = ((res.files ?? []) as Array<Record<string, unknown>>).map((f) => ({
          nome: f.nome as string,
          key: f.key as string,
          size: f.size as number,
          sizeStr: f.sizeStr as string,
          lastModified: f.lastModified ? new Date(f.lastModified as string) : null,
          stato: (f.stato as FileItem['stato']) ?? 'visto',
          isPreferito: (f.isPreferito as boolean) ?? false,
        }))
        setFiles(fileList)
        setPreferitiSet(new Set(fileList.filter((f) => f.isPreferito).map((f) => f.key)))
        setPage(1)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Errore caricamento')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user, annoSelezionato, cartellaSelezionata]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleTogglePreferito(file: FileItem) {
    setTogglingFav(file.key)
    try {
      const res = await api.preferiti.toggle(file.key)
      setPreferitiSet((prev) => {
        const next = new Set(prev)
        if (res.isPreferito) next.add(file.key)
        else next.delete(file.key)
        return next
      })
      setFiles((prev) => prev.map((f) => (f.key === file.key ? { ...f, isPreferito: res.isPreferito } : f)))
    } catch {
      toast.error('Errore preferito')
    } finally {
      setTogglingFav(null)
    }
  }

  function handleDownload(file: FileItem) {
    setDownloading(file.key)
    const url = api.documenti.download(file.key)
    const a = document.createElement('a')
    a.href = url
    a.download = file.nome
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => setDownloading(null), 1500)
  }

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const res = await api.ricerca(query.trim(), user?.username)
      setSearchResults(res.results ?? [])
    } catch {
      toast.error('Errore ricerca')
    } finally {
      setSearching(false)
    }
  }

  function handleRefresh() {
    loadData(true)
  }

  // Search results view
  if (searchOpen) {
    return (
      <div className="px-3 pb-4">
        {/* Search header */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => {
              setSearchOpen(false)
              setSearchQuery('')
              setSearchResults([])
            }}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Chiudi ricerca"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca documenti..."
              autoFocus
              className={cn(
                'w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm',
                'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400'
              )}
            />
          </div>
        </div>

        {searching && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        )}

        {!searching && searchResults.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Nessun risultato per &ldquo;{searchQuery}&rdquo;
          </div>
        )}

        {!searching && searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium px-1">
              {searchResults.length} risultat{searchResults.length === 1 ? 'o' : 'i'}
            </p>
            {searchResults.map((r, i) => {
              const nome = r.nome as string
              const key = r.key as string
              const ic = ottieniIconaFile(nome)
              return (
                <div
                  key={key}
                  className="anim-file-enter flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-card"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span
                    className="file-ext-badge flex-shrink-0"
                    style={{ background: ic.bg, color: ic.fg }}
                  >
                    {ic.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{nome}</p>
                    <p className="text-xs text-slate-400 truncate">{r.cartella as string}</p>
                  </div>
                  <button
                    onClick={() => {
                      const url = api.documenti.download(key)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = nome
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    aria-label="Scarica"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Breadcrumb
  const showBack = cartellaSelezionata !== null

  return (
    <div className="px-3 pb-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        {showBack && (
          <button
            onClick={() => setCartella(null)}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Indietro"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={handleRefresh}
          className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors',
            refreshing && 'animate-spin'
          )}
          aria-label="Aggiorna"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => {
            setSearchOpen(true)
            setTimeout(() => searchInputRef.current?.focus(), 100)
          }}
          className="flex items-center justify-center w-11 h-11 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Cerca"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Year chips */}
      {cartellaSelezionata === null && anni.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-3 px-3 scrollbar-hide mb-2" style={{ scrollbarWidth: 'none' }}>
          {anni.map((a) => (
            <button
              key={a}
              onClick={() => setAnno(a)}
              className={cn(
                'flex-shrink-0 h-9 px-4 rounded-full text-sm font-semibold transition-all duration-200',
                annoSelezionato === a
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
              )}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !refreshing && cartelle.length === 0 && files.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Nessun documento trovato</p>
          <p className="text-xs mt-1">Seleziona un anno per iniziare</p>
        </div>
      )}

      {/* Folders grid */}
      {cartelle.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {cartelle.map((c, i) => (
            <button
              key={c.nome as string}
              onClick={() => setCartella(c.nome as string)}
              className="anim-folder-enter file-card flex flex-col items-center justify-center p-5 rounded-xl bg-white border border-slate-100 shadow-card text-center min-h-[88px] active:scale-[0.97] transition-transform"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <FolderOpen className="w-8 h-8 text-emerald-500 mb-2" />
              <span className="text-sm font-semibold text-slate-700 line-clamp-2">
                {c.nome as string}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Files list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-medium px-1">
            {files.length} document{files.length === 1 ? 'o' : 'i'}
            {cartellaSelezionata && ` in ${cartellaSelezionata}`}
          </p>
          {files.slice(0, page * pageSize).map((file, i) => {
            const ic = ottieniIconaFile(file.nome)
            const isFav = preferitiSet.has(file.key)
            return (
              <div
                key={file.key}
                className={cn(
                  'anim-file-enter file-card flex items-center gap-3 p-3 rounded-xl bg-white border shadow-card',
                  file.stato === 'nuovo' && 'file-card-nuovo border-red-100'
                )}
                style={{ animationDelay: `${i * 35}ms` }}
              >
                {/* Status dot */}
                <div className="flex-shrink-0">
                  {file.stato === 'nuovo' && <span className="status-dot-new" />}
                  {file.stato === 'visto' && <span className="status-dot-seen" />}
                  {file.stato === 'scaricato' && <span className="status-dot-downloaded" />}
                  {file.stato === 'preferito' && <span className="status-dot-downloaded" />}
                </div>

                {/* File type badge */}
                <span
                  className="file-ext-badge"
                  style={{ background: ic.bg, color: ic.fg }}
                >
                  {ic.icon}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.nome}</p>
                  <p className="text-xs text-slate-400">
                    {file.sizeStr}
                    {file.lastModified && ` · ${formatDate(file.lastModified)}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  {/* Favorite */}
                  <button
                    onClick={() => handleTogglePreferito(file)}
                    disabled={togglingFav === file.key}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      isFav
                        ? 'text-amber-500'
                        : 'text-slate-300 hover:text-amber-400'
                    )}
                    aria-label={isFav ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                  >
                    <Star
                      className={cn('w-4.5 h-4.5', isFav && 'fill-current star-animated')}
                    />
                  </button>

                  {/* Preview */}
                  {canPreviewFile(file.nome) && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      aria-label="Anteprima"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                  )}

                  {/* Download */}
                  <button
                    onClick={() => handleDownload(file)}
                    disabled={downloading === file.key}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    aria-label="Scarica"
                  >
                    {downloading === file.key ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : (
                      <Download className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {files.length > page * pageSize && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Mostra altri ({files.length - page * pageSize} rimanenti)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
