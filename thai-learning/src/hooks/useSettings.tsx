import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/types'
import { getSettings, saveSettings } from '@/lib/db'

interface Ctx {
  settings: Settings
  loaded: boolean
  update: (patch: Partial<Settings>) => Promise<void>
}

const SettingsContext = createContext<Ctx>({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  update: async () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    getSettings()
      .then((s) => {
        if (alive) {
          setSettings(s)
          setLoaded(true)
        }
      })
      .catch(() => setLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const update = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void saveSettings(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): Ctx {
  return useContext(SettingsContext)
}
