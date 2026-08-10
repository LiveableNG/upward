'use client'

import React, { useMemo, useState } from 'react'
import { ArrowRightLeft, Building2, Check, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useProperties } from '@/features/pm/hooks/useProperties'
import { useTransferTeamProperties } from '@/features/pm/hooks/useTeam'

interface TeamCollaboration {
  uuid: string
  accessLevel: 'ALL' | 'CUSTOM'
  status: string
  member: {
    uuid: string
    firstName: string
    lastName: string
    email: string
  }
  properties: { uuid: string; name?: string }[]
}

interface TransferPropertiesModalProps {
  team: TeamCollaboration[]
  targetCollaboration?: TeamCollaboration | null
  onClose: () => void
}

export function TransferPropertiesModal({
  team,
  targetCollaboration,
  onClose,
}: TransferPropertiesModalProps) {
  const { mutate: transferProperties, isPending } = useTransferTeamProperties()
  const { data: properties = [], isLoading: loadingProperties } = useProperties()

  const managers = useMemo(
    () =>
      team.filter(
        (c) => c.accessLevel === 'CUSTOM' && c.status === 'ACCEPTED'
      ),
    [team]
  )

  const [fromUuid, setFromUuid] = useState<string>('')
  const [toUuid, setToUuid] = useState<string>(targetCollaboration?.uuid ?? '')
  const [propertyUuids, setPropertyUuids] = useState<string[]>([])
  const [propertySearch, setPropertySearch] = useState('')

  const fromCollaboration = managers.find((c) => c.uuid === fromUuid)
  const toCollaboration = managers.find((c) => c.uuid === toUuid)

  const availableProperties = useMemo(() => {
    if (fromCollaboration) {
      const assigned = new Set(fromCollaboration.properties.map((p) => p.uuid))
      return properties.filter((p: { uuid: string }) => assigned.has(p.uuid))
    }
    return properties
  }, [fromCollaboration, properties])

  const filteredProperties = availableProperties.filter((p: { name: string }) =>
    p.name.toLowerCase().includes(propertySearch.toLowerCase())
  )

  const toOptions = managers.filter((c) => c.uuid !== fromUuid)

  const toggleProperty = (uuid: string) => {
    setPropertyUuids((prev) =>
      prev.includes(uuid) ? prev.filter((u) => u !== uuid) : [...prev, uuid]
    )
  }

  const canSubmit =
    !!toUuid &&
    propertyUuids.length > 0 &&
    fromUuid !== toUuid

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !toCollaboration) return

    transferProperties(
      {
        toCollaborationUuid: toUuid,
        fromCollaborationUuid: fromUuid || undefined,
        propertyUuids,
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Transfer Properties"
      subtitle="Move property access from one manager to another. Ownership stays with you."
      maxWidth={540}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ flex: 1, height: 48, borderRadius: 12 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="transfer-properties-form"
            className="btn btn--primary"
            style={{ flex: 1, height: 48, borderRadius: 12 }}
            disabled={!canSubmit || isPending}
          >
            {isPending ? 'Transferring...' : 'Transfer Properties'}
          </button>
        </div>
      }
    >
      <form
        id="transfer-properties-form"
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: 14,
            borderRadius: 12,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent)' }} />
          <span>
            This moves <strong>management access</strong> only — you remain the property owner.
            The previous manager loses access to the selected properties.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">From manager (optional)</label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
            Leave empty to pick any of your properties. Select a manager to limit the list to their assignments.
          </p>
          <select
            value={fromUuid}
            onChange={(e) => {
              setFromUuid(e.target.value)
              setPropertyUuids([])
            }}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '0 14px',
              fontSize: 14,
              background: 'white',
              marginTop: 8,
            }}
          >
            <option value="">Any manager</option>
            {managers.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.member.firstName} {c.member.lastName}
                {c.properties.length === 0 ? ' (no properties)' : ` (${c.properties.length})`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <ArrowRightLeft size={18} />
        </div>

        <div className="form-group">
          <label className="form-label">To manager</label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.45 }}>
            Property access will be assigned to this manager. Admins already have all properties.
          </p>
          <select
            value={toUuid}
            onChange={(e) => setToUuid(e.target.value)}
            required
            style={{
              width: '100%',
              height: 48,
              borderRadius: 12,
              border: '1px solid var(--border)',
              padding: '0 14px',
              fontSize: 14,
              background: 'white',
              marginTop: 8,
            }}
          >
            <option value="" disabled>
              Select a manager
            </option>
            {toOptions.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.member.firstName} {c.member.lastName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            Properties to transfer ({propertyUuids.length})
          </label>
          {fromCollaboration && fromCollaboration.properties.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              This manager has no assigned properties to transfer.
            </p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search properties..."
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                style={{
                  width: '100%',
                  height: 38,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  padding: '8px 12px',
                  fontSize: 13,
                  marginTop: 8,
                  marginBottom: 8,
                  background: 'var(--bg)',
                }}
              />
              <div
                style={{
                  maxHeight: 220,
                  overflow: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: 'var(--bg)',
                }}
              >
                {loadingProperties ? (
                  <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
                    Loading properties...
                  </div>
                ) : filteredProperties.length === 0 ? (
                  <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {fromCollaboration
                      ? 'No properties assigned to this manager'
                      : 'No properties found'}
                  </div>
                ) : (
                  filteredProperties.map((p: { uuid: string; name: string }) => (
                    <div
                      key={p.uuid}
                      onClick={() => toggleProperty(p.uuid)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: propertyUuids.includes(p.uuid) ? 'white' : 'transparent',
                        border: propertyUuids.includes(p.uuid)
                          ? '1px solid var(--border)'
                          : '1px solid transparent',
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={14} color="var(--text-muted)" />
                        {p.name}
                      </span>
                      {propertyUuids.includes(p.uuid) && (
                        <Check size={16} color="var(--forest)" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {canSubmit && toCollaboration && (
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--forest-faint)',
              fontSize: 13,
              color: 'var(--forest)',
              lineHeight: 1.5,
            }}
          >
            <strong>{propertyUuids.length}</strong> propert
            {propertyUuids.length === 1 ? 'y' : 'ies'} will move
            {fromCollaboration
              ? ` from ${fromCollaboration.member.firstName}`
              : ''}{' '}
            to <strong>{toCollaboration.member.firstName} {toCollaboration.member.lastName}</strong>.
          </div>
        )}
      </form>
    </Modal>
  )
}
