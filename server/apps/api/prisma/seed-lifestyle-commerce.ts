import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  PrismaClient,
  GoalPublishStatus,
  GoalTargetType,
  OfferingType,
  OfferingPricingModel,
  DeliveryCoverageType,
} from '@prisma/client'

dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

/**
 * 1. Clean up all lifestyle and commerce data in strict reverse dependency order
 */
export async function clearLifestyleAndCommerce(client: PrismaClient) {
  console.log('🧹 [1/2] Initiating clean-up of Lifestyle & Commerce infrastructure...')

  // Order execution, fulfillment events, payables, disputes and order items
  const deletedOrderItems = await client.upward_commerce_order_item.deleteMany({})
  console.log(`  - Deleted ${deletedOrderItems.count} commerce order items`)

  const deletedFulfilmentEvents = await client.upward_commerce_fulfilment_event.deleteMany({})
  console.log(`  - Deleted ${deletedFulfilmentEvents.count} fulfilment events`)

  const deletedPayoutAttempts = await client.upward_commerce_payout_transfer_attempt.deleteMany({})
  console.log(`  - Deleted ${deletedPayoutAttempts.count} payout transfer attempts`)

  const deletedPayables = await client.upward_commerce_vendor_payable.deleteMany({})
  console.log(`  - Deleted ${deletedPayables.count} vendor payable records`)

  const deletedPaymentAttempts = await client.upward_commerce_payment_attempt.deleteMany({})
  console.log(`  - Deleted ${deletedPaymentAttempts.count} commerce payment attempts`)

  const deletedRefundAttempts = await client.upward_commerce_refund_attempt.deleteMany({})
  console.log(`  - Deleted ${deletedRefundAttempts.count} refund attempts`)

  const deletedRefunds = await client.upward_commerce_refund.deleteMany({})
  console.log(`  - Deleted ${deletedRefunds.count} refunds`)

  const deletedDisputes = await client.upward_commerce_dispute.deleteMany({})
  console.log(`  - Deleted ${deletedDisputes.count} disputes`)

  const deletedAuditLogs = await client.upward_commerce_order_audit.deleteMany({})
  console.log(`  - Deleted ${deletedAuditLogs.count} order audit logs`)

  const deletedSubOrders = await client.upward_commerce_vendor_suborder.deleteMany({})
  console.log(`  - Deleted ${deletedSubOrders.count} vendor sub-orders`)

  const deletedOrders = await client.upward_commerce_order.deleteMany({})
  console.log(`  - Deleted ${deletedOrders.count} commerce master orders`)

  // Offerings, packages, media and goal offerings
  const deletedPackageItems = await client.upward_package_item.deleteMany({})
  console.log(`  - Deleted ${deletedPackageItems.count} package/bundle components`)

  const deletedOfferingMedia = await client.upward_offering_media.deleteMany({})
  console.log(`  - Deleted ${deletedOfferingMedia.count} offering media assets`)

  const deletedGoalOfferings = await client.upward_goal_offering.deleteMany({})
  console.log(`  - Deleted ${deletedGoalOfferings.count} goal-offering links`)

  const deletedOfferings = await client.upward_offering.deleteMany({})
  console.log(`  - Deleted ${deletedOfferings.count} offerings`)

  // Vendors and Delivery Coverage Zones
  const deletedVendors = await client.upward_commerce_vendor.deleteMany({})
  console.log(`  - Deleted ${deletedVendors.count} commerce vendors`)

  const deletedZones = await client.upward_commerce_delivery_zone.deleteMany({})
  console.log(`  - Deleted ${deletedZones.count} delivery coverage zones`)

  // User Goals, Goal Collections, Action Templates, Goals and Categories
  const deletedUserGoals = await client.upward_user_goal.deleteMany({})
  console.log(`  - Deleted ${deletedUserGoals.count} tenant goal adoptions`)

  const deletedActionTemplates = await client.upward_goal_action_template.deleteMany({})
  console.log(`  - Deleted ${deletedActionTemplates.count} goal action templates`)

  const deletedCollections = await client.upward_goal_collection.deleteMany({})
  console.log(`  - Deleted ${deletedCollections.count} goal collections`)

  const deletedGoals = await client.upward_goal.deleteMany({})
  console.log(`  - Deleted ${deletedGoals.count} goals`)

  const deletedCategories = await client.upward_goal_category.deleteMany({})
  console.log(`  - Deleted ${deletedCategories.count} goal categories`)

  console.log('✅ [1/2] Lifestyle & Commerce tables have been completely cleared!\n')
}

/**
 * 2. Seed official Categories, Goals, Delivery Zones, Vendors, Offerings & Media
 */
export async function seedLifestyleAndCommerce(client: PrismaClient) {
  console.log('🌱 [2/2] Seeding Lifestyle & Commerce dataset...')

  // ── A. DELIVERY COVERAGE ZONES ──
  console.log('  📍 Seeding delivery coverage zones (Yaba Environs & Entire Lagos)...')
  const zoneYaba = await client.upward_commerce_delivery_zone.create({
    data: {
      tag: 'YABA_REGION',
      name: 'Yaba & Environs',
      state: 'Lagos',
      region: 'Lagos Mainland',
      areasCovered:
        'Yaba, Sabo, Akoka, Alagomeji, Adekunle, Onike, Iwaya, Abule Ijesha, Jibowu, Tejuosho, Ebute Metta, Oyadiran Estate',
      deliveryFeeKobo: 0n,
      estimatedDeliveryDays: 'Same-day or next-day delivery',
      isDelivering: true,
      sortOrder: 1,
    },
  })

  const zoneLagosAll = await client.upward_commerce_delivery_zone.create({
    data: {
      tag: 'LAGOS_ALL',
      name: 'Lagos (Statewide)',
      state: 'Lagos',
      region: 'Greater Lagos Area',
      areasCovered:
        'Lagos Island, Victoria Island, Ikoyi, Lekki Phase 1 to Ajah, Ikeja, Surulere, Maryland, Magodo, Gbagada, Festac, Yaba, Entire Lagos State',
      deliveryFeeKobo: 0n,
      estimatedDeliveryDays: '1 - 2 business days',
      isDelivering: true,
      sortOrder: 2,
    },
  })

  // ── B. CATEGORIES & SUB-GOALS ──
  console.log('  📁 Seeding official 4 lifestyle categories and sub-goals...')
  const goalMap = new Map<string, number>()

  const CATEGORIES_DATA = [
    {
      slug: 'housing', // Matches ?category=housing from "Improve my home feel"
      title: 'Home & Lifestyle',
      description: 'Living space renewal, apartment refresh kits, maintenance, and home essentials.',
      iconName: 'Home',
      sortOrder: 1,
      goals: [
        {
          slug: 'improve-my-home-feel',
          title: 'Improve my home feel',
          tagline: 'Elevate your living space with curated furniture, kits, and aesthetics',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
        {
          slug: 'prepare-for-the-new-year',
          title: 'Prepare for the new year',
          tagline: 'Get your apartment ready with complete home refresh & cleaning kits',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
        {
          slug: 'home-maintenance-repairs',
          title: 'Home maintenance & repairs',
          tagline: 'Reliable painting, carpentry, plumbing, and verified apartment upkeep',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
        {
          slug: 'deep-cleaning-laundry',
          title: 'Deep cleaning & laundry',
          tagline: 'Professional home sanitization and delicate textile garment care',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
      ],
    },
    {
      slug: 'financial',
      title: 'Income & Financial',
      description: 'Rent budgeting, emergency rent buffers, and long-term savings goals.',
      iconName: 'TrendingUp',
      sortOrder: 2,
      goals: [
        {
          slug: 'pay-less-for-my-next-rent',
          title: 'Pay less for my next rent',
          tagline: 'Automate weekly or monthly savings toward your upcoming rent renewal',
          targetType: GoalTargetType.AMOUNT,
        },
        {
          slug: 'emergency-rent-buffer',
          title: 'Emergency rent buffer',
          tagline: 'Build a safety cushion for sudden expenses and tenancy protection',
          targetType: GoalTargetType.AMOUNT,
        },
      ],
    },
    {
      slug: 'career',
      title: 'Career & Professional',
      description: 'Workplace productivity, home office ergonomics, and professional advancement.',
      iconName: 'Briefcase',
      sortOrder: 3,
      goals: [
        {
          slug: 'improve-remote-work-productivity',
          title: 'Improve remote work productivity',
          tagline: 'Curated home office desks, ergonomic chairs, power solutions, and desk accessories',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
        {
          slug: 'professional-upskilling',
          title: 'Professional upskilling & certifications',
          tagline: 'Invest in certifications, tech bootcamps, and career accelerators',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
      ],
    },
    {
      slug: 'children',
      title: "Children's Development",
      description: 'School readiness, tutoring programs, education supplies, and child enrichment.',
      iconName: 'GraduationCap',
      sortOrder: 4,
      goals: [
        {
          slug: 'school-term-preparedness',
          title: 'School term preparedness',
          tagline: 'Plan ahead for children tuition, learning supplies, and academic essentials',
          targetType: GoalTargetType.AMOUNT,
        },
        {
          slug: 'creative-learning-enrichment',
          title: 'Creative learning & enrichment',
          tagline: 'Extracurricular skills, coding clubs, arts, and educational resources',
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
        },
      ],
    },
  ]

  for (const catData of CATEGORIES_DATA) {
    const { goals, ...catFields } = catData
    const category = await client.upward_goal_category.create({
      data: {
        slug: catFields.slug,
        title: catFields.title,
        description: catFields.description,
        iconName: catFields.iconName,
        sortOrder: catFields.sortOrder,
        status: GoalPublishStatus.PUBLISHED,
      },
    })
    console.log(`    📁 [${category.slug}] ${category.title}`)

    for (const goalData of goals) {
      const goal = await client.upward_goal.create({
        data: {
          categoryId: category.id,
          slug: goalData.slug,
          title: goalData.title,
          tagline: goalData.tagline,
          targetType: goalData.targetType,
          status: GoalPublishStatus.PUBLISHED,
        },
      })
      goalMap.set(goal.slug, goal.id)
      console.log(`      🎯 Goal: ${goal.title}`)
    }
  }

  // ── C. VERIFIED VENDORS ──
  console.log('  🏪 Seeding creative verified merchants & service vendors...')

  // 1. Home Refresh Vendor (Yaba Region)
  const vendorHavenCraft = await client.upward_commerce_vendor.create({
    data: {
      name: 'HavenCraft Living',
      slug: 'havencraft-living',
      logoUrl:
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&auto=format&fit=crop&q=80',
      email: 'hello@havencraft.ng',
      phone: '+234 812 400 8891',
      rating: 4.95,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['YABA_REGION'],
    },
  })

  // 2. Painting Specialist (Everywhere in Lagos)
  const vendorColorSpectrum = await client.upward_commerce_vendor.create({
    data: {
      name: 'ColorSpectrum Studios',
      slug: 'colorspectrum-studios',
      logoUrl:
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=80',
      email: 'dispatch@colorspectrum.ng',
      phone: '+234 803 720 1194',
      rating: 4.9,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['LAGOS_ALL', 'YABA_REGION'],
    },
  })

  // 3. Drycleaner Specialist (Yaba)
  const vendorCrispCrest = await client.upward_commerce_vendor.create({
    data: {
      name: 'CrispCrest Fabric Spa',
      slug: 'crispcrest-fabric-spa',
      logoUrl:
        'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=200&auto=format&fit=crop&q=80',
      email: 'concierge@crispcrest.ng',
      phone: '+234 818 940 2231',
      rating: 4.88,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['YABA_REGION'],
    },
  })

  // 4. Home Cleaner Specialist (Yaba)
  const vendorSparkleSphere = await client.upward_commerce_vendor.create({
    data: {
      name: 'SparkleSphere Deep Clean',
      slug: 'sparklesphere-cleaning',
      logoUrl:
        'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=200&auto=format&fit=crop&q=80',
      email: 'booking@sparklesphere.ng',
      phone: '+234 814 670 5519',
      rating: 4.92,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['YABA_REGION'],
    },
  })

  // 5. Carpenter Specialist (Yaba)
  const vendorTimberForge = await client.upward_commerce_vendor.create({
    data: {
      name: 'TimberForge Joinery',
      slug: 'timberforge-joinery',
      logoUrl:
        'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=200&auto=format&fit=crop&q=80',
      email: 'craft@timberforge.ng',
      phone: '+234 809 330 4482',
      rating: 4.85,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['YABA_REGION'],
    },
  })

  // ── D. 23-PIECE NEW YEAR HOME REFRESH PACKAGE ──
  console.log('  📦 Seeding New Year Home Refresh Package (Total ₦89,000, Voucher Eligible)...')

  // Total sum of all 23 items:
  // 4000 + 1500 + 2500 + 3000 + 3500 + 500 + 2000 + 9000 + 6000 + 500 +
  // 3000 + 13000 + 6000 + 4000 + 4000 + 4000 + 2000 + 3000 + 4000 + 3000 + 4000 + 2500 + 4000 = ₦89,000
  const ITEMS_MANIFEST = [
    {
      title: '360-Degree Spin Mop & Bucket System',
      price: 4000,
      img: 'https://images.pexels.com/photos/38304325/pexels-photo-38304325/free-photo-of-professional-cleaner-mopping-floor-with-caution-sign.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Microfiber mop with dual-chamber spinning wash bucket',
    },
    {
      title: 'Traditional Soft Broom',
      price: 1500,
      img: 'https://images.pexels.com/photos/15213501/pexels-photo-15213501/free-photo-of-broom-by-the-wall.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Dense soft bristles for dust and fine particle sweeping',
    },
    {
      title: 'Heavy-Duty Scrubbing Brush',
      price: 2500,
      img: 'https://images.pexels.com/photos/32908422/pexels-photo-32908422/free-photo-of-cleaning-tiles-with-soap-and-scrub-brush.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Stiff bristle hand scrub for floor and bathroom tile cleaning',
    },
    {
      title: 'Toilet Brush & Sanitary Holder Set',
      price: 3000,
      img: 'https://images.pexels.com/photos/4239036/pexels-photo-4239036.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Ergonomic handle with ventilated drip-free base',
    },
    {
      title: 'Antibacterial Bathroom Slippers',
      price: 3500,
      img: 'https://images.pexels.com/photos/14187813/pexels-photo-14187813.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Quick-dry, non-slip textured indoor bathroom slippers',
    },
    {
      title: 'High-Density Cleaning Sponge',
      price: 500,
      img: 'https://images.pexels.com/photos/5218003/pexels-photo-5218003.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Absorbent double-sided surface cleaning foam',
    },
    {
      title: 'Heavy-Duty Ergonomic Dustpan',
      price: 2000,
      img: 'https://images.pexels.com/photos/19408638/pexels-photo-19408638/free-photo-of-elderly-man-cleaning-the-courtyard-with-a-broom-and-dustpan.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Rubberized edge for seamless floor contact and collection',
    },
    {
      title: 'Dual Large Waste Dustbins',
      price: 9000,
      img: 'https://images.pexels.com/photos/6913203/pexels-photo-6913203.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Pedal-operated durable waste bins for kitchen and room',
    },
    {
      title: 'Non-Slip Bathroom Footmats / Carpets',
      price: 6000,
      img: 'https://images.pexels.com/photos/12273900/pexels-photo-12273900.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Plush microfiber bath mat with anti-skid rubber backing',
    },
    {
      title: 'Heavy-Duty Dishwashing Sponges (Multi-Pack)',
      price: 500,
      img: 'https://images.pexels.com/photos/5218007/pexels-photo-5218007.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Scouring pads safe for non-stick cookware and glass',
    },
    {
      title: 'Absorbent Cotton Kitchen Towels (3-Pack)',
      price: 3000,
      img: 'https://images.pexels.com/photos/6382461/pexels-photo-6382461.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: '100% combed cotton lint-free drying and wiping cloths',
    },
    {
      title: '16-Piece Stainless Steel Cutlery Set',
      price: 13000,
      img: 'https://images.pexels.com/photos/7001922/pexels-photo-7001922.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Food-grade stainless steel dining forks, spoons, and table knives',
    },
    {
      title: 'Non-Slip Kitchen Floor Mat',
      price: 6000,
      img: 'https://images.pexels.com/photos/12689256/pexels-photo-12689256.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Waterproof cushioned standing mat for kitchen prep area',
    },
    {
      title: 'Wall-Mount Toothbrush Holders Set',
      price: 4000,
      img: 'https://images.pexels.com/photos/13466251/pexels-photo-13466251.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Hygienic covered wall mount with toothpaste dispenser slot',
    },
    {
      title: 'Floor Wiper & Glass Squeegee',
      price: 4000,
      img: 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Flexible silicone blade for streak-free dry floors and tiles',
    },
    {
      title: 'Protective Cleaning Gloves (2 Pairs)',
      price: 4000,
      img: 'https://images.pexels.com/photos/4440530/pexels-photo-4440530.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Thick waterproof latex gloves with textured grip',
    },
    {
      title: 'Heavy-Duty Refuse Bags (1 Roll - 20 Bags)',
      price: 2000,
      img: 'https://images.pexels.com/photos/5994772/pexels-photo-5994772.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Tear-resistant leakproof bin liners for household waste',
    },
    {
      title: 'Multipurpose Surface Cleaner (1L)',
      price: 3000,
      img: 'https://images.pexels.com/photos/3989284/pexels-photo-3989284.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'All-surface degreaser for kitchen counters, tiles, and walls',
    },
    {
      title: 'Hospital-Grade Disinfectant (1L)',
      price: 4000,
      img: 'https://images.pexels.com/photos/4098761/pexels-photo-4098761.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: '99.9% germ eradication for floors, bathroom, and fixtures',
    },
    {
      title: 'Extra-Strength Bleach (1L)',
      price: 3000,
      img: 'https://images.pexels.com/photos/7451952/pexels-photo-7451952.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Deep stain removal, tile whitening, and toilet bowl sanitizing',
    },
    {
      title: 'Deep Action Toilet Bowl Cleaner',
      price: 4000,
      img: 'https://images.pexels.com/photos/10941389/pexels-photo-10941389.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Thick clinging formula that dissolves limescale and rings',
    },
    {
      title: 'Grease-Cutting Dishwashing Liquid',
      price: 2500,
      img: 'https://images.pexels.com/photos/28764305/pexels-photo-28764305.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Concentrated citrus formula cuts through grease and food residue',
    },
    {
      title: 'Fresh Citrus Apartment Air Freshener',
      price: 4000,
      img: 'https://images.pexels.com/photos/7795656/pexels-photo-7795656.jpeg?auto=compress&cs=tinysrgb&w=600',
      desc: 'Long-lasting room fragrance that eliminates lingering odors',
    },
  ]

  // Create component offerings in DB
  const componentOfferingIds: Array<{ id: number; price: number }> = []
  for (const item of ITEMS_MANIFEST) {
    const comp = await client.upward_offering.create({
      data: {
        title: item.title,
        subtitle: 'Home Refresh Essential',
        description: item.desc,
        type: OfferingType.PRODUCT,
        pricingModel: OfferingPricingModel.FIXED,
        price: item.price,
        currency: 'NGN',
        vendorId: vendorHavenCraft.id,
        inStock: true,
        deliveryAvailable: true,
        deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
        deliveryZones: ['YABA_REGION'],
        status: GoalPublishStatus.PUBLISHED,
        isFeatured: false,
      },
    })
    await client.upward_offering_media.create({
      data: {
        offeringId: comp.id,
        mediaUrl: item.img,
        isPrimary: true,
        sortOrder: 0,
      },
    })
    componentOfferingIds.push({ id: comp.id, price: item.price })
  }

  // Concise, high-value description with NO itemized individual prices in prose
  const packageCleanDescription =
    'Complete move-in and seasonal apartment renewal set curated for modern living. Get all 23 essential items for floor care, bathroom sanitation, kitchen hygiene, and deep chemical cleaning in one verified package delivered straight to your door.'

  // Create Parent PACKAGE offering (locked complete package)
  const homeRefreshPackage = await client.upward_offering.create({
    data: {
      title: 'New Year Home Refresh Package',
      subtitle: 'Complete 23-Piece Household Cleaning & Apartment Renewal Set',
      description: packageCleanDescription,
      type: OfferingType.PACKAGE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 89000, // Total sum of all 23 items
      minPrice: 89000,
      maxPrice: null, // No default strikethrough — dynamically personalized when user has voucher credits
      currency: 'NGN',
      vendorId: vendorHavenCraft.id,
      inStock: true,
      stockCount: 50,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['YABA_REGION'],
      leadTimeDays: 1,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: true,
      isPromoted: true, // Elevates to Spotlight Hero Banner in upward-pay
      voucherEligible: true, // User voucher credits apply dynamically to this package
      promoBadge: 'HOME REFRESH',
      promoTitle: 'Prepare Your Home for the New Year',
      promoSubtitle: 'Curated 23-piece household cleaning & apartment renewal kit',
      promoCoverImage:
        'https://images.pexels.com/photos/10568275/pexels-photo-10568275.jpeg?auto=compress&cs=tinysrgb&w=1200',
      promoPriority: 100,
    },
  })

  // Add rich hero photos specifically showing cleaning supplies kits, caddy, and tools
  await client.upward_offering_media.createMany({
    data: [
      {
        offeringId: homeRefreshPackage.id,
        // Organized cleaning caddy & supplies kit
        mediaUrl:
          'https://images.pexels.com/photos/10568275/pexels-photo-10568275.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isPrimary: true,
        sortOrder: 0,
      },
      {
        offeringId: homeRefreshPackage.id,
        // Cleaning supplies basket & bottles
        mediaUrl:
          'https://images.pexels.com/photos/5217889/pexels-photo-5217889.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isPrimary: false,
        sortOrder: 1,
      },
      {
        offeringId: homeRefreshPackage.id,
        // Cleaning tools, sponges & gloves set
        mediaUrl:
          'https://images.pexels.com/photos/4440526/pexels-photo-4440526.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isPrimary: false,
        sortOrder: 2,
      },
      {
        offeringId: homeRefreshPackage.id,
        // Home refresh cleaning supplies
        mediaUrl:
          'https://images.pexels.com/photos/9462685/pexels-photo-9462685.jpeg?auto=compress&cs=tinysrgb&w=1200',
        isPrimary: false,
        sortOrder: 3,
      },
    ],
  })

  // Link all 23 components to the Package via upward_package_item
  await client.upward_package_item.createMany({
    data: componentOfferingIds.map((comp, idx) => ({
      packageId: homeRefreshPackage.id,
      componentId: comp.id,
      quantity: 1,
      isOptional: false,
      overridePrice: comp.price,
      sortOrder: idx + 1,
    })),
  })

  // ── E. LIFESTYLE APARTMENT SERVICES ──
  console.log('  🛠️ Seeding verified apartment services (Painter, Drycleaner, Cleaner, Carpenter)...')

  // 1. Painter Service (Lagos Statewide)
  const servicePainter = await client.upward_offering.create({
    data: {
      title: 'Professional Interior & Wall Painting',
      subtitle: 'Expert apartment wall repainting, surface prep & color renewal',
      description:
        'Certified professional painters equipped with high-durability coatings, drop cloths, edge taping, and clean finish. Suitable for full room makeovers, accent walls, move-in touch-ups, and moisture protection.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.QUOTE_REQUIRED,
      price: null, // Price left empty as requested
      minPrice: null,
      currency: 'NGN',
      vendorId: vendorColorSpectrum.id,
      inStock: true,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['LAGOS_ALL', 'YABA_REGION'],
      leadTimeDays: 2,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: true,
    },
  })
  await client.upward_offering_media.create({
    data: {
      offeringId: servicePainter.id,
      mediaUrl:
        'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 2. Drycleaner Service (Yaba)
  const serviceDrycleaner = await client.upward_offering.create({
    data: {
      title: 'Curtains, Rugs & Garment Dry Cleaning',
      subtitle: 'Delicate textile steam cleaning, stain removal & door pick-up',
      description:
        'Professional fabric care for heavy curtains, floor rugs, bed linens, duvet sets, and wardrobe garments. Includes door-to-door pick-up and protected delivery in Yaba and surrounding areas.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.QUOTE_REQUIRED,
      price: null, // Price left empty as requested
      minPrice: null,
      currency: 'NGN',
      vendorId: vendorCrispCrest.id,
      inStock: true,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['YABA_REGION'],
      leadTimeDays: 2,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: true,
    },
  })
  await client.upward_offering_media.create({
    data: {
      offeringId: serviceDrycleaner.id,
      mediaUrl:
        'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=1200&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 3. Home Cleaner Service (Yaba)
  const serviceCleaner = await client.upward_offering.create({
    data: {
      title: 'Deep Apartment Move-in & Sanitation Cleaning',
      subtitle: 'Comprehensive floor-to-ceiling scrub, kitchen degreasing & bathroom disinfection',
      description:
        'Trained residential cleaning crew armed with industrial scrubbers, vacuums, and hospital-grade sanitizers. Covers living rooms, tile grout, cabinets, kitchen appliances, and complete bathroom descaling.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.QUOTE_REQUIRED,
      price: null, // Price left empty as requested
      minPrice: null,
      currency: 'NGN',
      vendorId: vendorSparkleSphere.id,
      inStock: true,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['YABA_REGION'],
      leadTimeDays: 1,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: true,
    },
  })
  await client.upward_offering_media.create({
    data: {
      offeringId: serviceCleaner.id,
      mediaUrl:
        'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 4. Carpenter Service (Yaba)
  const serviceCarpenter = await client.upward_offering.create({
    data: {
      title: 'Furniture Assembly, Repair & Custom Joinery',
      subtitle: 'Door repairs, cabinet hinges, wardrobe fixes & shelf installations',
      description:
        'Skilled artisan carpenters for flat-pack furniture assembly, kitchen cabinet hinge alignment, lock changes, bespoke shelving, and wooden fixture restorations.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.QUOTE_REQUIRED,
      price: null, // Price left empty as requested
      minPrice: null,
      currency: 'NGN',
      vendorId: vendorTimberForge.id,
      inStock: true,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.REGIONAL_ZONES,
      deliveryZones: ['YABA_REGION'],
      leadTimeDays: 1,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: true,
    },
  })
  await client.upward_offering_media.create({
    data: {
      offeringId: serviceCarpenter.id,
      mediaUrl:
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // ── F. LINK OFFERINGS TO LIFESTYLE GOALS ──
  console.log('  🔗 Linking offerings to relevant lifestyle goals...')

  const homeFeelGoalId = goalMap.get('improve-my-home-feel')
  const newYearGoalId = goalMap.get('prepare-for-the-new-year')
  const maintenanceGoalId = goalMap.get('home-maintenance-repairs')
  const deepCleanGoalId = goalMap.get('deep-cleaning-laundry')

  const linksToCreate = []

  if (newYearGoalId) {
    linksToCreate.push(
      { goalId: newYearGoalId, offeringId: homeRefreshPackage.id, isRecommended: true, relevanceScore: 100 },
      { goalId: newYearGoalId, offeringId: serviceCleaner.id, isRecommended: true, relevanceScore: 90 },
    )
  }

  if (homeFeelGoalId) {
    linksToCreate.push(
      { goalId: homeFeelGoalId, offeringId: homeRefreshPackage.id, isRecommended: true, relevanceScore: 95 },
      { goalId: homeFeelGoalId, offeringId: servicePainter.id, isRecommended: true, relevanceScore: 90 },
      { goalId: homeFeelGoalId, offeringId: serviceCarpenter.id, isRecommended: false, relevanceScore: 80 },
    )
  }

  if (maintenanceGoalId) {
    linksToCreate.push(
      { goalId: maintenanceGoalId, offeringId: servicePainter.id, isRecommended: true, relevanceScore: 95 },
      { goalId: maintenanceGoalId, offeringId: serviceCarpenter.id, isRecommended: true, relevanceScore: 95 },
    )
  }

  if (deepCleanGoalId) {
    linksToCreate.push(
      { goalId: deepCleanGoalId, offeringId: serviceCleaner.id, isRecommended: true, relevanceScore: 100 },
      { goalId: deepCleanGoalId, offeringId: serviceDrycleaner.id, isRecommended: true, relevanceScore: 95 },
    )
  }

  for (const link of linksToCreate) {
    await client.upward_goal_offering.create({ data: link })
  }

  // ── G. DEFAULT SIGNUP VOUCHER CAMPAIGN ──
  console.log('  🎟️ Seeding default signup voucher campaign (HOME_REFRESH_1K)...')
  await client.upward_voucher_campaign.upsert({
    where: { code: 'HOME_REFRESH_1K' },
    update: {
      isActive: true,
      defaultAmountKobo: 100000n, // ₦1,000
    },
    create: {
      code: 'HOME_REFRESH_1K',
      name: 'Home Refresh Welcome Voucher',
      description: 'Special ₦1,000 signup voucher credit toward the New Year Home Refresh Package',
      type: 'SIGNUP_LINK',
      defaultAmountKobo: 100000n, // ₦1,000
      isActive: true,
      emailTemplateKey: 'signup_voucher_1k',
    },
  })

  console.log('✅ [2/2] Lifestyle & Commerce seeding completed successfully!')
}

async function main() {
  const isClearOnly = process.argv.includes('--clear-only')

  try {
    await clearLifestyleAndCommerce(prisma)

    if (isClearOnly) {
      console.log('⏸️  Skipping seed phase (--clear-only passed). Clean state achieved.')
    } else {
      await seedLifestyleAndCommerce(prisma)
    }
  } catch (error) {
    console.error('❌ Error executing lifestyle commerce script:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
