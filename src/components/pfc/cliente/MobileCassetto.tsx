'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore, type FileItem } from '@/store/pfc'
import { ottieniIconaFile, canPreviewFile, formatDate, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '@/lib/pfc-utils'
import { toast } from 'sonner'
import {
  Briefcase,
  Plus,
  Download,
  Eye,
  Trash2,
  Pencil,
  Loader2,
  RefreshCw,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const TIPI_FILE = [
  { value: 'QR Code P.IVA', color: '#059669' },
  { value: 'Certificato P.IVA', color: '#0284c7' },
  { value: 'Visura Camerale', color: '#7c3aed' },
  { value: 'Doc. Identita', color: '#dc2626' },
  { value: 'IBAN', color: '#d97706' },
] as const

interface CassettoFile {
  nome: string
  key: string
  size: number
  sizeStr: string
  lastModified: Date | null
}

export default function MobileCassetto() {
  const setPreviewFile = usePfcStore((s) => s.setPreviewFile)

  const [files, setFiles] = useState<CassettoFile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<CassettoFile | null>(null)
  const [renaming, setRenaming] = useState<CassettoFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamingLoading, setRenamingLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.cassetto.list()
      setFiles(res.files ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore caricamento')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedTipo) return
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File troppo grande (max ${MAX_FILE_SIZE_MB}MB)`)
      return
    }
    uploadFile(file)
    e.target.value = ''
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('tipo', selectedTipo!)
      await api.cassetto.upload(fd)
      toast.success('File caricato con successo')
      setUploadDialogOpen(false)
      setSelectedTipo(null)
      loadFiles(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore upload')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.cassetto.delete(deleting.key)
      toast.success('File eliminato')
      setFiles((prev) => prev.filter((f) => f.key !== deleting.key))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setDeleting(null)
    }
  }

  async function handleRename() {
    if (!renaming || !renameValue.trim()) return
    setRenamingLoading(true)
    try {
      await api.cassetto.rename(renaming.key, renameValue.trim())
      toast.success('File rinominato')
      setFiles((prev) =>
        prev.map((f) =>
          f.key === renaming.key ? { ...f, nome: renameValue.trim(), key: renaming.key.replace(renaming.nome, renameValue.trim()) } : f
        )
      )
      setRenaming(null)
      setRenameValue('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore')
    } finally {
      setRenamingLoading(false)
    }
  }

  function getAccentColor(nome: string): string {
    const tipo = TIPI_FILE.find((t) => nome.includes(t.value))
    return tipo?.color ?? '#64748b'
  }

  return (
    <div className="pb-4">
      {/* Hero Header */}
      <div className="mx-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5 mb-4 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-5 h-5 text-white/90" />
              <h2 className="text-lg font-bold text-white">Cassetto Personale</h2>
            </div>
            <p className="text-sm text-white/75">
              {files.length} document{files.length === 1 ? 'o' : 'i'} salvat{files.length === 1 ? 'o' : 'i'}
            </p>
          </div>
          <button
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm text-white active:scale-95 transition-transform"
            aria-label="Carica documento"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Refresh */}
      <div className="px-3 mb-3">
        <button
          onClick={() => loadFiles(true)}
          className={cn(
            'flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors',
            refreshing && 'animate-spin'
          )}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-3 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && files.length === 0 && (
        <div className="text-center py-16 text-slate-400 px-3">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Cassetto vuoto</p>
          <p className="text-xs mt-1">Tocca + per caricare un documento</p>
        </div>
      )}

      {/* File cards */}
      <div className="px-3 space-y-2">
        {files.map((file, i) => {
          const ic = ottieniIconaFile(file.nome)
          const accent = getAccentColor(file.nome)
          return (
            <div
              key={file.key}
              className="anim-file-enter flex rounded-xl bg-white border border-slate-100 shadow-card overflow-hidden"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Color accent bar */}
              <div className="w-1.5 flex-shrink-0" style={{ background: accent }} />

              <div className="flex-1 flex items-center gap-3 p-3">
                <span
                  className="file-ext-badge flex-shrink-0"
                  style={{ background: ic.bg, color: ic.fg }}
                >
                  {ic.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.nome}</p>
                  <p className="text-xs text-slate-400">
                    {file.sizeStr}
                    {file.lastModified && ` · ${formatDate(file.lastModified)}`}
                  </p>
                </div>

                <div className="flex items-center gap-0.5">
                  {canPreviewFile(file.nome) && (
                    <button
                      onClick={() => setPreviewFile({
                        nome: file.nome,
                        key: file.key,
                        size: file.size,
                        sizeStr: file.sizeStr,
                        lastModified: file.lastModified,
                        stato: 'visto',
                        isPreferito: false,
                      })}
                      className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                      aria-label="Anteprima"
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const url = api.documenti.download(file.key)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = file.nome
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                    aria-label="Scarica"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>

                  <button
                    onClick={() => {
                      setRenaming(file)
                      setRenameValue(file.nome)
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Rinomina"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleting(file)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Carica documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-slate-500">Seleziona il tipo di documento:</p>

            <div className="space-y-2">
              {TIPI_FILE.map((tipo) => (
                <button
                  key={tipo.value}
                  onClick={() => setSelectedTipo(tipo.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all',
                    selectedTipo === tipo.value
                      ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <div
                    className="w-3 h-8 rounded-full flex-shrink-0"
                    style={{ background: tipo.color }}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      selectedTipo === tipo.value ? 'text-emerald-800' : 'text-slate-700'
                    )}
                  >
                    {tipo.value}
                  </span>
                  {selectedTipo === tipo.value && (
                    <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            {selectedTipo && (
              <div className="anim-fade-in">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef?.current?.click()}
                  disabled={uploading}
                  className={cn(
                    'w-full h-12 rounded-xl font-semibold text-white text-sm',
                    'bg-gradient-to-r from-emerald-600 to-emerald-500',
                    'shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Caricamento...
                    </>
                  ) : (
                    'Scegli file'
                  )}
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina documento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare &ldquo;{deleting?.nome}&rdquo;? L&apos;azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rinomina documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className={cn(
                'w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400'
              )}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRenaming(null)}
                className="h-10 px-4 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleRename}
                disabled={renamingLoading || !renameValue.trim()}
                className={cn(
                  'h-10 px-5 rounded-xl text-sm font-semibold text-white',
                  'bg-gradient-to-r from-emerald-600 to-emerald-500',
                  'shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all',
                  'disabled:opacity-60'
                )}
              >
                {renamingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
