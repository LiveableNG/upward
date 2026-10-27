import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  useMyHomeProperties,
  type MyHomeProperty,
} from '@/features/my-home/hooks/useMyHomeProperties'

type MyHomePropertyContextValue = {
  properties: MyHomeProperty[]
  selected: MyHomeProperty | null
  selectedUuid: string | null
  setSelectedUuid: (uuid: string) => void
}

const MyHomePropertyContext = createContext<MyHomePropertyContextValue | null>(null)

export function MyHomePropertyProvider({ children }: { children: ReactNode }) {
  const properties = useMyHomeProperties()
  const [selectedUuid, setSelectedUuidState] = useState<string | null>(null)

  useEffect(() => {
    if (properties.length === 0) {
      setSelectedUuidState(null)
      return
    }
    if (selectedUuid && properties.some((p) => p.uuid === selectedUuid)) return
    setSelectedUuidState(properties[0]?.uuid ?? null)
  }, [properties, selectedUuid])

  const setSelectedUuid = (uuid: string) => {
    if (!properties.some((p) => p.uuid === uuid)) return
    setSelectedUuidState(uuid)
  }

  const selected = properties.find((p) => p.uuid === selectedUuid) ?? properties[0] ?? null

  const value = useMemo(
    () => ({
      properties,
      selected,
      selectedUuid: selected?.uuid ?? null,
      setSelectedUuid,
    }),
    [properties, selected],
  )

  return <MyHomePropertyContext.Provider value={value}>{children}</MyHomePropertyContext.Provider>
}

export function useSelectedProperty() {
  const ctx = useContext(MyHomePropertyContext)
  if (!ctx) throw new Error('useSelectedProperty requires MyHomePropertyProvider')
  return ctx
}
