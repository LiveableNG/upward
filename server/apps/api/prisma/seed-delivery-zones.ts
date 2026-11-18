import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const DEFAULT_DELIVERY_ZONES = [
  {
    tag: 'LAGOS_ISLAND',
    name: 'Lagos Island (Ikoyi / VI / Lekki / Ajah)',
    state: 'Lagos',
    region: 'Island',
    areasCovered: 'Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Marina, Banana Island, Ajah, Sangotedo, Chevron',
    isDelivering: true,
    deliveryFeeKobo: 250000n, // ₦2,500
    estimatedDeliveryDays: 'Same-day or next-day delivery',
    sortOrder: 1,
  },
  {
    tag: 'LAGOS_MAINLAND',
    name: 'Lagos Mainland (Ikeja / Surulere / Yaba)',
    state: 'Lagos',
    region: 'Mainland',
    areasCovered: 'Ikeja, Surulere, Yaba, Maryland, Magodo, Gbagada, Ogudu, Ilupeju, Festac, Alausa, Anthony, Shomolu',
    isDelivering: true,
    deliveryFeeKobo: 300000n, // ₦3,000
    estimatedDeliveryDays: '1 - 2 business days',
    sortOrder: 2,
  },
  {
    tag: 'ABUJA_METRO',
    name: 'Abuja Metro (Maitama / Wuse II / Asokoro)',
    state: 'Abuja',
    region: 'Federal Capital Territory',
    areasCovered: 'Maitama, Asokoro, Wuse 2, Central Business District, Garki, Jabi, Gwarinpa, Guzape, Utako',
    isDelivering: true,
    deliveryFeeKobo: 400000n, // ₦4,000
    estimatedDeliveryDays: '1 - 3 business days',
    sortOrder: 3,
  },
  {
    tag: 'PORT_HARCOURT',
    name: 'Port Harcourt (Old / New GRA / Trans-Amadi)',
    state: 'Rivers',
    region: 'South South',
    areasCovered: 'Old GRA, New GRA, Trans-Amadi, Peter Odili, Woji, Rumuola, D-Line, Eliozu',
    isDelivering: true,
    deliveryFeeKobo: 450000n, // ₦4,500
    estimatedDeliveryDays: '2 - 4 business days',
    sortOrder: 4,
  },
  {
    tag: 'IBADAN_METRO',
    name: 'Ibadan Metro (Bodija / Oluyole / Jericho)',
    state: 'Oyo',
    region: 'South West',
    areasCovered: 'Bodija, Jericho, Oluyole, Agodi GRA, Ring Road, Samonda, Dugbe, UI Area',
    isDelivering: true,
    deliveryFeeKobo: 350000n, // ₦3,500
    estimatedDeliveryDays: '2 - 3 business days',
    sortOrder: 5,
  },
  {
    tag: 'ENUGU_URBAN',
    name: 'Enugu Urban (Independence Layout / New Haven / GRA)',
    state: 'Enugu',
    region: 'South East',
    areasCovered: 'Independence Layout, New Haven, GRA Enugu, Ogui, Abakpa, Trans-Ekulu, Coal Camp',
    isDelivering: true,
    deliveryFeeKobo: 450000n, // ₦4,500
    estimatedDeliveryDays: '2 - 4 business days',
    sortOrder: 6,
  },
  {
    tag: 'BENIN_CITY',
    name: 'Benin City (GRA / Airport Road / Ugbowo)',
    state: 'Edo',
    region: 'South South',
    areasCovered: 'GRA Benin, Airport Road, Ugbowo, Ekenwan, Sapele Road, Ring Road',
    isDelivering: true,
    deliveryFeeKobo: 450000n, // ₦4,500
    estimatedDeliveryDays: '2 - 4 business days',
    sortOrder: 7,
  },
  {
    tag: 'OGUN_CENTRAL',
    name: 'Abeokuta & Arepo/Magboro (Ogun Central)',
    state: 'Ogun',
    region: 'South West',
    areasCovered: 'Arepo, Magboro, Ibara GRA, Oke-Mosan, Ibikunle, Sagamu Interchange, Mowe',
    isDelivering: true,
    deliveryFeeKobo: 350000n, // ₦3,500
    estimatedDeliveryDays: '2 - 3 business days',
    sortOrder: 8,
  },
  {
    tag: 'KANO_METRO',
    name: 'Kano Metropolis (Nassarawa GRA / Bompai)',
    state: 'Kano',
    region: 'North West',
    areasCovered: 'Nassarawa GRA, Bompai, Sabon Gari, Fagge, Tarauni, Dala',
    isDelivering: false,
    deliveryFeeKobo: 550000n, // ₦5,500
    estimatedDeliveryDays: '3 - 5 business days',
    pauseReason: 'Regional logistics hub launching soon',
    sortOrder: 9,
  },
  {
    tag: 'NATIONWIDE',
    name: 'Nationwide Interstate Express',
    state: 'Nationwide',
    region: 'Interstate Express',
    areasCovered: 'Rest of Nigeria / Interstate road & air freight delivery coverage across all 36 states',
    isDelivering: true,
    deliveryFeeKobo: 650000n, // ₦6,500
    estimatedDeliveryDays: '3 - 6 business days',
    sortOrder: 10,
  },
]

async function seedDeliveryZones() {
  console.log('🚀 Seeding 10 Delivery Coverage Zones into upward_commerce_delivery_zone...\n')

  for (const zone of DEFAULT_DELIVERY_ZONES) {
    const upserted = await prisma.upward_commerce_delivery_zone.upsert({
      where: { tag: zone.tag },
      update: {
        name: zone.name,
        state: zone.state,
        region: zone.region,
        areasCovered: zone.areasCovered,
        isDelivering: zone.isDelivering,
        deliveryFeeKobo: zone.deliveryFeeKobo,
        estimatedDeliveryDays: zone.estimatedDeliveryDays,
        pauseReason: zone.pauseReason ?? null,
        sortOrder: zone.sortOrder,
      },
      create: {
        tag: zone.tag,
        name: zone.name,
        state: zone.state,
        region: zone.region,
        areasCovered: zone.areasCovered,
        isDelivering: zone.isDelivering,
        deliveryFeeKobo: zone.deliveryFeeKobo,
        estimatedDeliveryDays: zone.estimatedDeliveryDays,
        pauseReason: zone.pauseReason ?? null,
        sortOrder: zone.sortOrder,
      },
    })
    console.log(`✅ [${upserted.sortOrder}] ${upserted.tag.padEnd(16)} | ${upserted.name} | Fee: ₦${Number(upserted.deliveryFeeKobo) / 100} | Status: ${upserted.isDelivering ? 'Delivering' : 'Paused'}`)
  }

  const count = await prisma.upward_commerce_delivery_zone.count()
  console.log(`\n🎉 Done! Total delivery coverage zones in database: ${count}`)
}

seedDeliveryZones()
  .catch((err) => {
    console.error('❌ Failed to seed delivery zones:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
