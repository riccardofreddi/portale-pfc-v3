'use client'
import { useEffect } from 'react'
import { initPushChannels } from '@/lib/push'

export default function ClientBootstrap() {
  useEffect(() => {
    void initPushChannels()
  }, [])
  return null
}
