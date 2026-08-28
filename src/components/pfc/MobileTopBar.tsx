'use client'

import { api } from '@/lib/api-client'
import { usePfcStore } from '@/store/pfc'
import { getInitials } from '@/lib/pfc-utils'
import { Bell, LogOut } from 'lucide-react'
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
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 glass-card border-b border-white/40">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
          <span className="text-white font-extrabold text-sm tracking-tight">PF</span>
        </div>
        <span className="font-bold text-slate-800 text-base">Portale PFC</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowNotifPanel(true)}
          className="relative flex items-center justify-center w-11 h-11 -mr-1 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
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
              className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm ml-0.5 active:scale-95 transition-transform"
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