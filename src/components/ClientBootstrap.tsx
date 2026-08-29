'use client'
import { useEffect } from 'react'
import { initPushChannels, setupPushListeners } from '@/lib/push'

export default function ClientBootstrap() {
  useEffect(() => {
    // 1. Canali sempre pronti
    void initPushChannels()
    
    // 2. Listener sempre attivi (anche se non loggati)
    setupPushListeners((url) => {
        if (url && url !== '/') {
          window.location.href = url
        }
    })
  }, [])
  return null
}
