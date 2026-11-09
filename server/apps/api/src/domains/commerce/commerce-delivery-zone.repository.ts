export interface CommerceDeliveryZone {
  id?: number
  uuid: string
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering: boolean
  deliveryFeeKobo: bigint
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateDeliveryZoneInput {
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering?: boolean
  deliveryFeeKobo?: bigint
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder?: number
}

export interface UpdateDeliveryZoneInput {
  name?: string
  state?: string
  region?: string | null
  areasCovered?: string | null
  isDelivering?: boolean
  deliveryFeeKobo?: bigint
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder?: number
}

export interface CommerceDeliveryZoneRepository {
  findAll(options?: { onlyDelivering?: boolean }): Promise<CommerceDeliveryZone[]>
  findById(id: number): Promise<CommerceDeliveryZone | null>
  findByUuid(uuid: string): Promise<CommerceDeliveryZone | null>
  findByTag(tag: string): Promise<CommerceDeliveryZone | null>
  create(input: CreateDeliveryZoneInput): Promise<CommerceDeliveryZone>
  update(uuid: string, input: UpdateDeliveryZoneInput): Promise<CommerceDeliveryZone>
  toggleDelivering(uuid: string, isDelivering: boolean, pauseReason?: string | null): Promise<CommerceDeliveryZone>
  delete(uuid: string): Promise<void>
}

export const COMMERCE_DELIVERY_ZONE_REPOSITORY = Symbol('COMMERCE_DELIVERY_ZONE_REPOSITORY')
