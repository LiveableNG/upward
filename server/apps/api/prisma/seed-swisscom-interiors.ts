import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  PrismaClient,
  GoalPublishStatus,
  OfferingType,
  OfferingPricingModel,
  DeliveryCoverageType,
} from '@prisma/client'

dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

const API_BASE_URL = (
  process.env.ASSET_API_URL ||
  'https://upward-api.goodtenants.io'
).replace(/\/+$/, '').replace(/\/api\/v1$/, '')

const ASSET_BASE = `${API_BASE_URL}/api/v1/public/documents/marketplace/swisscom-interiors`

interface SwisscomOfferingSeed {
  title: string
  subtitle: string
  description: string
  leadTimeDays: number
  isFeatured: boolean
  media: Array<{ filename: string; isPrimary: boolean; sortOrder: number }>
  goalLinks: Array<{
    goalSlug: string
    isRecommended: boolean
    relevanceScore: number
    curatorNote?: string
  }>
}

const SWISSCOM_OFFERINGS: SwisscomOfferingSeed[] = [
  {
    title: 'Custom Made-to-Measure Curtains & Drapery',
    subtitle: 'Full-height drapery, layered bedroom curtains & decorative living space treatments',
    description:
      'Bespoke residential curtains custom-made by Swisscom Interiors to fit your exact window measurements. Choose from full-height floor-to-ceiling drapery, layered bedroom setups, tailored grey folds, and decorative living room treatments in sheer, decorative, dimout, or blackout fabrics. Includes on-site measurement, fabric & lining consultation, custom sewing, manual or motorised track options, and professional installation across Lagos. Pricing is provided via custom quotation after site measurement and fabric selection.',
    leadTimeDays: 7,
    isFeatured: false,
    media: [
      { filename: '01-full-height-curtain.jpg', isPrimary: true, sortOrder: 0 },
      { filename: '06-decorative-living-curtains.jpg', isPrimary: false, sortOrder: 1 },
      { filename: '02-layered-bedroom-curtains.jpg', isPrimary: false, sortOrder: 2 },
      { filename: '03-full-height-grey-drapery.jpg', isPrimary: false, sortOrder: 3 },
    ],
    goalLinks: [
      {
        goalSlug: 'improve-my-home-feel',
        isRecommended: true,
        relevanceScore: 95,
        curatorNote: 'Tailored floor-to-ceiling curtains measured and installed by Swisscom Interiors',
      },
      {
        goalSlug: 'prepare-for-the-new-year',
        isRecommended: false,
        relevanceScore: 80,
      },
    ],
  },
  {
    title: 'Motorised & Contemporary Sheer Curtains',
    subtitle: 'Light-filtering translucent sheers with manual or motorised track operation',
    description:
      'Soft, translucent custom sheer curtains that gently diffuse natural daylight while elevating living rooms, lounges, and home offices. Available with manual or smooth motorised track operation, and can be paired with decorative or blackout drapery for day-to-night light and privacy control. Includes professional site measurement, fabric selection, custom fabrication, and installation across Lagos. Pricing is provided via custom quotation after site measurement and fabric selection.',
    leadTimeDays: 7,
    isFeatured: false,
    media: [
      { filename: '08-sheer-curtains-living-space.jpg', isPrimary: true, sortOrder: 0 },
      { filename: '04-motorised-sheer-curtains.jpg', isPrimary: false, sortOrder: 1 },
    ],
    goalLinks: [
      {
        goalSlug: 'improve-my-home-feel',
        isRecommended: true,
        relevanceScore: 92,
        curatorNote: 'Daylight-diffusing custom sheers with optional motorised tracks',
      },
      {
        goalSlug: 'improve-remote-work-productivity',
        isRecommended: true,
        relevanceScore: 85,
        curatorNote: 'Soften harsh daylight and reduce screen glare in your workspace',
      },
    ],
  },
  {
    title: 'Double Layer Roller Blinds (Sunscreen + Blackout)',
    subtitle: 'Dual-layer custom window blinds for daytime glare control and full night blackout',
    description:
      'Custom-made double-layer roller blinds combining a daytime sunscreen fabric that filters harsh sunlight while preserving views, paired with an independent blackout layer for complete privacy and restful sleep. Ideal for bedrooms, living spaces, and remote-work setups. Professionally measured on site, custom-fabricated to your exact window dimensions, and installed across Lagos by Swisscom Interiors. Pricing is provided via custom quotation after site measurement and fabric selection.',
    leadTimeDays: 5,
    isFeatured: false,
    media: [
      { filename: '07-double-layer-roller-blind.jpg', isPrimary: true, sortOrder: 0 },
    ],
    goalLinks: [
      {
        goalSlug: 'improve-my-home-feel',
        isRecommended: true,
        relevanceScore: 90,
        curatorNote: 'Dual sunscreen + blackout roller blinds tailored to your windows',
      },
      {
        goalSlug: 'improve-remote-work-productivity',
        isRecommended: true,
        relevanceScore: 88,
        curatorNote: 'Control glare during video calls and focused remote work',
      },
    ],
  },
]

export async function seedSwisscomInteriors(client: PrismaClient) {
  console.log('🪟 Seeding Swisscom Interiors (Vendor, Consolidated Offerings, Media & Goal Links)...')
  console.log(`   Asset base URL: ${ASSET_BASE}`)

  // 1. Upsert Vendor
  const vendor = await client.upward_commerce_vendor.upsert({
    where: { slug: 'swisscom-interiors' },
    update: {
      name: 'Swisscom Interiors',
      logoUrl: `${ASSET_BASE}/logo.jpg`,
      email: 'info@swisscomblinds.com.ng',
      phone: '+234 814 970 6079',
      website: 'https://www.swisscomblinds.com.ng',
      rating: 4.95,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['LAGOS_ALL', 'YABA_REGION'],
    },
    create: {
      name: 'Swisscom Interiors',
      slug: 'swisscom-interiors',
      logoUrl: `${ASSET_BASE}/logo.jpg`,
      email: 'info@swisscomblinds.com.ng',
      phone: '+234 814 970 6079',
      website: 'https://www.swisscomblinds.com.ng',
      rating: 4.95,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['LAGOS_ALL', 'YABA_REGION'],
    },
  })
  console.log(`  🏪 Vendor ready: ${vendor.name} (id=${vendor.id})`)

  // 2. Load existing goals by slug for linking
  const goals = await client.upward_goal.findMany({
    select: { id: true, slug: true },
  })
  const goalBySlug = new Map(goals.map((g) => [g.slug, g.id]))

  // 3. Upsert each consolidated offering, its media, and goal links
  for (const item of SWISSCOM_OFFERINGS) {
    const existing = await client.upward_offering.findFirst({
      where: {
        vendorId: vendor.id,
        title: item.title,
      },
    })

    const offeringData = {
      vendorId: vendor.id,
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.QUOTE_REQUIRED,
      title: item.title,
      subtitle: item.subtitle,
      description: item.description,
      currency: 'NGN',
      price: null,
      minPrice: null,
      maxPrice: null,
      inStock: true,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['LAGOS_ALL', 'YABA_REGION'],
      leadTimeDays: item.leadTimeDays,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: item.isFeatured,
    }

    const offering = existing
      ? await client.upward_offering.update({
          where: { id: existing.id },
          data: offeringData,
        })
      : await client.upward_offering.create({
          data: offeringData,
        })

    // Refresh offering media idempotently
    await client.upward_offering_media.deleteMany({
      where: { offeringId: offering.id },
    })
    await client.upward_offering_media.createMany({
      data: item.media.map((m) => ({
        offeringId: offering.id,
        mediaUrl: `${ASSET_BASE}/${m.filename}`,
        mimeType: 'image/jpeg',
        isPrimary: m.isPrimary,
        sortOrder: m.sortOrder,
      })),
    })

    // Upsert goal links
    for (const link of item.goalLinks) {
      const goalId = goalBySlug.get(link.goalSlug)
      if (!goalId) {
        console.warn(`    ⚠️ Goal slug "${link.goalSlug}" not found; skipping link`)
        continue
      }

      const existingLink = await client.upward_goal_offering.findFirst({
        where: {
          goalId,
          offeringId: offering.id,
          collectionId: null,
        },
      })

      if (existingLink) {
        await client.upward_goal_offering.update({
          where: { id: existingLink.id },
          data: {
            isRecommended: link.isRecommended,
            relevanceScore: link.relevanceScore,
            curatorNote: link.curatorNote ?? null,
          },
        })
      } else {
        await client.upward_goal_offering.create({
          data: {
            goalId,
            offeringId: offering.id,
            isRecommended: link.isRecommended,
            relevanceScore: link.relevanceScore,
            curatorNote: link.curatorNote ?? null,
          },
        })
      }
    }

    console.log(
      `  ✅ ${existing ? 'Updated' : 'Created'} offering [id=${offering.id}]: ${offering.title} (${item.media.length} images)`,
    )
  }

  console.log('🎉 Swisscom Interiors seeding complete!')
}

async function main() {
  try {
    await seedSwisscomInteriors(prisma)
  } catch (error) {
    console.error('❌ Error seeding Swisscom Interiors:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
