'use client'

import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { getInitials } from '@/lib/pfc-utils'
import { Bell, LogOut, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export default function MobileTopBar() {
  const user = usePfcStore((s) => s.user)
  const nNotifiche = usePfcStore((s) => s.nNotifiche)
  const setShowNotifPanel = usePfcStore((s) => s.setShowNotifPanel)
  const setSettingsOpen = usePfcStore((s) => s.setSettingsOpen)
  const setUser = usePfcStore((s) => s.setUser)

  async function handleLogout() {
    try {
      await api.auth.logout()
    } catch {
      // ignore
    }
    setUser(null)
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 safe-top bg-emerald-600 text-white shadow-md border-b border-emerald-700/40">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shadow-sm">
          <span className="text-white font-extrabold text-sm tracking-tight">PF</span>
        </div>
        <span className="font-bold text-white text-base">Portale PFC</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowNotifPanel(true)}
          className="relative flex items-center justify-center w-11 h-11 -mr-1 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Notifiche"
        >
          <Bell className="w-5 h-5" />
          {nNotifiche > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1 shadow-sm">
              {nNotifiche > 99 ? '99+' : nNotifiche}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white font-bold text-sm ml-0.5 active:scale-95 transition-transform"
              aria-label="Menu utente"
            >
              {user ? getInitials(user.name) : '?'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">@{user?.username}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setSettingsOpen(true)}
              className="cursor-pointer"
            >
              <Settings className="w-4 h-4 mr-2" />
              Impostazioni
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Esci
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}