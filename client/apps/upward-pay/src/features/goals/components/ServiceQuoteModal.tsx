'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, Send, ShieldCheck, Wrench } from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useCreateServiceQuoteOrder } from '../hooks/useCommerceOrders'
import type { GoalOffering } from '../types/goals.types'
import { formatShortLocation, type UserDeliveryLocation } from '../utils/deliveryLocation'

const serviceQuoteSchema = z.object({
  requestDetails: z
    .string()
    .trim()
    .min(10, 'Please share a few details about what you need (at least 10 characters)'),
  deliveryAddress: z.string().trim().optional(),
  recipientPhone: z.string().trim().optional(),
})

type ServiceQuoteFormData = z.infer<typeof serviceQuoteSchema>

interface ServiceQuoteModalProps {
  offering: GoalOffering
  isOpen: boolean
  onClose: () => void
  deliveryLocation?: UserDeliveryLocation
}

export const ServiceQuoteModal: React.FC<ServiceQuoteModalProps> = ({
  offering,
  isOpen,
  onClose,
  deliveryLocation,
}) => {
  const router = useRouter()
  const { user } = useAuth()
  const toast = useToast()
  const createQuoteMutation = useCreateServiceQuoteOrder()

  const defaultAddress =
    user?.properties?.[0]?.address ||
    deliveryLocation?.zoneName ||
    deliveryLocation?.address ||
    ''
  const defaultPhone = user?.phone || ''

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceQuoteFormData>({
    resolver: zodResolver(serviceQuoteSchema),
    defaultValues: {
      requestDetails: '',
      deliveryAddress: defaultAddress,
      recipientPhone: defaultPhone,
    },
  })

  const onSubmit = async (data: ServiceQuoteFormData) => {
    try {
      const recipientName = user
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
        : undefined

      const res = await createQuoteMutation.mutateAsync({
        offeringUuid: offering.uuid,
        offeringId: offering.id,
        requestDetails: data.requestDetails.trim(),
        recipientName: recipientName || undefined,
        recipientPhone: data.recipientPhone?.trim() || defaultPhone || undefined,
        deliveryAddress:
          data.deliveryAddress?.trim() ||
          deliveryLocation?.zoneName ||
          deliveryLocation?.address ||
          undefined,
        deliveryZoneTag: deliveryLocation?.zoneTag,
      })

      toast.success('Service request submitted! Track updates right in your orders.')
      reset()
      onClose()
      if (res?.order?.uuid) {
        router.push(`/dashboard/lifestyle/orders?uuid=${res.order.uuid}`)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not submit your service request. Please try again.')
    }
  }

  const serviceTitle = offering.title || offering.name || 'Service Request'

  return (
    <BottomSheetModal
      isOpen={isOpen}
      onClose={onClose}
      title="Request a Service Price"
      subtitle={serviceTitle}
      maxWidth="520px"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {/* Service summary & active zone pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'var(--oat, #faf9f5)',
            border: '1px solid var(--border, rgba(0, 0, 0, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(var(--clay-rgb, 217, 119, 87), 0.12)',
                color: 'var(--clay, #d97757)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Wrench size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--text, #1a1714)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {serviceTitle}
              </div>
              {deliveryLocation && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    color: 'var(--text-muted, #8a8a8a)',
                    marginTop: 2,
                  }}
                >
                  <MapPin size={11} />
                  <span>{formatShortLocation(deliveryLocation)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Single focused question: Request details */}
        <div>
          <label
            htmlFor="service-quote-details"
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text, #1a1714)',
              marginBottom: 6,
            }}
          >
            Tell us about your request *
          </label>
          <textarea
            id="service-quote-details"
            rows={5}
            {...register('requestDetails')}
            placeholder="Describe what you need — e.g., details about your residence, items or garments involved, approximate size or quantity, preferred timing, or any helpful instructions…"
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              border: errors.requestDetails
                ? '1.5px solid var(--error, #ef4444)'
                : '1.5px solid var(--border-solid, #e2ddd7)',
              background: 'var(--bg, #ffffff)',
              color: 'var(--text, #1a1714)',
              fontSize: 14,
              lineHeight: 1.5,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          {errors.requestDetails && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--error, #ef4444)', fontWeight: 500 }}>
              {errors.requestDetails.message}
            </p>
          )}
        </div>

        {/* Reassurance note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'rgba(var(--clay-rgb, 217, 119, 87), 0.06)',
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--text-secondary, #4a4642)',
          }}
        >
          <ShieldCheck size={15} style={{ color: 'var(--clay, #d97757)', flexShrink: 0, marginTop: 1 }} />
          <span>
            No payment is required now. Our team will review your details, follow up in your order if needed, and send your exact price for approval.
          </span>
        </div>

        {/* Submit CTA */}
        <button
          type="submit"
          disabled={createQuoteMutation.isPending}
          style={{
            height: 50,
            width: '100%',
            borderRadius: 14,
            border: 'none',
            background: 'var(--clay, #d97757)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 15,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: createQuoteMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: createQuoteMutation.isPending ? 0.75 : 1,
            boxShadow: '0 8px 20px -6px rgba(var(--clay-rgb, 217, 119, 87), 0.45)',
          }}
        >
          {createQuoteMutation.isPending ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              <span>Submitting Request…</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Submit Request</span>
            </>
          )}
        </button>
      </form>
    </BottomSheetModal>
  )
}
