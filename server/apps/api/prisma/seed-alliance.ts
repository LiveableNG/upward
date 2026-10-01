import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Encryption & Hashing Helpers matching NestJS production standards
function hash(text: string): string {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex')
}

function encrypt(text: string): string {
  const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
  const key = Buffer.from(hexKey, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

const REAL_ESTATE_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
]

async function seedAlliance() {
  console.log('🚀 Starting Upward Alliance Master Data Seed...\n')

  const defaultPassword = 'Password123'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // 1. Clean up existing Alliance data safely
  console.log('🧹 Clearing existing alliance tables...')
  await (prisma as any).upward_alliance_rating.deleteMany({})
  await (prisma as any).upward_alliance_commission.deleteMany({})
  await (prisma as any).upward_alliance_referral.deleteMany({})
  await (prisma as any).upward_alliance_listing_tracker.deleteMany({})
  await (prisma as any).upward_alliance_listing_media.deleteMany({})
  await (prisma as any).upward_alliance_listing.deleteMany({})
  await (prisma as any).upward_alliance_pm_qualification.deleteMany({})
  await (prisma as any).upward_alliance_pm_profile.deleteMany({})
  await (prisma as any).upward_alliance_qualification.deleteMany({})
  console.log('✅ Cleared alliance tables.\n')

  // 2. Upsert Master Qualifications & Badges
  console.log('🏅 Seeding Real Estate Industry Badges & Qualifications...')
  const qualificationsData = [
    {
      slug: 'niesv-fellow',
      name: 'NIESV Fellow',
      description: 'Fellow Member of the Nigerian Institution of Estate Surveyors and Valuers (Highest Professional Cadre)',
    },
    {
      slug: 'niesv-registered',
      name: 'NIESV Registered Member',
      description: 'Registered Member of the Nigerian Institution of Estate Surveyors and Valuers',
    },
    {
      slug: 'estate-surveyor-valuer',
      name: 'Estate Surveyor & Valuer',
      description: 'Fully Registered and Licensed by the Estate Surveyors and Valuers Registration Board of Nigeria (ESVARBON)',
    },
    {
      slug: 'upward-academy-graduate',
      name: 'Upward Academy Graduate',
      description: 'Certified Graduate of Upward Executive Real Estate & Property Management Masterclass',
    },
    {
      slug: 'certified-property-manager',
      name: 'Certified Property Manager',
      description: 'Certified CPM Practitioner with demonstrated residential & commercial management excellence',
    },
    {
      slug: 'top-co-broker-2026',
      name: 'Top Co-Broker 2026',
      description: 'Premier Verified Alliance Broker with over ₦50M+ in successful cross-firm closed deal volume',
    },
  ]

  const qualMap: Record<string, any> = {}
  for (const q of qualificationsData) {
    const created = await (prisma as any).upward_alliance_qualification.create({
      data: {
        slug: q.slug,
        name: q.name,
        description: q.description,
        isActive: true,
      },
    })
    qualMap[q.slug] = created
  }
  console.log(`✅ Seeded ${Object.keys(qualMap).length} Professional Qualifications & Badges.\n`)

  // 3. Ensure 4 Property Managers Exist & Enable Alliance Profiles
  console.log('👥 Seeding Property Manager Personas & Alliance Profiles...')

  const pmPersonas = [
    {
      email: 'pm@goodtenants.africa',
      firstName: 'Segun',
      lastName: 'Akin',
      businessName: 'Akin Properties Ltd',
      phone: '+2348031234567',
      title: 'Principal Broker & Managing Director',
      bio: 'Over 14 years managing premier residential and luxury commercial assets in Lekki Phase 1, Ikoyi & Victoria Island. NIESV Fellow and top alliance co-broker.',
      badges: ['niesv-fellow', 'upward-academy-graduate', 'top-co-broker-2026'],
    },
    {
      email: 'funke@primenest.ng',
      firstName: 'Funke',
      lastName: 'Balogun',
      businessName: 'PrimeNest Realty',
      phone: '+2348029876543',
      title: 'Head of Luxury Residential',
      bio: 'Specializing in ultra-luxury penthouses, serviced apartments and diplomatic leases in Maitama, Guzape and Wuse 2, Abuja.',
      badges: ['estate-surveyor-valuer', 'certified-property-manager', 'top-co-broker-2026'],
    },
    {
      email: 'emeka@crownheritage.ng',
      firstName: 'Emeka',
      lastName: 'Okafor',
      businessName: 'Crown Heritage Estates',
      phone: '+2348051122334',
      title: 'Commercial Asset Manager',
      bio: 'Commercial leasing and mixed-use property portfolio management across Ikeja GRA, Maryland and Victoria Island.',
      badges: ['niesv-registered', 'upward-academy-graduate'],
    },
    {
      email: 'amina@zumavista.ng',
      firstName: 'Amina',
      lastName: 'Bello',
      businessName: 'Zuma Vista Properties',
      phone: '+2348099887766',
      title: 'Managing Partner',
      bio: 'Abuja and Kaduna residential management, modern terraces, and high-yield serviced housing for professionals.',
      badges: ['certified-property-manager', 'upward-academy-graduate'],
    },
  ]

  const seededPms: Array<{ pm: any; persona: typeof pmPersonas[0] }> = []

  for (const persona of pmPersonas) {
    let pm = await prisma.upward_property_manager.findFirst({
      where: { emailHash: hash(persona.email) },
    })

    if (!pm) {
      pm = await prisma.upward_property_manager.create({
        data: {
          email: persona.email,
          emailHash: hash(persona.email),
          passwordHash,
          firstName: persona.firstName,
          firstNameHash: encrypt(persona.firstName),
          lastName: persona.lastName,
          lastNameHash: encrypt(persona.lastName),
          businessName: persona.businessName,
          pmType: 'INDIVIDUAL',
          phone: persona.phone,
          phoneHash: encrypt(persona.phone),
          isVerified: true,
          country: 'Nigeria',
        },
      })
    } else {
      pm = await prisma.upward_property_manager.update({
        where: { id: pm.id },
        data: {
          businessName: persona.businessName,
          isVerified: true,
        },
      })
    }

    // Upsert Alliance PM Profile
    await (prisma as any).upward_alliance_pm_profile.upsert({
      where: { pmId: pm.id },
      create: {
        pmId: pm.id,
        isEnabled: true,
        enabledAt: new Date(),
        pmTitle: persona.title,
        bio: persona.bio,
      },
      update: {
        isEnabled: true,
        enabledAt: new Date(),
        pmTitle: persona.title,
        bio: persona.bio,
      },
    })

    // Assign PM Badges
    for (const badgeSlug of persona.badges) {
      const q = qualMap[badgeSlug]
      if (q) {
        await (prisma as any).upward_alliance_pm_qualification.upsert({
          where: {
            pmId_qualificationId: {
              pmId: pm.id,
              qualificationId: q.id,
            },
          },
          create: {
            pmId: pm.id,
            qualificationId: q.id,
            assignedAt: new Date(),
          },
          update: {
            assignedAt: new Date(),
          },
        })
      }
    }

    seededPms.push({ pm, persona })
    console.log(`✅ Configured PM Persona: ${persona.firstName} ${persona.lastName} (${persona.businessName})`)
  }

  const primaryPm = seededPms[0].pm // Segun Akin (pm@goodtenants.africa)
  const funkePm = seededPms[1].pm
  const emekaPm = seededPms[2].pm
  const aminaPm = seededPms[3].pm

  // 4. Create/Ensure Test Tenant User (Bolu Adebayo)
  console.log('\n👤 Seeding Tenant User Account...')
  const tenantEmail = 'tenant@goodtenants.africa'
  let tenantUser = await prisma.upward_user.findFirst({
    where: { emailHash: hash(tenantEmail) },
  })

  if (!tenantUser) {
    tenantUser = await prisma.upward_user.create({
      data: {
        email: tenantEmail,
        emailHash: hash(tenantEmail),
        passwordHash,
        firstName: 'Bolu',
        firstNameHash: encrypt('Bolu'),
        lastName: 'Adebayo',
        lastNameHash: encrypt('Adebayo'),
        phone: '+2348037654321',
        phoneHash: encrypt('+2348037654321'),
        profileSlug: 'bolu-adebayo',
        isIdentityVerified: true,
      },
    })
  }

  const clientUsers = [
    tenantUser,
    await prisma.upward_user.upsert({
      where: { emailHash: hash('tunde.bello@example.com') },
      create: {
        email: 'tunde.bello@example.com',
        emailHash: hash('tunde.bello@example.com'),
        passwordHash,
        firstName: 'Tunde',
        firstNameHash: encrypt('Tunde'),
        lastName: 'Bello',
        lastNameHash: encrypt('Bello'),
        phone: '+2348033334455',
        phoneHash: encrypt('+2348033334455'),
        profileSlug: 'tunde-bello',
        isIdentityVerified: true,
      },
      update: {},
    }),
    await prisma.upward_user.upsert({
      where: { emailHash: hash('chidinma.n@example.com') },
      create: {
        email: 'chidinma.n@example.com',
        emailHash: hash('chidinma.n@example.com'),
        passwordHash,
        firstName: 'Chidinma',
        firstNameHash: encrypt('Chidinma'),
        lastName: 'Nwosu',
        lastNameHash: encrypt('Nwosu'),
        phone: '+2348077778899',
        phoneHash: encrypt('+2348077778899'),
        profileSlug: 'chidinma-nwosu',
        isIdentityVerified: true,
      },
      update: {},
    }),
  ]
  console.log(`✅ Tenant & Client Accounts Ready (${clientUsers.length} clients)\n`)

  // 5. Seed 32 Realistic Marketplace Listings with Media
  console.log('🏘️ Seeding 32 Luxury & Verified Marketplace Listings...')

  const rawListingsData = [
    // Segun Akin (Lagos Prime)
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Luxurious 4-Bedroom Waterfront Villa with Private Jetty',
      description: 'Exquisite modern waterfront villa situated in the heart of Lekki Phase 1. Features smart home automation, Olympic-sized swimming pool, private boat jetty, fitted Italian kitchen, and 2-room staff quarters.',
      price: 18000000,
      currency: 'NGN',
      propertyType: 'Villa',
      bedrooms: 4,
      bathrooms: 5,
      address: 'Admiralty Way, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[2]],
    },
    {
      pmId: primaryPm.id,
      intent: 'SALE',
      title: 'Contemporary 5-Bedroom Detached Mansion in Banana Island',
      description: 'Ultra-luxury contemporary mansion with direct lagoon views in Banana Island, Ikoyi. Complete with cinema room, private elevator, rooftop lounge, and 6-car basement garage.',
      price: 450000000,
      currency: 'NGN',
      propertyType: 'Detached Mansion',
      bedrooms: 5,
      bathrooms: 6,
      address: 'Zone B, Banana Island, Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[3], REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[5]],
    },
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Modern 3-Bedroom Serviced Apartment with Ocean Views',
      description: 'Fully serviced luxury apartment on high floor with panoramic views of the Atlantic. 24/7 uninterrupted power, concierge desk, gym, pool, and biometric access control.',
      price: 9500000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Ahmadu Bello Way, Victoria Island',
      city: 'Victoria Island',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[6], REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[8]],
    },
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Chic 2-Bedroom Minimalist Penthouse with Rooftop Terrace',
      description: 'Sophisticated minimalist penthouse designed for executives and expatriates. Features private wrap-around terrace, floor-to-ceiling glass walls, and designer furnishings.',
      price: 7500000,
      currency: 'NGN',
      propertyType: 'Penthouse',
      bedrooms: 2,
      bathrooms: 2,
      address: 'Oniru Estate, Victoria Island Extension',
      city: 'Victoria Island',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[10], REAL_ESTATE_PHOTOS[11]],
    },
    {
      pmId: primaryPm.id,
      intent: 'SALE',
      title: 'Brand New 4-Bedroom Semi-Detached Duplex with BQ',
      description: 'Newly developed modern duplex in a gated estate with perimeter security, paved access roads, CCTV surveillance, and stamped concrete compound.',
      price: 135000000,
      currency: 'NGN',
      propertyType: 'Semi-Detached Duplex',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Chevron Tollgate Area, Lekki',
      city: 'Lekki',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[3], REAL_ESTATE_PHOTOS[5]],
    },
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Executive 3-Bedroom Terrace with Private Garden',
      description: 'Quiet residential terrace in upscale Ikoyi close to diplomatic missions. Features verdant private garden, dedicated inverter backup, and high-security access.',
      price: 14000000,
      currency: 'NGN',
      propertyType: 'Terraced House',
      bedrooms: 3,
      bathrooms: 4,
      address: 'Bour Bourdillon Road, Old Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[2], REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[6]],
    },
    {
      pmId: primaryPm.id,
      intent: 'SALE',
      title: 'Commercial Office Building (5 Floors) on Prime Corner Plot',
      description: 'Grade-A commercial property with high rental yield. Ample surface and underground parking, central HVAC system, and passenger elevators.',
      price: 380000000,
      currency: 'NGN',
      propertyType: 'Commercial Office',
      bedrooms: 0,
      bathrooms: 10,
      address: 'Ozumba Mbadiwe Avenue, Victoria Island',
      city: 'Victoria Island',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[0]],
    },
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Serviced 1-Bedroom Studio Loft for Young Professionals',
      description: 'Turnkey fully furnished studio loft featuring high ceilings, high-speed fiber internet, housekeeping options, and seamless rental billing on Upward Pay.',
      price: 3200000,
      currency: 'NGN',
      propertyType: 'Studio / Mini Flat',
      bedrooms: 1,
      bathrooms: 1,
      address: 'Freedom Way, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[10]],
    },

    // Funke Balogun (Abuja Luxury)
    {
      pmId: funkePm.id,
      intent: 'RENT',
      title: 'Diplomatic 5-Bedroom Ambassadorial Villa in Maitama',
      description: 'Magnificent residence built to international diplomatic standards. Bullet-resistant glass, perimeter electric fencing, guard house, infinity pool, and banquet hall.',
      price: 35000000,
      currency: 'NGN',
      propertyType: 'Villa',
      bedrooms: 5,
      bathrooms: 6,
      address: 'Gana Street, Maitama',
      city: 'Maitama',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[11], REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[2]],
    },
    {
      pmId: funkePm.id,
      intent: 'SALE',
      title: 'Opulent 4-Bedroom Penthouse with Panoramic City Views',
      description: 'Perched on the highest point in Guzape with 360-degree views of the federal capital. Private jacuzzi on terrace, smart automated lighting, and marble finishes.',
      price: 260000000,
      currency: 'NGN',
      propertyType: 'Penthouse',
      bedrooms: 4,
      bathrooms: 5,
      address: 'Diplomatic Enclave, Guzape',
      city: 'Guzape',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[6], REAL_ESTATE_PHOTOS[8]],
    },
    {
      pmId: funkePm.id,
      intent: 'RENT',
      title: 'Serviced 3-Bedroom Apartment in Prime Wuse 2',
      description: 'Centrally located luxury apartment within walking distance of top dining and business centers. Underground parking, central generator, and 24-hour facility manager.',
      price: 8500000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Adetokunbo Ademola Crescent, Wuse 2',
      city: 'Wuse 2',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[9]],
    },
    {
      pmId: funkePm.id,
      intent: 'SALE',
      title: 'Smart 4-Bedroom Terraced Duplex with Solar Grid',
      description: 'Eco-conscious luxury residence equipped with a 15kVA integrated solar hybrid inverter, premium European sanitary fittings, and expansive master suite.',
      price: 110000000,
      currency: 'NGN',
      propertyType: 'Terraced House',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Jabi Lake District',
      city: 'Jabi',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[3], REAL_ESTATE_PHOTOS[5], REAL_ESTATE_PHOTOS[10]],
    },
    {
      pmId: funkePm.id,
      intent: 'RENT',
      title: 'Furnished 2-Bedroom Executive Apartment near Central Business District',
      description: 'Ideal for consultants and government contractors. Fully equipped kitchen, daily housekeeping service, and dedicated workspace.',
      price: 5500000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      address: 'Constitution Avenue, Central Business District',
      city: 'Abuja CBD',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[2], REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[11]],
    },
    {
      pmId: funkePm.id,
      intent: 'SALE',
      title: 'Palatial 6-Bedroom Mansion on 2,000 sqm Plot',
      description: 'Spectacular compound with expansive landscaped garden, gazebo, detached guest chalet, water treatment plant, and twin security post.',
      price: 520000000,
      currency: 'NGN',
      propertyType: 'Detached Mansion',
      bedrooms: 6,
      bathrooms: 7,
      address: 'Asokoro Extension, Asokoro',
      city: 'Asokoro',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[7]],
    },

    // Emeka Okafor (Commercial & Lagos Mainland/Island)
    {
      pmId: emekaPm.id,
      intent: 'RENT',
      title: 'Classic 4-Bedroom Colonial Style Detached House in Ikeja GRA',
      description: 'Rare opportunity in prime Ikeja GRA. Sits on over 1,200 sqm of lush grounds with mature trees. Suitable for residential or quiet professional office use.',
      price: 15000000,
      currency: 'NGN',
      propertyType: 'Detached House',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Isaac John Street, Ikeja GRA',
      city: 'Ikeja',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[5], REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[1]],
    },
    {
      pmId: emekaPm.id,
      intent: 'SALE',
      title: 'Prime 3-Bedroom High-End Apartment in Maryland Gated Estate',
      description: 'Well-appointed apartment with easy arterial access to Third Mainland Bridge and Murtala Muhammed International Airport. Secure private enclave.',
      price: 68000000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Maryland Crescent, Maryland',
      city: 'Maryland',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[6], REAL_ESTATE_PHOTOS[10], REAL_ESTATE_PHOTOS[2]],
    },
    {
      pmId: emekaPm.id,
      intent: 'RENT',
      title: 'Modern Open-Plan Commercial Showroom & Office Space',
      description: 'Double-volume ceiling showroom on high-traffic commercial corridor. Glass facade, backup power, and dedicated customer parking lot.',
      price: 22000000,
      currency: 'NGN',
      propertyType: 'Commercial Showroom',
      bedrooms: 0,
      bathrooms: 4,
      address: 'Mobolaji Bank Anthony Way, Ikeja',
      city: 'Ikeja',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[11], REAL_ESTATE_PHOTOS[3]],
    },
    {
      pmId: emekaPm.id,
      intent: 'SALE',
      title: '5-Bedroom Contemporary Terrace with Swimming Pool',
      description: 'Excellently constructed terrace in a boutique community of only 4 units. Modern kitchen island, en-suite rooms, and treated industrial borehole.',
      price: 145000000,
      currency: 'NGN',
      propertyType: 'Terraced House',
      bedrooms: 5,
      bathrooms: 5,
      address: 'GRA Phase 2, Magodo',
      city: 'Magodo',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[4]],
    },
    {
      pmId: emekaPm.id,
      intent: 'RENT',
      title: 'Serviced 2-Bedroom Flat in Gated Shonibare Estate',
      description: 'Serene executive accommodation inside one of Mainland’s most secured estates. Ideal for expatriates and corporate executives.',
      price: 6000000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      address: 'Shonibare Estate, Maryland',
      city: 'Maryland',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[5]],
    },
    {
      pmId: emekaPm.id,
      intent: 'SALE',
      title: 'Residential Land with Governor’s Consent (900 sqm)',
      description: 'Fully dry corner-piece plot ready for immediate development. Clear title documents, perimeter fencing, and access to central drainage.',
      price: 95000000,
      currency: 'NGN',
      propertyType: 'Residential Land',
      bedrooms: 0,
      bathrooms: 0,
      address: 'Parkview Estate Extension, Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[10], REAL_ESTATE_PHOTOS[2], REAL_ESTATE_PHOTOS[6]],
    },

    // Amina Bello (Suburban & Young Executive Housing)
    {
      pmId: aminaPm.id,
      intent: 'RENT',
      title: 'Contemporary 3-Bedroom Townhouse with Smart Locks',
      description: 'Spacious townhouse in a brand new family-oriented gated community. Children playground, basketball court, and 24/7 security patrol.',
      price: 4800000,
      currency: 'NGN',
      propertyType: 'Townhouse',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Lokogoma District',
      city: 'Lokogoma',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[11], REAL_ESTATE_PHOTOS[3], REAL_ESTATE_PHOTOS[7]],
    },
    {
      pmId: aminaPm.id,
      intent: 'SALE',
      title: '4-Bedroom Detached Bungalow with 2-Room BQ',
      description: 'Solidly built bungalow with expansive compound for future expansion. Ample parking for 8 cars, security house, and overhead water tank.',
      price: 75000000,
      currency: 'NGN',
      propertyType: 'Bungalow',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Kado Estate, Kado',
      city: 'Kado',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[8]],
    },
    {
      pmId: aminaPm.id,
      intent: 'RENT',
      title: 'Modern 1-Bedroom Serviced Apartment in Life Camp',
      description: 'Quiet and scenic neighborhood close to international schools and embassies. Fitted kitchen, backup solar inverter, and paved access.',
      price: 2800000,
      currency: 'NGN',
      propertyType: 'Studio / Mini Flat',
      bedrooms: 1,
      bathrooms: 1,
      address: 'Life Camp Extension',
      city: 'Life Camp',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[5], REAL_ESTATE_PHOTOS[9]],
    },
    {
      pmId: aminaPm.id,
      intent: 'SALE',
      title: 'Luxury 5-Bedroom Fully Detached Duplex in Gwarinpa',
      description: 'Architectural masterpiece in West Africa’s largest planned estate. Turkish security doors, POP ceiling designs, and jacuzzi bath in master suite.',
      price: 160000000,
      currency: 'NGN',
      propertyType: 'Detached Duplex',
      bedrooms: 5,
      bathrooms: 5,
      address: '1st Avenue, Gwarinpa',
      city: 'Gwarinpa',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[2], REAL_ESTATE_PHOTOS[6], REAL_ESTATE_PHOTOS[10]],
    },
    {
      pmId: aminaPm.id,
      intent: 'RENT',
      title: 'Newly Built 2-Bedroom Flat in Katampe Main',
      description: 'Elevated location offering cool breezes and scenic hills view. Intercom system, dedicated transformer, and professional management.',
      price: 3600000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      address: 'Katampe Hills, Katampe',
      city: 'Katampe',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[3], REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[11]],
    },
    {
      pmId: aminaPm.id,
      intent: 'SALE',
      title: 'Block of 6 Units of 2-Bedroom Flats (Investment Asset)',
      description: 'High rental yield investment property with 100% occupancy rate. Steady rental cashflow with instant tenant transition upon acquisition.',
      price: 190000000,
      currency: 'NGN',
      propertyType: 'Multi-Family Residential',
      bedrooms: 12,
      bathrooms: 12,
      address: 'Lugbe Airport Road Corridor',
      city: 'Lugbe',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[4], REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[0]],
    },

    // Additional Diverse Market Properties (for 32 Total Count)
    {
      pmId: primaryPm.id,
      intent: 'RENT',
      title: 'Serviced 3-Bedroom Apartment in Lekki Phase 1 Right Side',
      description: 'Prime Lekki right side address. Features gym, swimming pool, water treatment plant, and round-the-clock uniform security personnel.',
      price: 8000000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Fola Osibo Street, Lekki Phase 1',
      city: 'Lekki',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[5], REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[1]],
    },
    {
      pmId: primaryPm.id,
      intent: 'SALE',
      title: 'Exquisite 4-Bedroom Semi-Detached with Rooftop Gazebo',
      description: 'Magnificent family home featuring private cinema, rooftop entertainment lounge, and smart app-controlled access gate.',
      price: 175000000,
      currency: 'NGN',
      propertyType: 'Semi-Detached Duplex',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Ikate Elegushi, Lekki',
      city: 'Lekki',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[6], REAL_ESTATE_PHOTOS[10], REAL_ESTATE_PHOTOS[2]],
    },
    {
      pmId: funkePm.id,
      intent: 'RENT',
      title: 'Executive 4-Bedroom Serviced Terrace with Swimming Pool',
      description: 'Premier residential community in Jabi Lake area. Central generator with automated switch, private backyard, and fitted wardrobes.',
      price: 11000000,
      currency: 'NGN',
      propertyType: 'Terraced House',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Alex Ekwueme Way, Jabi',
      city: 'Jabi',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[7], REAL_ESTATE_PHOTOS[11], REAL_ESTATE_PHOTOS[3]],
    },
    {
      pmId: emekaPm.id,
      intent: 'RENT',
      title: 'Spacious 3-Bedroom Flat with Modern Fitted Kitchen in Yaba',
      description: 'Convenient mainland hub close to tech clusters and universities. Prepaid smart meter, treated water supply, and secure perimeter gate.',
      price: 3500000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 3,
      bathrooms: 3,
      address: 'Commercial Avenue, Yaba',
      city: 'Yaba',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[8], REAL_ESTATE_PHOTOS[0], REAL_ESTATE_PHOTOS[4]],
    },
    {
      pmId: aminaPm.id,
      intent: 'RENT',
      title: 'Cozy 2-Bedroom Serviced Apartment in Utako',
      description: 'Centrally situated minutes away from Utako Market and Jabi Lake Mall. Dedicated facility manager and round-the-clock security.',
      price: 4200000,
      currency: 'NGN',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 2,
      address: 'Shehu Yaradua Way, Utako',
      city: 'Utako',
      state: 'Abuja (FCT)',
      photos: [REAL_ESTATE_PHOTOS[9], REAL_ESTATE_PHOTOS[1], REAL_ESTATE_PHOTOS[5]],
    },
    {
      pmId: primaryPm.id,
      intent: 'SALE',
      title: 'Luxury 4-Bedroom Maisonette in Old Ikoyi',
      description: 'Rare low-density development with expansive living rooms, floor-to-ceiling windows, and private elevator landing.',
      price: 290000000,
      currency: 'NGN',
      propertyType: 'Maisonette',
      bedrooms: 4,
      bathrooms: 4,
      address: 'Cooper Road, Ikoyi',
      city: 'Ikoyi',
      state: 'Lagos',
      photos: [REAL_ESTATE_PHOTOS[10], REAL_ESTATE_PHOTOS[2], REAL_ESTATE_PHOTOS[6]],
    },
  ]

  const createdListings: any[] = []

  for (let i = 0; i < rawListingsData.length; i++) {
    const item = rawListingsData[i]
    const listing = await (prisma as any).upward_alliance_listing.create({
      data: {
        pmId: item.pmId,
        sourceType: 'INDEPENDENT',
        targetType: 'PROPERTY',
        intent: item.intent,
        status: 'PUBLISHED',
        visibility: 'ALLIANCE',
        title: item.title,
        description: item.description,
        currency: item.currency,
        price: item.price,
        address: item.address,
        city: item.city,
        state: item.state,
        country: 'Nigeria',
        propertyType: item.propertyType,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        publishedAt: new Date(),
      },
    })

    // Attach 3 Media Photos to each listing
    for (let m = 0; m < item.photos.length; m++) {
      await (prisma as any).upward_alliance_listing_media.create({
        data: {
          listingId: listing.id,
          storageKey: `mock/listings/${listing.uuid}/photo-${m + 1}.jpg`,
          publicUrl: item.photos[m],
          mimeType: 'image/jpeg',
          fileSize: 1024 * 1024 * 2, // 2MB
          sortOrder: m,
        },
      })
    }

    createdListings.push(listing)
  }
  console.log(`✅ Seeded ${createdListings.length} Published Alliance Listings with Multi-Photo Media.\n`)

  // 6. Seed Co-Broker Listing Trackers
  console.log('📌 Seeding Co-Broker Tracked Listings (Bookmarks)...')
  // Segun tracks 6 listings from Funke, Emeka, and Amina
  const otherListings = createdListings.filter((l) => l.pmId !== primaryPm.id)
  for (let i = 0; i < Math.min(6, otherListings.length); i++) {
    await (prisma as any).upward_alliance_listing_tracker.create({
      data: {
        listingId: otherListings[i].id,
        trackerPmId: primaryPm.id,
      },
    })
  }

  // Funke and Emeka track some of Segun's listings
  const segunListings = createdListings.filter((l) => l.pmId === primaryPm.id)
  for (let i = 0; i < Math.min(3, segunListings.length); i++) {
    await (prisma as any).upward_alliance_listing_tracker.create({
      data: {
        listingId: segunListings[i].id,
        trackerPmId: funkePm.id,
      },
    })
    await (prisma as any).upward_alliance_listing_tracker.create({
      data: {
        listingId: segunListings[i].id,
        trackerPmId: emekaPm.id,
      },
    })
  }
  console.log('✅ Seeded 12 Co-Broker Listing Trackers.\n')

  // 7. Seed Active Referral Pipeline covering EVERY STAGE for Segun Akin
  console.log('📈 Seeding Active Referral Deals across All Pipeline Stages...')

  const pipelineStagesData = [
    {
      stage: 'NEW',
      status: 'ACTIVE',
      clientName: 'Dr. Kelechi Anya',
      clientEmail: 'kelechi.anya@hospital.ng',
      clientPhone: '+2348039988112',
      notes: 'Inquired via WhatsApp link. Looking for a 3-bedroom apartment in Victoria Island for a 2-year hospital residency.',
      listing: segunListings[2],
      matchedUser: null,
    },
    {
      stage: 'CONTACTED',
      status: 'ACTIVE',
      clientName: 'Mrs. Zainab Danjuma',
      clientEmail: 'zainab.danjuma@zenithbank.com',
      clientPhone: '+2348021133557',
      notes: 'Introductory phone call completed. Client requested video walkthrough before physical viewing.',
      listing: segunListings[3],
      matchedUser: null,
    },
    {
      stage: 'INTERESTED',
      status: 'ACTIVE',
      clientName: 'Engr. Dapo Williams',
      clientEmail: 'dapo.williams@shell.com',
      clientPhone: '+2348055566778',
      notes: 'Very interested in Admiralty Way villa. Relocating family from Port Harcourt next month.',
      listing: segunListings[0],
      matchedUser: null,
    },
    {
      stage: 'VIEWING',
      status: 'ACTIVE',
      clientName: 'Chief Raymond Oladipo',
      clientEmail: 'raymond@oladipoholdings.com',
      clientPhone: '+2348091122446',
      notes: 'Physical viewing scheduled for Saturday 11:00 AM with personal architect.',
      listing: segunListings[1],
      matchedUser: null,
    },
    {
      stage: 'APPLICATION',
      status: 'ACTIVE',
      clientName: 'Barrister Ifeanyi Eze',
      clientEmail: 'ifeanyi@ezepartners.law',
      clientPhone: '+2348077711223',
      notes: 'Tenancy application form submitted. Verifying proof of funds and corporate guarantee.',
      listing: segunListings[5],
      matchedUser: null,
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Bolu Adebayo',
      clientEmail: 'tenant@goodtenants.africa',
      clientPhone: '+2348037654321',
      notes: 'Deal finalized! Annual rent of ₦18,000,000 successfully settled and verified on Upward Pay.',
      listing: segunListings[0],
      matchedUser: tenantUser,
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Tunde Bello',
      clientEmail: 'tunde.bello@example.com',
      clientPhone: '+2348033334455',
      notes: 'Sale transaction concluded in Ikoyi. Co-brokerage commission disbursed.',
      listing: segunListings[4],
      matchedUser: clientUsers[1],
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), // 14 days ago
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Chidinma Nwosu',
      clientEmail: 'chidinma.n@example.com',
      clientPhone: '+2348077778899',
      notes: 'Victoria Island penthouse rental successfully closed.',
      listing: segunListings[2],
      matchedUser: clientUsers[2],
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
    },
    {
      stage: 'LOST',
      status: 'LOST',
      clientName: 'Oluwaseun Bakare',
      clientEmail: 'seun.bakare@telecom.ng',
      clientPhone: '+2348034455667',
      notes: 'Client opted for a mainland property due to proximity to workplace.',
      listing: segunListings[3],
      matchedUser: null,
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Alhaji Musa Garba',
      clientEmail: 'musa.garba@investments.ng',
      clientPhone: '+2348088990011',
      notes: 'Abuja luxury residential lease converted in collaboration with PrimeNest Realty.',
      listing: otherListings[0], // Funke's Maitama Villa
      matchedUser: null,
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Pastor Emmanuel Okon',
      clientEmail: 'emmanuel.okon@gracecity.ng',
      clientPhone: '+2348061122334',
      notes: 'Commercial lease concluded with Crown Heritage Estates in Ikeja GRA.',
      listing: otherListings.find((l) => l.pmId === emekaPm.id) || otherListings[1],
      matchedUser: null,
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12),
    },
    {
      stage: 'CONVERTED',
      status: 'CONVERTED',
      clientName: 'Hajiya Fatima Sanusi',
      clientEmail: 'fatima.sanusi@energy.gov.ng',
      clientPhone: '+2348037788990',
      notes: 'Townhouse tenancy concluded in collaboration with Zuma Vista Properties in Lokogoma.',
      listing: otherListings.find((l) => l.pmId === aminaPm.id) || otherListings[2],
      matchedUser: null,
      convertedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  ]

  const seededReferrals: any[] = []

  for (const r of pipelineStagesData) {
    const referral = await (prisma as any).upward_alliance_referral.create({
      data: {
        listingId: r.listing.id,
        referringPmId: primaryPm.id,
        matchedUserId: r.matchedUser ? r.matchedUser.id : null,
        clientIdentityKey: r.matchedUser ? `usr:${r.matchedUser.id}` : `email:${r.clientEmail}`,
        clientName: r.clientName,
        clientEmail: r.clientEmail,
        clientPhone: r.clientPhone,
        clientNormalizedEmail: r.clientEmail.toLowerCase().trim(),
        clientNormalizedPhone: r.clientPhone.replace(/\s+/g, ''),
        status: r.status,
        stage: r.stage,
        notes: r.notes,
        convertedAt: r.convertedAt || null,
        closedAt: r.status === 'CONVERTED' || r.status === 'LOST' ? new Date() : null,
      },
    })
    seededReferrals.push({ referral, data: r })
  }
  console.log(`✅ Seeded ${seededReferrals.length} Active Referrals across All Pipeline Stages.\n`)

  // 8. Seed Immutable Commission Records with KPIs
  console.log('💰 Seeding Alliance Commissions & Earnings...')

  const convertedDeals = seededReferrals.filter((s) => s.data.status === 'CONVERTED')

  const commissionConfigs = [
    {
      referralIndex: 0,
      sourceAmount: 18000000,
      rate: 5.0,
      amount: 900000,
      status: 'PAID',
      notes: '5% Co-brokerage commission paid via direct settlement.',
      txRef: 'TX_UPW_ALLIANCE_001',
      paidDaysAgo: 5,
    },
    {
      referralIndex: 1,
      sourceAmount: 135000000,
      rate: 2.5,
      amount: 3375000,
      status: 'PAYABLE',
      notes: '2.5% Sales co-broker commission approved and queued for payout batch.',
      txRef: 'TX_UPW_ALLIANCE_002',
      payableDaysAgo: 2,
    },
    {
      referralIndex: 2,
      sourceAmount: 9500000,
      rate: 5.0,
      amount: 475000,
      status: 'EARNED',
      notes: '5% Referral commission earned upon verified rent payment confirmation.',
      txRef: 'TX_UPW_ALLIANCE_003',
      earnedDaysAgo: 1,
    },
    {
      referralIndex: 3,
      sourceAmount: 35000000,
      rate: 5.0,
      amount: 1750000,
      status: 'PAID',
      notes: 'Maitama Diplomatic Villa co-brokerage settlement from PrimeNest Realty.',
      txRef: 'TX_UPW_ALLIANCE_004',
      paidDaysAgo: 18,
    },
    {
      referralIndex: 4,
      sourceAmount: 15000000,
      rate: 5.0,
      amount: 750000,
      status: 'PAID',
      notes: 'Ikeja GRA commercial lease settlement with Crown Heritage.',
      txRef: 'TX_UPW_ALLIANCE_005',
      paidDaysAgo: 10,
    },
    {
      referralIndex: 5,
      sourceAmount: 4800000,
      rate: 5.0,
      amount: 240000,
      status: 'EARNED',
      notes: 'Lokogoma Townhouse referral with Zuma Vista Properties.',
      txRef: 'TX_UPW_ALLIANCE_006',
      earnedDaysAgo: 4,
    },
  ]

  for (const c of commissionConfigs) {
    const ref = convertedDeals[c.referralIndex]?.referral
    if (ref) {
      const now = Date.now()
      await (prisma as any).upward_alliance_commission.create({
        data: {
          referralId: ref.id,
          referringPmId: primaryPm.id,
          listingId: ref.listingId,
          transactionReference: c.txRef,
          commissionType: 'PERCENTAGE',
          sourceAmount: c.sourceAmount,
          commissionRate: c.rate,
          commissionAmount: c.amount,
          currency: 'NGN',
          status: c.status,
          notes: c.notes,
          earnedAt: new Date(now - 1000 * 60 * 60 * 24 * (c.earnedDaysAgo || 10)),
          payableAt: c.status === 'PAYABLE' || c.status === 'PAID' ? new Date(now - 1000 * 60 * 60 * 24 * 3) : null,
          paidAt: c.status === 'PAID' ? new Date(now - 1000 * 60 * 60 * 24 * (c.paidDaysAgo || 2)) : null,
        },
      })
    }
  }
  console.log(`✅ Seeded ${commissionConfigs.length} Realized Alliance Commissions (Paid, Payable & Earned).\n`)

  // 9. Seed 5-Star & 4-Star Verified Ratings & Reviews
  console.log('⭐ Seeding Verified Co-Broker & Client Ratings...')

  const ratingsData = [
    {
      referral: convertedDeals[0]?.referral,
      authorType: 'CLIENT',
      authorUserId: tenantUser.id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 5,
      review: 'Outstanding professionalism! Mr. Segun made our relocation to Lekki seamless. Everything from physical viewing to digital tenancy signing on Upward Pay was world-class.',
    },
    {
      referral: convertedDeals[0]?.referral,
      authorType: 'PM',
      authorPmId: primaryPm.id,
      subjectType: 'CLIENT',
      subjectUserId: tenantUser.id,
      score: 5,
      review: 'Excellent tenant. Prompt documentation, clear communication, and seamless onboarding.',
    },
    {
      referral: convertedDeals[1]?.referral,
      authorType: 'CLIENT',
      authorUserId: clientUsers[1].id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 5,
      review: 'Secured our luxury home with complete peace of mind. Very transparent broker and swift deed verification.',
    },
    {
      referral: convertedDeals[2]?.referral,
      authorType: 'CLIENT',
      authorUserId: clientUsers[2].id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 4,
      review: 'Great service and quick response times on inquiries. Very satisfied with our new serviced apartment.',
    },
    {
      referral: convertedDeals[3]?.referral,
      authorType: 'PM',
      authorPmId: funkePm.id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 5,
      review: 'Top-tier co-broker partner! Segun referred high-net-worth diplomatic clients who closed on our Maitama property without friction. Highly recommended for joint mandates.',
    },
    {
      referral: convertedDeals[3]?.referral,
      authorType: 'PM',
      authorPmId: primaryPm.id,
      subjectType: 'PM',
      subjectPmId: funkePm.id,
      score: 5,
      review: 'Funke and the PrimeNest team are the gold standard for Abuja luxury real estate. Looking forward to more co-brokerage deals!',
    },
    // Emeka Okafor (Crown Heritage)
    {
      referral: convertedDeals[4]?.referral,
      authorType: 'PM',
      authorPmId: primaryPm.id,
      subjectType: 'PM',
      subjectPmId: emekaPm.id,
      score: 5,
      review: 'Emeka executed our commercial lease in Ikeja GRA with immense speed and professionalism. Top quality mandate partner.',
    },
    {
      referral: convertedDeals[4]?.referral,
      authorType: 'PM',
      authorPmId: emekaPm.id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 5,
      review: 'Reliable alliance collaborator with verified corporate tenant leads. Highly recommended co-broker.',
    },
    // Amina Bello (Zuma Vista)
    {
      referral: convertedDeals[5]?.referral,
      authorType: 'PM',
      authorPmId: primaryPm.id,
      subjectType: 'PM',
      subjectPmId: aminaPm.id,
      score: 5,
      review: 'Amina is wonderful to work with in Abuja suburban assets. Smooth handover and prompt documentation.',
    },
    {
      referral: convertedDeals[5]?.referral,
      authorType: 'PM',
      authorPmId: aminaPm.id,
      subjectType: 'PM',
      subjectPmId: primaryPm.id,
      score: 5,
      review: 'Excellent client referral for our Lokogoma townhouse. Instant commission reconciliation.',
    },
  ]

  for (const rt of ratingsData) {
    if (rt.referral) {
      await (prisma as any).upward_alliance_rating.create({
        data: {
          referralId: rt.referral.id,
          authorType: rt.authorType,
          authorPmId: rt.authorPmId || null,
          authorUserId: rt.authorUserId || null,
          subjectType: rt.subjectType,
          subjectPmId: rt.subjectPmId || null,
          subjectUserId: rt.subjectUserId || null,
          score: rt.score,
          review: rt.review,
        },
      })
    }
  }
  console.log(`✅ Seeded ${ratingsData.length} Verified Reviews & Ratings across PMs and Clients.\n`)

  console.log('🎉 Upward Alliance Master Seed Complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔑 Primary Demo PM Account:')
  console.log('   Email:    pm@goodtenants.africa')
  console.log('   Password: Password123')
  console.log('   Status:   Enabled with NIESV Badges, 32 Listings, 10 Deals, ₦6.5M+ Commissions, 4.9★')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

seedAlliance()
  .catch((e) => {
    console.error('❌ Alliance seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
