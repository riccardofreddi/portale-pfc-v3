/** API client per il frontend mobile — URL configurabile. */

function getBaseUrl(): string {
  if (typeof window === 'undefined') return ''
  const stored = localStorage.getItem('pfc_api_url')
  if (stored) {
    const url = stored.replace(/\/+$/, '')
    return url
  }
  return ''
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
      apiFetch<{ messaggi: Array<Record<string, unknown>> }>(`/api/messaggi?username=${encodeURIComponent(username)}`),
    segnaLetti: () => apiFetch('/api/messaggi?action=segna_letti', { method: 'PATCH' }),
    archivia: (id: string) => apiFetch(`/api/messaggi?id=${id}&action=archivia`, { method: 'PATCH' }),
    dearchivia: (id: string) => apiFetch(`/api/messaggi?id=${id}&action=dearchivia`, { method: 'PATCH' }),
  },
  notifiche: {
    list: () => apiFetch<{ notifiche: Array<Record<string, unknown>> }>('/api/notifiche'),
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

/** Helper to get/set the backend URL */
export function getApiUrl(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('pfc_api_url') ?? ''
}

export function setApiUrl(url: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pfc_api_url', url.replace(/\/+$/, ''))
}
