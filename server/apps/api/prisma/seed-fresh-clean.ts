import {
  PrismaClient,
  GoalPublishStatus,
  GoalTargetType,
  OfferingType,
  OfferingPricingModel,
  DeliveryCoverageType,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 [1/4] Clearing all commerce orders, offerings, goals, vendors, categories...')

  // Delete in strict foreign key order
  await prisma.upward_commerce_order_item.deleteMany({})
  await prisma.upward_commerce_fulfilment_event.deleteMany({})
  await prisma.upward_commerce_payout_transfer_attempt.deleteMany({})
  await prisma.upward_commerce_vendor_payable.deleteMany({})
  await prisma.upward_commerce_payment_attempt.deleteMany({})
  await prisma.upward_commerce_dispute.deleteMany({})
  await prisma.upward_commerce_refund_attempt.deleteMany({})
  await prisma.upward_commerce_refund.deleteMany({})
  await prisma.upward_commerce_order_audit.deleteMany({})
  await prisma.upward_commerce_vendor_suborder.deleteMany({})
  await prisma.upward_commerce_order.deleteMany({})

  await prisma.upward_package_item.deleteMany({})
  await prisma.upward_offering_media.deleteMany({})
  await prisma.upward_goal_offering.deleteMany({})
  await prisma.upward_offering.deleteMany({})
  await prisma.upward_commerce_vendor.deleteMany({})

  await prisma.upward_user_goal.deleteMany({})
  await prisma.upward_goal_action_template.deleteMany({})
  await prisma.upward_goal_collection.deleteMany({})
  await prisma.upward_goal.deleteMany({})
  await prisma.upward_goal_category.deleteMany({})

  console.log('✅ DB tables completely cleared.')

  // [2/4] Seed the EXACT 4 Goal Categories
  console.log('🌱 [2/4] Seeding the 4 official categories and their goals...')

  const CATEGORIES = [
    {
      slug: 'housing',
      title: 'Home & Lifestyle',
      description: 'Renting, preparing for a move, home ownership, and living space improvements.',
      iconName: 'Home',
      sortOrder: 1,
      goals: [
        { slug: 'pay-my-rent-now', title: 'Pay my rent now', tagline: 'Make my rent payment through Upward' },
        { slug: 'pay-less-for-my-next-rent', title: 'Pay less for my next rent', tagline: 'Build up savings towards my upcoming rent' },
        { slug: 'move-to-a-new-apartment', title: 'Move to a new apartment (coming soon)', tagline: 'Plan and save towards moving into a new home' },
        { slug: 'buy-a-house', title: 'Buy a house', tagline: 'Start preparing financially to buy a house in the future' },
        { slug: 'prepare-for-the-new-year', title: 'Prepare for the new year', tagline: 'Prepare your home with refresh packages & living essentials' },
        { slug: 'improve-my-home-feel', title: 'Improve my home feel', tagline: 'Improve the look and feel of my home with furniture and decoration' },
        { slug: 'improve-remote-work-productivity', title: 'Improve remote work productivity', tagline: 'Make my home more suitable for work and everyday productivity' },
        { slug: 'travel', title: 'Travel', tagline: 'Plan and budget for local and international travel' },
        { slug: 'gift-someone', title: 'Gift someone', tagline: 'Select thoughtful curated gifts and hampers for loved ones' },
      ],
    },
    {
      slug: 'income',
      title: 'Income & Financial',
      description: 'Increase financial stability, build additional income streams and make progress.',
      iconName: 'TrendingUp',
      sortOrder: 2,
      goals: [
        { slug: 'get-a-promotion', title: 'Get a promotion', tagline: 'Get promoted in the coming year to increase income' },
        { slug: 'start-a-side-hustle', title: 'Start a side hustle', tagline: 'Build an additional income stream outside my main job' },
        { slug: 'start-freelancing', title: 'Start freelancing', tagline: 'Offer professional services to clients independently' },
        { slug: 'get-a-remote-international-job', title: 'Get a remote international job', tagline: 'Earn foreign currency by working remotely for international employers' },
        { slug: 'monetise-my-skills', title: 'Monetise my skills', tagline: 'Earn money from skills I already possess' },
        { slug: 'grow-my-existing-income', title: 'Grow my existing income', tagline: 'Increase what I currently earn' },
        { slug: 'get-my-first-source-of-income', title: 'Get my first source of income', tagline: 'Start earning, particularly for someone early in their career' },
        { slug: 'start-investing', title: 'Start investing', tagline: 'Begin investing towards long-term financial security' },
        { slug: 'save-more-money', title: 'Save more money', tagline: 'Improve my ability to save and build financial reserves' },
        { slug: 'reduce-my-expenses', title: 'Reduce my expenses', tagline: 'Spend less and find ways to reduce household costs' },
        { slug: 'relocate-abroad', title: 'Relocate abroad', tagline: 'Explore relocating to another country as an economic goal' },
        { slug: 'save-towards-family-occasion', title: 'Save towards an important family occasion', tagline: 'Save towards family milestones and celebrations' },
        { slug: 'pay-off-my-debts', title: 'Pay off my debts', tagline: 'Reduce or clear outstanding debts systematically' },
      ],
    },
    {
      slug: 'career',
      title: 'Career & Professional',
      description: 'Getting a job, changing careers, acquiring qualifications, and workplace skills.',
      iconName: 'Briefcase',
      sortOrder: 3,
      goals: [
        { slug: 'get-my-first-job', title: 'Get my first job', tagline: 'Secure my first employment opportunity' },
        { slug: 'get-an-internship', title: 'Get an internship', tagline: 'Gain practical experience in a chosen field' },
        { slug: 'change-my-career', title: 'Change my career', tagline: 'Move from my current career into another field' },
        { slug: 'switch-career-to-tech', title: 'Switch career to tech', tagline: 'Transition into the technology industry' },
        { slug: 'get-promoted-to-management', title: 'Get promoted to management', tagline: 'Progress into a management or leadership role' },
        { slug: 'start-my-own-business', title: 'Start my own business', tagline: 'Build a small or medium-sized business' },
        { slug: 'improve-my-leadership-skills', title: 'Improve my leadership skills', tagline: 'Develop the skills needed to lead people and teams' },
        { slug: 'improve-my-presentation-skills', title: 'Improve my presentation skills', tagline: 'Master persuasive presentations and storytelling' },
        { slug: 'improve-my-speaking-skills', title: 'Improve my speaking skills', tagline: 'Become a better and more confident speaker' },
        { slug: 'get-a-mentor-coach', title: 'Get a mentor/coach', tagline: 'Accelerate growth with guidance from experienced leaders' },
        { slug: 'become-a-better-salesperson', title: 'Become a better salesperson', tagline: 'Improve ability to communicate, persuade and sell' },
        { slug: 'improve-my-professional-appearance', title: 'Improve my professional appearance', tagline: 'Upgrade professional wardrobe and executive presence' },
        { slug: 'start-working-remotely', title: 'Start working remotely', tagline: 'Find an opportunity to work remotely' },
        { slug: 'improve-my-remote-work-setup', title: 'Improve my remote-work setup', tagline: 'Create an ergonomic, work-friendly space' },
        { slug: 'get-a-professional-certification', title: 'Get a professional certification', tagline: 'Prepare for and obtain a recognised professional qualification' },
        { slug: 'get-a-professional-licence', title: 'Get a professional licence', tagline: 'Obtain a licence required to practise in a profession' },
        { slug: 'take-a-professional-examination', title: 'Take a professional examination', tagline: 'Prepare for a specific professional exam' },
        { slug: 'get-a-masters-degree', title: 'Get a master’s degree', tagline: 'Plan and prepare for postgraduate studies' },
        { slug: 'grow-my-professional-career', title: 'Grow my professional career', tagline: 'Become more established and progress in my chosen field' },
        { slug: 'grow-my-business-career', title: 'Grow my business career', tagline: 'Develop and advance my entrepreneurial career' },
      ],
    },
    {
      slug: 'children',
      title: "Children's Development",
      description: 'Educational interests, skills development, sports, and extracurricular activities for kids.',
      iconName: 'Smile',
      sortOrder: 4,
      goals: [
        { slug: 'improve-my-childs-mathematics', title: 'Improve my child’s mathematics', tagline: 'Help my child build confidence and mastery in mathematics' },
        { slug: 'improve-my-childs-english', title: 'Improve my child’s English', tagline: 'Enhance vocabulary, reading comprehension and writing' },
        { slug: 'improve-my-childs-speaking-skills', title: 'Improve my child’s speaking skills', tagline: 'Help my child become an articulate, confident speaker' },
        { slug: 'introduce-my-child-to-programming', title: 'Introduce my child to programming and technology', tagline: 'Early coding, algorithmic thinking and robotics' },
        { slug: 'enrol-my-child-in-coding-classes', title: 'Enrol my child in coding classes', tagline: 'Structured interactive software development classes' },
        { slug: 'improve-my-childs-digital-skills', title: 'Improve my child’s digital skills', tagline: 'Useful computer literacy and digital creative skills' },
        { slug: 'prepare-my-child-for-entrance-exams', title: 'Prepare my child for entrance examinations', tagline: 'Comprehensive preparation for top secondary schools' },
        { slug: 'develop-my-childs-leadership-skills', title: 'Develop my child’s leadership skills', tagline: 'Build confidence, teamwork and empathy' },
        { slug: 'get-my-child-involved-in-sports', title: 'Get my child involved in sports', tagline: 'Enrol in structured tennis, swimming and athletics' },
        { slug: 'help-my-child-learn-piano', title: 'Help my child learn piano', tagline: 'Private and group piano and keyboard lessons' },
        { slug: 'develop-my-childs-musical-ability', title: 'Develop my child’s musical ability beyond piano', tagline: 'Violin, guitar, vocals and music theory' },
        { slug: 'help-my-child-learn-martial-arts', title: 'Help my child learn martial arts', tagline: 'Karate and Taekwondo discipline and fitness' },
        { slug: 'improve-my-childs-creative-skills', title: 'Improve my child’s creative skills', tagline: 'Drawing, painting, crafts and creative expression' },
      ],
    },
  ]

  const goalIdMap = new Map<string, number>()

  for (const cat of CATEGORIES) {
    const createdCat = await prisma.upward_goal_category.create({
      data: {
        slug: cat.slug,
        title: cat.title,
        description: cat.description,
        iconName: cat.iconName,
        sortOrder: cat.sortOrder,
        status: GoalPublishStatus.PUBLISHED,
      },
    })

    console.log(`📂 Created Category: ${createdCat.title}`)

    for (const g of cat.goals) {
      const createdGoal = await prisma.upward_goal.create({
        data: {
          categoryId: createdCat.id,
          slug: g.slug,
          title: g.title,
          tagline: g.tagline,
          description: g.tagline,
          iconName: cat.iconName,
          sortOrder: 0,
          targetType: GoalTargetType.CHECKLIST_ACTIONS,
          status: GoalPublishStatus.PUBLISHED,
        },
      })
      goalIdMap.set(g.slug, createdGoal.id)
    }
  }

  // [3/4] Seed Realistic Merchants
  console.log('🏪 [3/4] Seeding realistic local vendors...')
  const vendorHomeCraft = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'HomeCraft Living Lagos',
      slug: 'homecraft-living-lagos',
      logoUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&auto=format&fit=crop&q=80',
      email: 'orders@homecraft.ng',
      rating: 4.9,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })

  const vendorPristine = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'Pristine Clean & Hygiene Co',
      slug: 'pristine-clean-co',
      logoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&auto=format&fit=crop&q=80',
      email: 'sales@pristineclean.ng',
      rating: 4.8,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.REGIONAL_ZONES,
      defaultDeliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND', 'IBADAN_METRO'],
    },
  })

  const vendorApex = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'Apex Career Consulting Ltd',
      slug: 'apex-career-consulting',
      logoUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&auto=format&fit=crop&q=80',
      email: 'advisory@apexcareer.ng',
      rating: 5.0,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.NATIONWIDE,
      defaultDeliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND', 'ABUJA_METRO'],
    },
  })

  const vendorBrightMinds = await prisma.upward_commerce_vendor.create({
    data: {
      name: 'BrightMinds Academy Lagos',
      slug: 'brightminds-academy',
      logoUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&auto=format&fit=crop&q=80',
      email: 'hello@brightminds.ng',
      rating: 4.9,
      isActive: true,
      defaultDeliveryCoverage: DeliveryCoverageType.NATIONWIDE,
      defaultDeliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })

  // [4/4] Seed the Ad Bundle and its 5 real database components
  console.log('📦 [4/4] Seeding the 5 components and the Ad Package...')

  // 1. Carpet
  const compCarpet = await prisma.upward_offering.create({
    data: {
      title: 'Premium Hand-Woven Living Room Area Carpet',
      subtitle: 'Anti-slip, stain-resistant plush woven rug (5x7 ft)',
      description: 'Plush texture woven rug designed for modern apartments. Easy to spot-clean, anti-slip backing.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 38000,
      currency: 'NGN',
      vendorId: vendorHomeCraft.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: compCarpet.id,
      mediaUrl: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 2. Footmats & Slippers
  const compFootmats = await prisma.upward_offering.create({
    data: {
      title: 'Memory Foam Bathroom Mats & Slipper Set',
      subtitle: 'Ultra-absorbent high density microfiber comfort mats with soft house slippers',
      description: 'High-density memory foam bath mats with quick-dry microfiber and slip-resistant indoor slippers.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 18000,
      currency: 'NGN',
      vendorId: vendorHomeCraft.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: compFootmats.id,
      mediaUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 3. Cleaning & Disinfectant Kit
  const compCleaning = await prisma.upward_offering.create({
    data: {
      title: 'Apartment Renewal Deep Cleaning & Disinfectant Kit',
      subtitle: 'Multipurpose cleaning liquid, surface disinfectant, bleach & cleaning gloves',
      description: 'Complete apartment sanitation set: 5L multipurpose liquid, hospital-grade disinfectant, toilet cleaner, and heavy-duty nitrile gloves.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 22000,
      currency: 'NGN',
      vendorId: vendorPristine.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: compCleaning.id,
      mediaUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 4. Mop & Floor Wiper
  const compMop = await prisma.upward_offering.create({
    data: {
      title: 'Heavy-Duty Dual Spin Mop & Floor Wiper Set',
      subtitle: 'Stainless steel spin mop bucket system, floor wiper & microfiber refill heads',
      description: 'Effortless 360-degree spin cleaning system with rapid dehydration bucket and silicone floor wiper squeegee.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 16000,
      currency: 'NGN',
      vendorId: vendorPristine.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: compMop.id,
      mediaUrl: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // 5. Towels & Kitchen Dining Essentials
  const compTowels = await prisma.upward_offering.create({
    data: {
      title: 'Luxury Turkish Bath & Kitchen Towels Pack',
      subtitle: '100% Ring-spun combed cotton towels, dishwashing sponges & cutlery drying mat',
      description: 'Plush 600 GSM bath towels (4-pack) with matching waffle-weave kitchen dish towels and absorbent drying mat.',
      type: OfferingType.PRODUCT,
      pricingModel: OfferingPricingModel.FIXED,
      price: 14000,
      currency: 'NGN',
      vendorId: vendorHomeCraft.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: compTowels.id,
      mediaUrl: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // Now create the Parent Promo Bundle with the EXACT UUID that matches the Ad
  const promoBundle = await prisma.upward_offering.create({
    data: {
      uuid: '1e080fc4-8488-4da1-9fb7-63544a18cfae',
      title: 'New Year Home Refresh Bundle',
      subtitle: 'Curated carpets, footmats, luxury towels & apartment renewal cleaning kit',
      description:
        'A comprehensive move-in and seasonal refresh kit designed for modern apartments. Includes plush hallway carpet, memory foam bath mats, complete deep sanitation kit, 360-spin mop, and luxury cotton towels.',
      type: OfferingType.BUNDLE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 85000,
      minPrice: 85000,
      maxPrice: 108000,
      currency: 'NGN',
      vendorId: vendorHomeCraft.id,
      status: GoalPublishStatus.PUBLISHED,
      isFeatured: false,
      isPromoted: true,
      promoBadge: 'HOME REFRESH',
      promoTitle: 'Prepare Your Home for the New Year',
      promoSubtitle: 'Curated carpets, footmats, towels & cleaning bundle',
      promoCoverImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1000&auto=format&fit=crop&q=80',
      promoPriority: 100,
      deliveryAvailable: true,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
      deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'],
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: promoBundle.id,
      mediaUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })

  // Attach all 5 real database components to the Bundle via upward_package_item
  // Total retail: 38k + 18k + 22k + 16k + 14k = 108,000 NGN
  // Bundle price: 30k + 14k + 18k + 13k + 10k = 85,000 NGN (21% OFF!)
  await prisma.upward_package_item.createMany({
    data: [
      {
        packageId: promoBundle.id,
        componentId: compCarpet.id,
        quantity: 1,
        isOptional: true,
        overridePrice: 30000,
        sortOrder: 1,
      },
      {
        packageId: promoBundle.id,
        componentId: compFootmats.id,
        quantity: 1,
        isOptional: true,
        overridePrice: 14000,
        sortOrder: 2,
      },
      {
        packageId: promoBundle.id,
        componentId: compCleaning.id,
        quantity: 1,
        isOptional: true,
        overridePrice: 18000,
        sortOrder: 3,
      },
      {
        packageId: promoBundle.id,
        componentId: compMop.id,
        quantity: 1,
        isOptional: true,
        overridePrice: 13000,
        sortOrder: 4,
      },
      {
        packageId: promoBundle.id,
        componentId: compTowels.id,
        quantity: 1,
        isOptional: true,
        overridePrice: 10000,
        sortOrder: 5,
      },
    ],
  })

  // Link the bundle to its goals: prepare-for-the-new-year and improve-my-home-feel
  const homeRefreshGoalId = goalIdMap.get('prepare-for-the-new-year')
  const homeFeelGoalId = goalIdMap.get('improve-my-home-feel')
  if (homeRefreshGoalId) {
    await prisma.upward_goal_offering.create({
      data: {
        goalId: homeRefreshGoalId,
        offeringId: promoBundle.id,
        isRecommended: true,
        relevanceScore: 100,
        sortOrder: 0,
      },
    })
  }
  if (homeFeelGoalId) {
    await prisma.upward_goal_offering.create({
      data: {
        goalId: homeFeelGoalId,
        offeringId: promoBundle.id,
        isRecommended: true,
        relevanceScore: 100,
        sortOrder: 0,
      },
    })
  }

  // Also link each component to home-feel / home-refresh goals
  for (const c of [compCarpet, compFootmats, compCleaning, compMop, compTowels]) {
    if (homeRefreshGoalId) {
      await prisma.upward_goal_offering.create({
        data: {
          goalId: homeRefreshGoalId,
          offeringId: c.id,
          isRecommended: false,
          relevanceScore: 80,
          sortOrder: 1,
        },
      })
    }
    if (homeFeelGoalId) {
      await prisma.upward_goal_offering.create({
        data: {
          goalId: homeFeelGoalId,
          offeringId: c.id,
          isRecommended: false,
          relevanceScore: 80,
          sortOrder: 1,
        },
      })
    }
  }

  // Seed Clean Additional Marketplace Offerings strictly linked to the other 3 categories
  // Income & Financial
  const freelancingGoalId = goalIdMap.get('start-freelancing')
  const sideHustleGoalId = goalIdMap.get('start-a-side-hustle')
  const offIncome = await prisma.upward_offering.create({
    data: {
      title: 'Freelance & Side Hustle Client Acquisition Masterclass',
      subtitle: 'Hands-on practical workshop to land remote dollar-paying clients',
      description: 'Structured 4-week cohort covering portfolio building, proposal writing, and international payment setups.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 45000,
      currency: 'NGN',
      vendorId: vendorApex.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: false,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: offIncome.id,
      mediaUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })
  if (freelancingGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: freelancingGoalId, offeringId: offIncome.id, isRecommended: true, relevanceScore: 90, sortOrder: 0 },
    })
  }
  if (sideHustleGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: sideHustleGoalId, offeringId: offIncome.id, isRecommended: true, relevanceScore: 85, sortOrder: 1 },
    })
  }

  // Career & Professional
  const techGoalId = goalIdMap.get('switch-career-to-tech')
  const pmpGoalId = goalIdMap.get('get-a-professional-certification')
  const offCareer = await prisma.upward_offering.create({
    data: {
      title: 'PMP Certification Exam Prep & Mentorship Package',
      subtitle: 'Official PMI-aligned 35 contact hours with exam simulator and coaching',
      description: 'Comprehensive certification accelerator led by certified Project Management Professionals.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 120000,
      currency: 'NGN',
      vendorId: vendorApex.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: false,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: offCareer.id,
      mediaUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })
  if (pmpGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: pmpGoalId, offeringId: offCareer.id, isRecommended: true, relevanceScore: 95, sortOrder: 0 },
    })
  }
  if (techGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: techGoalId, offeringId: offCareer.id, isRecommended: false, relevanceScore: 80, sortOrder: 1 },
    })
  }

  // Children's Development
  const codingGoalId = goalIdMap.get('enrol-my-child-in-coding-classes')
  const mathGoalId = goalIdMap.get('improve-my-childs-mathematics')
  const offKids = await prisma.upward_offering.create({
    data: {
      title: 'Junior STEM & Scratch Coding Weekend Bootcamp',
      subtitle: 'Interactive robotics and algorithmic game development for ages 7-15',
      description: 'Small group interactive coding lessons teaching Python fundamentals, Scratch animations, and problem solving.',
      type: OfferingType.SERVICE,
      pricingModel: OfferingPricingModel.FIXED,
      price: 55000,
      currency: 'NGN',
      vendorId: vendorBrightMinds.id,
      status: GoalPublishStatus.PUBLISHED,
      deliveryAvailable: false,
      deliveryCoverageType: DeliveryCoverageType.NATIONWIDE,
    },
  })
  await prisma.upward_offering_media.create({
    data: {
      offeringId: offKids.id,
      mediaUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
      isPrimary: true,
      sortOrder: 0,
    },
  })
  if (codingGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: codingGoalId, offeringId: offKids.id, isRecommended: true, relevanceScore: 95, sortOrder: 0 },
    })
  }
  if (mathGoalId) {
    await prisma.upward_goal_offering.create({
      data: { goalId: mathGoalId, offeringId: offKids.id, isRecommended: true, relevanceScore: 90, sortOrder: 1 },
    })
  }

  console.log('🎉 [DONE] Clean DB reset & reseed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during clean reseed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
