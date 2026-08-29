/** API client per il frontend mobile — URL backend fisso e non modificabile. */

// URL del backend PFC v2. È volutamente HARDCODED e non esposto da nessuna UI:
// il cliente non deve (e non può) modificarlo. Se serve cambiarlo, si aggiorna
// questa costante e si rifà la build nativa.
const DEFAULT_API_URL = 'https://portale-pfc-v2.vercel.app'

function getBaseUrl(): string {
  // L'URL è fisso. Non leggiamo alcun override (env/localStorage) lato client
  // per evitare che resti "ancora configurabile" su device già installati.
  return DEFAULT_API_URL.replace(/\/+$/, '')
}

async function apiFetch<T = unknown>(url: string, opts?: RequestInit): Promise<T> {
  const base = getBaseUrl()
  const fullUrl = `${base}${url}`
  const res = await fetch(fullUrl, {
    ...opts,
    credentials: 'include',
    headers: {
      ...(opts?.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(opts?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { error?: string }).error ?? `Errore ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export const api = {
  auth: {
    me: () => apiFetch<{ user: { username: string; name: string; role: 'admin' | 'client'; exemptMaintenance?: boolean } | null }>('/api/auth/me'),
    login: (username: string, password: string) =>
      apiFetch<{ ok: boolean; user?: unknown; error?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  },
  documenti: {
    list: (params: { username: string; anno?: string; cartella?: string }) => {
      const q = new URLSearchParams({ username: params.username })
      if (params.anno) q.set('anno', params.anno)
      if (params.cartella) q.set('cartella', params.cartella)
      return apiFetch<{ anni?: string[]; cartelle?: Array<Record<string, unknown>>; files?: Array<Record<string, unknown>>; r2NotConfigured?: boolean; error?: string }>(`/api/documenti/list?${q}`)
    },
    download: (key: string) => `${getBaseUrl()}/api/documenti/download?key=${encodeURIComponent(key)}`,
  },
  messaggi: {
    list: (username: string) =>
      apiFetch<{ messaggi: Array<Record<string, unknown>> }>(
        `/api/messaggi?username=${encodeURIComponent(username)}`
      ).then((res) => {
        const mapped = ((res.messaggi ?? []) as Array<Record<string, unknown>>).map((m) => {
          const testo = String(m.text ?? '')
          const titolo = testo.split('\n')[0].trim().slice(0, 80) || 'Messaggio'
          const archiviato =
            Array.isArray(m.archivedByClient) && (m.archivedByClient as unknown[]).length > 0
          return {
            id: m.id,
            titolo,
            corpo: testo,
            dataInvio: m.timestamp,
            letto: m.read,
            archiviato,
            richiedeUpload: m.requiresUpload,
            uploadDescrizione: undefined,
            haRisposta: m.uploadReceived,
            allegatoNome: undefined,
          }
        })
        return { messaggi: mapped }
      }),
    segnaLetti: () => apiFetch('/api/messaggi?action=segna_letti', { method: 'PATCH' }),
    archivia: (id: string) => apiFetch(`/api/messaggi?id=${id}&action=archivia`, { method: 'PATCH' }),
    dearchivia: (id: string) => apiFetch(`/api/messaggi?id=${id}&action=dearchivia`, { method: 'PATCH' }),
  },
  notifiche: {
    list: () =>
      apiFetch<{ notifiche: Array<Record<string, unknown>> }>('/api/notifiche').then((res) => {
        const mapped = ((res.notifiche ?? []) as Array<Record<string, unknown>>).map((n) => ({
          id: n.id,
          tipo: n.type,
          titolo: n.text,
          corpo: n.detail,
          letta: n.read,
          dataCreazione: n.ts,
          year: n.year,
          folder: n.folder,
        }))
        return { notifiche: mapped }
      }),
    segnaLette: (tipi?: string[], year?: string, folder?: string) => {
      const q = new URLSearchParams({ action: 'segna_lette' })
      if (tipi?.length) q.set('tipi', tipi.join(','))
      if (year) q.set('year', year)
      if (folder) q.set('folder', folder)
      return apiFetch(`/api/notifiche?${q}`, { method: 'POST' })
    },
    segnaLetta: (id: string) =>
      apiFetch(`/api/notifiche?action=segna_lette&id=${encodeURIComponent(id)}`, { method: 'POST' }),
    pulisciLette: () => apiFetch('/api/notifiche?action=pulisci_lette', { method: 'POST' }),
    pulisciTutte: () => apiFetch('/api/notifiche?action=pulisci_tutte', { method: 'POST' }),
  },
  preferiti: {
    list: () => apiFetch<{ preferiti: string[] }>('/api/preferiti'),
    toggle: (filePath: string) => apiFetch<{ ok: boolean; isPreferito: boolean }>('/api/preferiti', { method: 'POST', body: JSON.stringify({ filePath }) }),
  },
  push: {
    fcmRegister: (token: string, device?: string) =>
      apiFetch('/api/push/fcm', { method: 'POST', body: JSON.stringify({ token, device }) }),
    fcmUnregister: (token: string) =>
      apiFetch('/api/push/fcm', { method: 'DELETE', body: JSON.stringify({ token }) }),
    fcmTest: () => apiFetch('/api/push/fcm/test', { method: 'POST' }),
    fcmStatus: () =>
      apiFetch<{ fcmEnabled: boolean; serverProjectId: string | null; userTokens: number }>(
        '/api/push/fcm/status',
      ),
  },
  audit: {
    meList: (limit?: number) => {
      const q = limit ? `?limit=${limit}` : ''
      return apiFetch<{ logs: Array<{ id: string; ts: string; action: string; detail: string }> }>(`/api/audit/me${q}`)
    },
  },
  cassetto: {
    list: () => apiFetch<{ files: Array<{ nome: string; key: string; size: number; sizeStr: string; lastModified: Date | null }> }>('/api/cassetto/list'),
    upload: (formData: FormData) =>
      apiFetch<{ ok: boolean; key: string; nome: string }>('/api/cassetto/upload', {
        method: 'POST', body: formData,
      }),
    delete: (key: string) => apiFetch<{ ok: boolean }>('/api/cassetto/delete', { method: 'POST', body: JSON.stringify({ key }) }),
    rename: (key: string, newName: string) =>
      apiFetch<{ ok: boolean; newKey: string; newName: string }>('/api/cassetto/rename', { method: 'POST', body: JSON.stringify({ key, newName }) }),
  },
  risposte: {
    upload: (formData: FormData) =>
      apiFetch<{ ok: boolean; key: string; nome: string }>('/api/risposte/upload', {
        method: 'POST', body: formData,
      }),
  },
  ricerca: (q: string, username?: string) => {
    const params = new URLSearchParams({ q })
    if (username) params.set('username', username)
    return apiFetch<{ results: Array<Record<string, unknown>> }>(`/api/ricerca?${params}`)
  },
  setup: () => apiFetch('/api/setup'),
}
