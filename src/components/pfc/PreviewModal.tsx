'use client'

import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { ottieniIconaFile } from '@/lib/pfc-utils'
import { X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PreviewModal() {
  const previewFile = usePfcStore((s) => s.previewFile)
  const setPreviewFile = usePfcStore((s) => s.setPreviewFile)

  if (!previewFile) return null

  const ext = previewFile.nome.split('.').pop()?.toLowerCase() ?? ''
  const isPdf = ext === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext)
  const ic = ottieniIconaFile(previewFile.nome)
  const downloadUrl = api.documenti.download(previewFile.key)

  function handleDownload() {
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = previewFile.nome
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm anim-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 bg-black/40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="file-ext-badge flex-shrink-0"
            style={{ background: ic.bg, color: ic.fg }}
          >
            {ic.icon}
          </span>
          <p className="text-sm font-medium text-white truncate">{previewFile.nome}</p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Scarica"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPreviewFile(null)}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-white/80 hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white mx-2 mb-2 rounded-2xl overflow-hidden">
        {isPdf && (
          <iframe
            src={downloadUrl}
            className="w-full h-full border-0"
            title={`Anteprima: ${previewFile.nome}`}
          />
        )}
        {isImage && (
          <div className="w-full h-full flex items-center justify-center p-4 bg-slate-50">
            <img
              src={downloadUrl}
              alt={previewFile.nome}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
        {!isPdf && !isImage && (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6">
            <span
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4"
              style={{ background: ic.bg, color: ic.fg }}
            >
              {ic.icon}
            </span>
            <p className="text-sm font-medium text-slate-600">Anteprima non disponibile</p>
            <p className="text-xs text-slate-400 mt-1">Scarica il file per visualizzarlo</p>
            <button
              onClick={handleDownload}
              className={cn(
                'mt-4 h-11 px-6 rounded-xl font-semibold text-white text-sm',
                'bg-gradient-to-r from-emerald-600 to-emerald-500',
                'shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all',
                'flex items-center gap-2'
              )}
            >
              <Download className="w-4 h-4" />
              Scarica file
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
