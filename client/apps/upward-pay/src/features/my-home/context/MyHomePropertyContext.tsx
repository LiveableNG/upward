'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMyHomeProperties, type MyHomeProperty } from '../hooks/useMyHome'

const STORAGE_KEY = 'upward-pay.my-home.selected-property'

type MyHomePropertyContextValue = {
  properties: MyHomeProperty[]
  selected: MyHomeProperty | null
  selectedUuid: string | null
  setSelectedUuid: (uuid: string) => void
}

const MyHomePropertyContext = createContext<MyHomePropertyContextValue | undefined>(undefined)

export function MyHomePropertyProvider({ children }: { children: ReactNode }) {
  const properties = useMyHomeProperties()
  const [selectedUuid, setSelectedUuidState] = useState<string | null>(null)

  useEffect(() => {
    if (properties.length === 0) {
      setSelectedUuidState(null)
      return
    }

    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored && properties.some((property) => property.uuid === stored)) {
      setSelectedUuidState(stored)
      return
    }

    setSelectedUuidState(properties[0].uuid)
  }, [properties])

  const setSelectedUuid = useCallback(
    (uuid: string) => {
      if (!properties.some((property) => property.uuid === uuid)) return
      setSelectedUuidState(uuid)
      sessionStorage.setItem(STORAGE_KEY, uuid)
    },
    [properties],
  )

  const selected = properties.find((property) => property.uuid === selectedUuid) || properties[0] || null

  const value = useMemo(
    () => ({
      properties,
      selected,
      selectedUuid: selected?.uuid ?? null,
      setSelectedUuid,
    }),
    [properties, selected, setSelectedUuid],
  )

  return <MyHomePropertyContext.Provider value={value}>{children}</MyHomePropertyContext.Provider>
}

export function useSelectedProperty() {
  const context = useContext(MyHomePropertyContext)
  if (!context) {
    throw new Error('useSelectedProperty must be used within MyHomePropertyProvider')
  }
  return context
}
