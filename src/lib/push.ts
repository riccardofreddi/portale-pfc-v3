/**
 * Portale PFC v3 — registrazione notifiche push native (FCM via Capacitor).
 *
 * Su browser (PWA/desktop) questo modulo è un no-op: le push arrivano tramite
 * il Service Worker Web Push del backend v2. Su device nativo (Android/iOS via
 * Capacitor) invece ci registriamo a FCM e inviamo il token al backend v2
 * (endpoint /api/push/fcm), così il v2 può inviare notifiche "tipo WhatsApp".
 *
 * ARCHITETTURA FOREGROUND:
 * Android Capacitor NON mostra automaticamente le notifiche FCM quando l'app
 * è in foreground: scatta solo l'evento pushNotificationReceived. Per ottenere
 * il comportamento "tipo WhatsApp" (notifica nel system tray con suono e
 * vibrazione anche a app aperta) creiamo una LocalNotification.
 */

import { Capacitor } from '@capacitor/core'
import {
  PushNotifications,
  type PushNotificationToken,
  type PushNotificationActionPerformed,
  type PushNotificationSchema,
} from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import { api } from './api-client'

/** ID del canale di notifica Android — deve matchare quello nel messaggio FCM. */
const NOTIFICATION_CHANNEL_ID = 'pfc-notifications'

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
// Il canale va creato una sola volta per sessione.
let channelCreated = false
// Counter per gli ID delle notifiche locali (deve essere Int32).
let localNotifIdCounter = 1

/**
 * Crea il canale di notifica Android (richiesto su Android 8+/API 26+).
 * Idempotente. Il canale ha importanza HIGH → suono + vibrazione + heads-up.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (channelCreated) return
  if (!isNative() || Capacitor.getPlatform() !== 'android') {
    channelCreated = true
    return
  }
  try {
    // Configurazione massima per garantire suono e heads-up
    await LocalNotifications.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: 'Notifiche Portale PFC',
      description: 'Notifiche dallo studio',
      sound: 'default', // Assicura il suono
      importance: 4,    // HIGH importance (heads-up)
      visibility: 1,    // PUBLIC
      vibration: true,  // Vibrazione
    })
    channelCreated = true
    console.log('[PUSH v3] Canale notifiche configurato correttamente.')
  } catch (err) {
    console.error('[PUSH v3] ERRORE CRITICO creazione canale:', err)
    // Se fallisce, forziamo true per non bloccare tutto, ma segnaliamo il problema
    channelCreated = true 
  }
}

/** Chiama questa funzione dopo il login avvenuto con successo, oppure al ripristino della sessione. */
export async function registerPushForCurrentUser(): Promise<void> {
  if (!isNative()) return // su web le push le gestisce il service worker
  try {
    // Crea il canale PRIMA di registrare: le notifiche in arrivo potrebbero
    // arrivare prima che il canale sia pronto, e senza canale Android le
    // scarta silenziosamente.
    await ensureNotificationChannel()

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

/**
 * Disiscrive il device (logout / disinstallazione).
 * Rimuove il token FCM dal backend così l'utente non riceve più push,
 * e pulisce le notifiche consegnate dal system tray.
 */
export async function unregisterPush(): Promise<void> {
  if (!isNative()) return
  try {
    // Rimuovi il token FCM dal backend (evita push a un utente sloggato)
    if (pushState.token) {
      await api.push.fcmUnregister(pushState.token).catch(() => {})
    }
    // Pulisci le notifiche push consegnate
    await PushNotifications.removeAllDeliveredNotifications()
    // Pulisci anche le notifiche locali create in foreground
    await LocalNotifications.removeAllDeliveredNotifications().catch(() => {})
    // Reset stato
    pushState.registered = false
    pushState.token = ''
    pushState.error = ''
  } catch (err) {
    console.error('[PUSH v3] errore unregister (ignorato):', err)
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

  // Notifica ricevuta mentre l'app è in primo piano: su Android Capacitor la
  // notifica FCM NON appare automaticamente nel system tray. Creiamo una
  // LocalNotification così l'utente vede una vera notifica (suono, vibrazione,
  // nel tray) — comportamento "tipo WhatsApp".
  PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
    // LOG AGGRESSIVO PER DEBUG
    console.log('[DEBUG PUSH v3] Ricevuta notifica nel listener!', JSON.stringify(notification));

    // Usiamo title/body dal data payload se mancano nel notification (foreground Android)
    const title = (notification.data?.title as string) || 'Notifica'
    const body = (notification.data?.body as string) || ''
    const data = (notification.data ?? {}) as Record<string, unknown>
    
    console.log('[PUSH v3] ricevuta (foreground):', title, '- data:', data)

    await showForegroundNotification(title, body, data)
  })

  // Tap su notifica push (app aperta da notifica mentre era in background):
  // navighiamo se c'è un url nel data payload.
  PushNotifications.addListener('pushNotificationActionPerformed', (action: PushNotificationActionPerformed) => {
    const data = (action.notification?.data ?? {}) as Record<string, string>
    console.log('[PUSH v3] tap notifica push:', data)
    onNotificationTap?.(data.url)
  })

  // Tap su notifica LOCALE (creata da noi in foreground): stesso comportamento.
  LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const extra = (action.notification?.extra ?? {}) as Record<string, string>
    console.log('[PUSH v3] tap notifica locale:', extra)
    onNotificationTap?.(extra.url)
  })
}

// --- helper interni ---

async function apiFetchFcmToken(token: string): Promise<void> {
  const device = Capacitor.getPlatform() === 'ios' ? 'iOS' : 'Android'
  console.log('[PUSH v3] Invio token al backend...', device, token.slice(0, 10) + '...')
  try {
    await api.push.fcmRegister(token, device)
    console.log('[PUSH v3] Backend ha accettato il token')
  } catch (err) {
    console.error('[PUSH v3] Backend ha rifiutato il token:', err)
    throw err
  }
}

/**
 * Mostra una notifica locale nel system tray. 
 * Abbiamo aggiunto l'attributo `sound` direttamente nello schedule per assicurarci che suoni.
 */
async function showForegroundNotification(
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    // Aggiungiamo un log per debuggare il suono e il canale
    console.log('[PUSH v3] Tentativo schedule notifica:', { title, channelId: NOTIFICATION_CHANNEL_ID });
    
    await LocalNotifications.schedule({
      notifications: [
        {
          id: localNotifIdCounter++,
          title,
          body,
          channelId: NOTIFICATION_CHANNEL_ID,
          // Forza il suono qui, non solo nel canale
          sound: 'default', 
          // Forza l'importanza della notifica singola (heads-up)
          importance: 'high',
          extra: data,
        },
      ],
    })
  } catch (err) {
    console.error('[PUSH v3] Errore critico LocalNotifications.schedule:', err)
    showLocalToast(title, body)
  }
}

function showLocalToast(title: string, body: string) {
  // Usa sonner come fallback se le notifiche locali falliscono.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { toast } = require('sonner')
    toast(title, { description: body })
  } catch {
    /* sonner non disponibile: ignora */
  }
}
