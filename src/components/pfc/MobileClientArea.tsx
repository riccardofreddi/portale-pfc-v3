'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api-client'
import { usePfcStore, type ClienteTab } from '@/store/pfc'
import LoginScreen from '@/components/pfc/LoginScreen'
import MobileTopBar from '@/components/pfc/MobileTopBar'
import MobileArchivio from '@/components/pfc/cliente/MobileArchivio'
import MobileMessaggi from '@/components/pfc/cliente/MobileMessaggi'
import MobileCassetto from '@/components/pfc/cliente/MobileCassetto'
import MobileAttivita from '@/components/pfc/cliente/MobileAttivita'
import MobileNotifiche from '@/components/pfc/MobileNotifiche'
import PreviewModal from '@/components/pfc/PreviewModal'
import SettingsScreen from '@/components/pfc/SettingsScreen'
import { FolderOpen, MessageSquare, Briefcase, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setupPushListeners, registerPushForCurrentUser } from '@/lib/push'

const TABS: { id: ClienteTab; label: string; icon: React.ElementType }[] = [
  { id: 'archivio', label: 'Archivio', icon: FolderOpen },
  { id: 'messaggi', label: 'Messaggi', icon: MessageSquare },
  { id: 'cassetto', label: 'Cassetto', icon: Briefcase },
  { id: 'attivita', label: 'Attività', icon: ClipboardList },
]

export default function MobileClientArea() {
  const user = usePfcStore((s) => s.user)
  const loadingUser = usePfcStore((s) => s.loadingUser)
  const setUser = usePfcStore((s) => s.setUser)
  const setLoadingUser = usePfcStore((s) => s.setLoadingUser)
  const clienteTab = usePfcStore((s) => s.clienteTab)
  const setClienteTab = usePfcStore((s) => s.setClienteTab)
  const setNNotifiche = usePfcStore((s) => s.setNNotifiche)

  // Listener push nativi (FCM) — solo su device nativo (Android/iOS).
  // Van montati PRIMA di registerPushForCurrentUser: il token generato da
  // register() viene intercettato dall'evento 'registration' che attachiamo qui.
  useEffect(() => {
    setupPushListeners((url) => {
      // Tap su notifica: vai alla schermata Notifiche (o all'url se presente).
      if (url && url !== '/') {
        window.location.href = url
      } else {
        setClienteTab('attivita')
      }
    })
  }, [setClienteTab])

  // Check auth on mount — e se la sessione è già valida (cookie persistente)
  // registra subito il token FCM: senza questo passo, dopo un aggiornamento
  // dell'APK che preserva il cookie, il token non verrebbe mai inviato al backend.
  useEffect(() => {
    async function check() {
      // Registra sempre il device alle push FCM, anche se l'utente non è ancora loggato.
      // Il token verrà inviato al backend e, al momento del login, l'app lo assocerà all'utente.
      void registerPushForCurrentUser()
      
      try {
        const res = await api.auth.me()
        if (res.user && res.user.role === 'client') {
          setUser(res.user)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setLoadingUser(false)
      }
    }
    check()
  }, [setUser, setLoadingUser])

  // Poll notifications
  useEffect(() => {
    if (!user) return
    let interval: ReturnType<typeof setInterval>
    async function fetchNotifiche() {
      try {
        const res = await api.notifiche.list()
        const list = res.notifiche ?? []
        setNNotifiche(list.filter((n: Record<string, unknown>) => !(n.letta as boolean)).length)
      } catch {
        // silent
      }
    }
    fetchNotifiche()
    interval = setInterval(fetchNotifiche, 30000)
    return () => clearInterval(interval)
  }, [user, setNNotifiche])

  // Loading / not logged in
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center animate-pulse">
          <span className="text-white font-extrabold text-sm">PF</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <LoginScreen />
      </>
    )
  }

  function renderTabContent() {
    switch (clienteTab) {
      case 'archivio': return <MobileArchivio />
      case 'messaggi': return <MobileMessaggi />
      case 'cassetto': return <MobileCassetto />
      case 'attivita': return <MobileAttivita />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MobileTopBar />

      {/* Content area */}
      <main className="flex-1 pt-3 pb-20 overflow-y-auto">
        {renderTabContent()}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-card border-t border-white/40 safe-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {TABS.map((tab) => {
            const isActive = clienteTab === tab.id
            const IconComp = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setClienteTab(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200',
                  isActive ? 'text-emerald-600' : 'text-slate-400 active:text-slate-600'
                )}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300',
                    isActive
                      ? 'bg-emerald-100 shadow-sm'
                      : 'bg-transparent'
                  )}
                >
                  <IconComp className={cn('w-5 h-5 transition-transform duration-300', isActive && 'scale-110')} />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold transition-all',
                  isActive ? 'text-emerald-700' : 'text-slate-400'
                )}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-500" />
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Overlays */}
      <MobileNotifiche />
      <SettingsScreen />
      <PreviewModal />
    </div>
  )
}
