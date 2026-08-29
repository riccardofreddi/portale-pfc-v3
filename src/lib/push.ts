/**
 * Portale PFC v3 — registrazione notifiche push native (FCM via Capacitor).
 *
 * Su browser (PWA/desktop) questo modulo è un no-op: le push arrivano tramite
 * il Service Worker Web Push del backend v2. Su device nativo (Android/iOS via
 * Capacitor) invece ci registriamo a FCM e inviamo il token al backend v2
 * (endpoint /api/push/fcm), così il v2 può inviare notifiche "tipo WhatsApp".
 */

import { Capacitor } from '@capacitor/core'
import { PushNotifications, type PushNotificationToken, type PushNotificationActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications'
import { api } from './api-client'
import { toast } from 'sonner'

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Stato diagnostico della registrazione push, esposto alla UI (es. schermata
 * Impostazioni) così l'utente può verificare se il token FCM è stato inviato
 * al backend. È un oggetto mutabile: la UI lo legge al momento della render.
 */
export const pushState = {
  /** true quando il token è stato inviato con successo al backend v2. */
  registered: false,
  /** ultimo token FCM ricevuto dal device (vuoto finché non arriva). */
  token: '' as string,
  /** ultimo errore di registrazione/invio (vuoto se tutto ok). */
  error: '' as string,
}

// I listener FCM vanno attaccati una sola volta (addListener accumula handler).
let listenersAttached = false

/** Chiama questa funzione dopo il login avvenuto con successo, oppure al ripristino della sessione. */
export async function registerPushForCurrentUser(): Promise<void> {
  if (!isNative()) return // su web le push le gestisce il service worker
  try {
    const perm = await PushNotifications.checkPermissions()
    let status = perm.receive
    if (status !== 'granted') {
      const req = await PushNotifications.requestPermissions()
      status = req.receive
    }
    if (status !== 'granted') {
      pushState.error = 'Permesso notifiche negato dall’utente'
      console.log('[PUSH v3] permesso notifiche negato')
      return
    }
    await PushNotifications.register()
  } catch (err) {
    pushState.error = err instanceof Error ? err.message : String(err)
    console.error('[PUSH v3] errore registrazione:', err)
  }
}

/** Disiscrive il device (logout / disinstallazione). */
export async function unregisterPush(): Promise<void> {
  if (!isNative()) return
  try {
    await PushNotifications.removeAllDeliveredNotifications()
  } catch {
    /* ignore */
  }
}

/**
 * Installa i listener FCM (token ricevuto, notifica in foreground, tap).
 * Idempotente: può essere chiamata da più effetti/componenti senza duplicare
 * gli handler. Va montata all'avvio dell'app (es. in un effetto nel client area)
 * PRIMA di chiamare registerPushForCurrentUser, così il token generato da
 * `register()` viene intercettato e inviato al backend.
 */
export function setupPushListeners(onNotificationTap?: (url?: string) => void): void {
  if (!isNative()) return
  if (listenersAttached) return
  listenersAttached = true

  PushNotifications.addListener('registration', async (token: PushNotificationToken) => {
    console.log('[PUSH v3] token FCM:', token.value)
    pushState.token = token.value
    pushState.error = ''
    try {
      await apiFetchFcmToken(token.value)
      pushState.registered = true
      console.log('[PUSH v3] token inviato al backend OK')
    } catch (err) {
      pushState.registered = false
      pushState.error = err instanceof Error ? err.message : String(err)
      console.error('[PUSH v3] invio token al backend fallito:', err)
    }
  })

  PushNotifications.addListener('registrationError', (err) => {
    pushState.error = err instanceof Error ? err.message : String(err)
    console.error('[PUSH v3] registrationError:', err)
  })

  // Notifica ricevuta mentre l'app è in primo piano: la mostriamo noi.
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[PUSH v3] ricevuta (foreground):', notification.title)
    // Su Capacitor la notifica nativa non appare in foreground: la mostriamo come toast.
    showLocalToast(notification.title ?? 'Notifica', notification.body ?? '')
  })

  // Tap sulla notifica (app aperta da notifica): navighiamo se c'è un url.
  PushNotifications.addListener('pushNotificationActionPerformed', (action: PushNotificationActionPerformed) => {
    const data = (action.notification?.data ?? {}) as Record<string, string>
    console.log('[PUSH v3] tap notifica:', data)
    onNotificationTap?.(data.url)
  })
}

// --- helper interni ---

async function apiFetchFcmToken(token: string): Promise<void> {
  const device = Capacitor.getPlatform() === 'ios' ? 'iOS' : 'Android'
  await api.push.fcmRegister(token, device)
}

function showLocalToast(title: string, body: string) {
  // Usa sonner se già importato altrove; qui evitiamo import ciclici con un semplice alert-like.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { toast } = require('sonner')
    toast(title, { description: body })
  } catch {
    /* sonner non disponibile: ignora */
  }
}
