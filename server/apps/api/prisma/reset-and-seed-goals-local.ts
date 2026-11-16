import {
  PrismaClient,
  GoalPublishStatus,
  GoalTargetType,
  OfferingType,
  OfferingPricingModel,
  DeliveryCoverageType,
} from '@prisma/client'
import { PRODUCTION_GOAL_CATEGORIES } from './seed-goals-production'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 [Local Reset] Cleaning up existing goals, offerings, media, and vendors...')

  // Delete in reverse foreign key order
  await prisma.upward_goal_offering.deleteMany({})
  await prisma.upward_package_item.deleteMany({})
  await prisma.upward_offering_media.deleteMany({})
  await prisma.upward_commerce_order_item.deleteMany({})
  await prisma.upward_offering.deleteMany({})
  await prisma.upward_commerce_vendor_payable.deleteMany({})
  await prisma.upward_commerce_vendor_suborder.deleteMany({})
  await prisma.upward_commerce_vendor.deleteMany({})
  await prisma.upward_user_goal.deleteMany({})
  await prisma.upward_goal_action_template.deleteMany({})
  await prisma.upward_goal_collection.deleteMany({})
  await prisma.upward_goal.deleteMany({})
  await prisma.upward_goal_category.deleteMany({})

  console.log('✅ Local tables cleared.')

  // 1. Seed Categories & Goals from dashboard/goals specification
  console.log('🌱 [Local Seed] Seeding categories & goals...')
  const goalMap = new Map<string, number>()

  for (const catData of PRODUCTION_GOAL_CATEGORIES) {
    const { goals, ...categoryFields } = catData
    const category = await prisma.upward_goal_category.create({
      data: {
        slug: categoryFields.slug,
        title: categoryFields.title,
        description: categoryFields.description,
        iconName: categoryFields.iconName,
        sortOrder: categoryFields.sortOrder,
        status: GoalPublishStatus.PUBLISHED,
      },
    })

    console.log(`📁 Category: [${category.slug}] ${category.title}`)

    for (const goalData of goals) {
      const goal = await prisma.upward_goal.create({
        data: {
          categoryId: category.id,
          slug: goalData.slug,
          title: goalData.title,
          tagline: goalData.tagline,
          description: goalData.description,
          iconName: goalData.iconName,
          sortOrder: goalData.sortOrder,
          targetType: goalData.targetType,
          status: GoalPublishStatus.PUBLISHED,
        },
      })
      goalMap.set(goal.slug, goal.id)
      console.log(`  🎯 Goal: [${goal.slug}] ${goal.title}`)

      if (goalData.actions && goalData.actions.length > 0) {
        await prisma.upward_goal_action_template.createMany({
          data: goalData.actions.map((act, idx) => ({
            goalId: goal.id,
            title: act.title,
            description: act.description ?? null,
            sortOrder: idx,
            isRequired: act.isRequired ?? false,
          })),
        })
      }
    }
  }

  // 2. Seed Mock Commerce Vendors
  console.log('🏪 [Local Seed] Seeding mock commerce vendors...')
  const vendorCurated = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'Upward Curated Store',
      slug: 'upward-curated',
      logoUrl:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
      email: 'curated@upwardpay.com',
      rating: 5.0,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.NATIONWIDE,
      defaultDeliveryZones: ['Lagos Mainland', 'Lagos Island', 'Ikeja', 'Lekki / Ajah'],
    },
  })

  const vendorFurniCraft = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'FurniCraft Lagos',
      slug: 'furnicraft-lagos',
      logoUrl:
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&auto=format&fit=crop&q=80',
      email: 'orders@furnicraft.ng',
      rating: 4.9,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['Lagos Mainland', 'Lagos Island', 'Ikeja', 'Lekki / Ajah', 'Abuja'],
    },
  })

  const vendorCleanNest = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'CleanNest Services',
      slug: 'cleannest-ng',
      logoUrl:
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=80',
      email: 'support@cleannest.ng',
      rating: 4.8,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['Lagos Mainland', 'Lagos Island', 'Ikeja', 'Yaba / Surulere'],
    },
  })

  const vendorTech = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'SkillPro Africa',
      slug: 'skillpro-africa',
      logoUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80',
      email: 'learn@skillpro.africa',
      rating: 4.9,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.NATIONWIDE,
      defaultDeliveryZones: ['Lagos Mainland', 'Lagos Island', 'Ikeja', 'Abuja', 'Online'],
    },
  })

  const vendorBizLaunch = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'BizLaunch Advisory',
      slug: 'bizlaunch-advisory',
      logoUrl:
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80',
      email: 'hello@bizlaunch.ng',
      rating: 5.0,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.NATIONWIDE,
      defaultDeliveryZones: ['Lagos Mainland', 'Lagos Island', 'Abuja'],
    },
  })

  // 3. Seed 20 Realistic Mock Offerings spread across the Goals
  console.log('📦 [Local Seed] Seeding 20 mock offerings spread across goals...')

  const itemsData = [
    // ── Housing Goals (Home Ownership & Furnishing) ──
    {
      title: 'New Year Home Refresh Bundle',
      subtitle: 'Curated carpets, footmats, luxury towels & apartment renewal cleaning kit',
      description:
        'A comprehensive move-in and seasonal refresh kit designed for modern apartments. Includes plush hallway runner, anti-slip bathroom mats, 100% cotton towels, and organic cleaning supplies.',
      type: OfferingType.BUNDLE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 85000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: true,
      isPromoted: true,
      promoBadge: 'FEATURED BUNDLE',
      promoTitle: 'Prepare Your Home for the New Year',
      promoSubtitle: 'Curated carpets, footmats, towels & cleaning bundle',
      promoCoverImage:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
      promoPriority: 100,
      mediaUrl:
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'prepare-for-the-new-year',
    },
    {
      title: 'Apartment Move-In Starter Furniture Pack',
      subtitle: 'Minimalist solid wood bedframe, orthopedic mattress, and 2-seater couch',
      description:
        'Furnish your living space in one go. Modular dimensions suitable for standard Nigerian rental apartments, assembled on delivery.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 350000,
      currency: 'NGN',
      vendorId: vendorFurniCraft.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'improve-my-home-feel',
    },
    {
      title: 'Minimalist Living Room Accent Armchair',
      subtitle: 'Comfortable textured fabric armchair with tapered oak legs',
      description:
        'Durable stain-resistant upholstery with high-density foam seating. Designed to elevate small and medium living rooms.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 75000,
      currency: 'NGN',
      vendorId: vendorFurniCraft.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1580481077194-c8c740683072?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'improve-my-home-feel',
    },
    {
      title: 'Modern 4-Seater Compact Dining Set',
      subtitle: 'Solid beech wood dining table with 4 ergonomic matching chairs',
      description:
        'Space-efficient dining set built for rental dining corners. Easy to disassemble and move between tenancies.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 160000,
      currency: 'NGN',
      vendorId: vendorFurniCraft.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'improve-my-home-feel',
    },
    {
      title: 'Cooperative Homeownership Assessment & Starter Pack',
      subtitle: 'Legal advisory, deed search, and housing equity co-op entry pass',
      description:
        'Step-by-step verified legal onboarding and cooperative equity matching. Inspect approved real estate developments across Lagos and Abuja.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 25000,
      currency: 'NGN',
      vendorId: vendorBizLaunch.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'buy-a-house',
    },
    {
      title: 'Tenant Legal Advisory & Property Search Audit',
      subtitle: 'Deed verification, title search, and tenancy lease agreement review',
      description:
        'Certified property lawyer reviews title documents and lease contracts before you make major commitments.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 30000,
      currency: 'NGN',
      vendorId: vendorBizLaunch.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'buy-a-house',
    },

    // ── Career & Professional Goals (Learn a Skill) ──
    {
      title: 'Product Design & UI/UX Professional Bootcamp Pass',
      subtitle: '12-week mentored masterclass with portfolio review and Figma certification',
      description:
        'Hands-on product design program covering user research, design systems, prototyping, and job placement preparation.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 95000,
      currency: 'NGN',
      vendorId: vendorTech.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'learn-a-skill',
    },
    {
      title: 'Fullstack Cloud & Software Engineering Nanodegree',
      subtitle: 'Comprehensive Node.js, React, PostgreSQL & AWS certification curriculum',
      description:
        'Accelerate your engineering journey with live code reviews, architecture labs, and verified completion credentials.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 120000,
      currency: 'NGN',
      vendorId: vendorTech.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'learn-a-skill',
    },
    {
      title: 'Ergonomic Remote Workstation Desk & Chair Bundle',
      subtitle: 'Adjustable lumbar mesh chair with 120cm scratch-proof oak desk',
      description:
        'Engineered for long remote working hours. Includes cable organizer tray and headset mount.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 185000,
      currency: 'NGN',
      vendorId: vendorFurniCraft.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1593062096033-9a26b09da705?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'learn-a-skill',
    },
    {
      title: 'High-Speed 5G Portable Broadband & Router Kit',
      subtitle: 'Dual-band ultra-low latency WiFi 6 router with 100GB starter data bundle',
      description:
        'Reliable high-speed connectivity for remote professionals and developers across Lagos and Abuja.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 55000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'learn-a-skill',
    },
    {
      title: 'Executive CV Optimization & Interview Coaching Package',
      subtitle: '1-on-1 resume revamp, LinkedIn profile audit, and mock interview session',
      description:
        'Senior tech and corporate recruiter rewrites your CV and prepares you for senior-level interviews.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 40000,
      currency: 'NGN',
      vendorId: vendorBizLaunch.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'learn-a-skill',
    },

    // ── Income Goals (Start a Business) ──
    {
      title: 'CAC Business Name Registration & Tax Starter Kit',
      subtitle: 'Certified CAC registration, TIN generation, and corporate bank account intro',
      description:
        'Official corporate affairs commission incorporation completed in 7 business days with certified document delivery.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 35000,
      currency: 'NGN',
      vendorId: vendorBizLaunch.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'start-a-business',
    },
    {
      title: 'E-Commerce Storefront Setup & Brand Design Pack',
      subtitle: 'Custom Paystack-enabled online store, domain registration, and product upload',
      description:
        'Launch your merchant store with professional payment gateway integration, automated receipting, and clean catalog layout.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 80000,
      currency: 'NGN',
      vendorId: vendorTech.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'start-a-business',
    },
    {
      title: 'Smart POS Terminal & Merchant Payments Kit',
      subtitle: 'Android 4G smart POS device with instant settlement and receipts printer',
      description:
        'Compact merchant payment device pre-configured with multi-bank routing for high transaction success rates.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 45000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1556742049-0a67e557224d?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'start-a-business',
    },
    {
      title: 'Brand Identity Design & Pitch Deck Package',
      subtitle: 'Logo suite, brand guidelines, invoice templates, and 12-slide investor pitch deck',
      description:
        'Complete visual identity for early-stage founders and small businesses looking to present professional credentials.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 60000,
      currency: 'NGN',
      vendorId: vendorTech.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'start-a-business',
    },

    // ── Lifestyle Goals (Home Refresh & Healthy Living) ──
    {
      title: 'Premium Home Deep Clean & Sanitization',
      subtitle: 'Full apartment deep cleaning, tile descaling, and eco-friendly fumigation',
      description:
        'Two-person certified technician crew equipped with steam extractors and organic disinfectant agents.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 35000,
      currency: 'NGN',
      vendorId: vendorCleanNest.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'prepare-for-the-new-year',
    },
    {
      title: 'Apartment Fumigation & Pest Shield Service',
      subtitle: 'Odorless residual spray and gel baiting for cockroaches, bedbugs, and pests',
      description:
        'Safe for pets and children. Fast 2-hour treatment with 3-month pest-free guarantee.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 28000,
      currency: 'NGN',
      vendorId: vendorCleanNest.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'prepare-for-the-new-year',
    },
    {
      title: '1kVA Smart Lithium Inverter Backup Pack',
      subtitle: 'Quiet lithium power station with automatic switchover for WiFi, laptops, and fans',
      description:
        'Zero-noise, smoke-free indoor power solution. Runs laptops, routers, and fans for up to 12 hours during outages.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 420000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: true,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'improve-remote-work-productivity',
    },
    {
      title: 'Farm-Fresh Weekly Healthy Meal Box',
      subtitle: 'Pre-portioned organic vegetables, fresh proteins, and cooking condiments',
      description:
        'Direct from verified farm partners in Ogun and Oyo states. Delivered fresh Saturday mornings.',
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 38000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'grocery-regular-staples',
    },
    {
      title: 'City Commute & Transportation Fuel Voucher Pack',
      subtitle: 'Prepaid fuel, bus, and ride-hailing credit with 10% monthly savings',
      description:
        'Discounted commute credit across major transit providers. Cut your daily travel costs.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 35000,
      currency: 'NGN',
      vendorId: vendorCurated.id,
      isFeatured: false,
      isPromoted: false,
      mediaUrl:
        'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
      goalSlug: 'commute-transportation-savings',
    },
  ]

  let count = 0
  for (const item of itemsData) {
    count++
    const { mediaUrl, goalSlug, ...offeringFields } = item
    const goalId = goalMap.get(goalSlug)

    const createdOffering = await prisma.upward_offering.create({
      data: {
        ...offeringFields,
        status: GoalPublishStatus.PUBLISHED,
        deliveryAvailable: true,
        deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
        deliveryZones: ['Lagos Mainland', 'Lagos Island', 'Ikeja', 'Abuja'],
      },
    })

    // Create Primary Media
    await prisma.upward_offering_media.create({
      data: {
        offeringId: createdOffering.id,
        mediaUrl,
        isPrimary: true,
        sortOrder: 0,
      },
    })

    // Link Offering to Goal
    if (goalId) {
      await prisma.upward_goal_offering.create({
        data: {
          goalId,
          offeringId: createdOffering.id,
          isRecommended: createdOffering.isFeatured,
          relevanceScore: 100,
          curatorNote: createdOffering.isPromoted ? 'Exclusive Partner Bundle' : 'Recommended perk',
          sortOrder: 0,
        },
      })
    }

    console.log(`  [${count}/20] 🎁 [${createdOffering.type}] ${createdOffering.title} -> Goal: ${goalSlug}`)
  }

  console.log(`🎉 Local DB reset and reseed complete! Seeded ${count} items across all categories.`)
}

main()
  .catch((e) => {
    console.error('❌ Error during local reset and seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
