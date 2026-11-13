import { PrismaClient, GoalPublishStatus } from '@prisma/client'

const prisma = new PrismaClient()

interface CatalogueGoalSeed {
  slug: string
  title: string
  tagline: string
  description: string
  sortOrder: number
  isFeatured?: boolean
}

interface CategorySeed {
  slug: string
  title: string
  description: string
  iconName: string
  sortOrder: number
  goals: CatalogueGoalSeed[]
}

const CANONICAL_GOALS_CATALOGUE: CategorySeed[] = [
  {
    slug: 'housing-living',
    title: 'Housing & Living',
    description: 'Rent, property savings, interior refinement and productive living spaces.',
    iconName: 'Home',
    sortOrder: 1,
    goals: [
      {
        slug: 'hl-pay-rent',
        title: 'Pay my rent',
        tagline: 'Track rent schedule and build credibility',
        description: 'Organize your rent schedule, pay verified property invoices, and build your credibility score.',
        sortOrder: 1,
        isFeatured: true,
      },
      {
        slug: 'hl-save-rent',
        title: 'Save towards my next rent',
        tagline: 'Automate monthly rent reserve',
        description: 'Set aside monthly contributions towards your upcoming rent and earn daily returns in your Rent Vault.',
        sortOrder: 2,
        isFeatured: true,
      },
      {
        slug: 'hl-move-apartment',
        title: 'Move to a new apartment',
        tagline: 'Exclusive vetted rental properties',
        description: 'Browse vetted apartments, schedule private viewings, and transition into your next home effortlessly.',
        sortOrder: 3,
      },
      {
        slug: 'hl-save-own-home',
        title: 'Save towards owning a home',
        tagline: 'Build your long-term property equity',
        description: 'Establish a dedicated home-ownership fund with compounding yields and developer alliances.',
        sortOrder: 4,
      },
      {
        slug: 'hl-improve-home',
        title: 'Improve my home',
        tagline: 'Upgrade your living space',
        description: 'Enhance the comfort, functionality, and aesthetic quality of your current apartment.',
        sortOrder: 5,
      },
      {
        slug: 'hl-improve-home-feel',
        title: 'Improve my home feel',
        tagline: 'Atmosphere, lighting, and textures',
        description: 'Curate lighting, ambient scents, and tactile elements that transform your apartment into a sanctuary.',
        sortOrder: 6,
      },
      {
        slug: 'hl-buy-furniture',
        title: 'Buy furniture',
        tagline: 'Comfortable, durable living room and bedroom furniture',
        description: 'Source quality sofas, dining sets, orthopedic mattresses, and storage units suited to your space.',
        sortOrder: 7,
      },
      {
        slug: 'hl-paint-room',
        title: 'Paint a room',
        tagline: 'Fresh colour palette and pristine wall finish',
        description: 'Revitalize walls with high-grade, washable paints that match your mood and personal aesthetic.',
        sortOrder: 8,
      },
      {
        slug: 'hl-home-decor',
        title: 'Improve home décor',
        tagline: 'Wall art, mirrors, rugs, and soft furnishings',
        description: 'Add personalized design accents, woven rugs, modern wall mirrors, and curated gallery pieces.',
        sortOrder: 9,
      },
      {
        slug: 'hl-home-installations',
        title: 'Home installations',
        tagline: 'Inverter, water purification, air conditioning',
        description: 'Install essential infrastructure including solar backup, water filtration, smart locks, and air conditioning.',
        sortOrder: 10,
      },
      {
        slug: 'hl-remote-productivity',
        title: 'Improve my remote-work productivity',
        tagline: 'High-speed internet, power backup, and ergonomics',
        description: 'Eliminate downtime and physical fatigue with dedicated power, redundant internet, and ergonomic seating.',
        sortOrder: 11,
      },
      {
        slug: 'hl-setup-workspace',
        title: 'Setting up a productive workspace',
        tagline: 'Equip an ergonomic desk and task lighting',
        description: 'Build a dedicated work zone with sit-stand desk, noise-canceling setup, and clean cable management.',
        sortOrder: 12,
      },
    ],
  },
  {
    slug: 'financial-income',
    title: 'Financial & Income',
    description: 'Income growth, side ventures, strategic investing and financial independence.',
    iconName: 'TrendingUp',
    sortOrder: 2,
    goals: [
      {
        slug: 'fi-first-income',
        title: 'Get my first source of income',
        tagline: 'Launch your independent earning journey',
        description: 'Secure your first paid client, entry-level role, or contractual engagement.',
        sortOrder: 1,
      },
      {
        slug: 'fi-grow-income',
        title: 'Grow my existing income',
        tagline: 'Increase your baseline earning power',
        description: 'Negotiate higher rates, seek merit adjustments, and expand your monthly cash flow.',
        sortOrder: 2,
      },
      {
        slug: 'fi-get-promotion',
        title: 'Get a promotion',
        tagline: 'Advance to the next leadership or compensation tier',
        description: 'Demonstrate outsized organizational impact, lead strategic projects, and secure your promotion.',
        sortOrder: 3,
      },
      {
        slug: 'fi-start-side-hustle',
        title: 'Start a side hustle',
        tagline: 'Build secondary cash flow outside working hours',
        description: 'Launch a viable side business or commercial venture that generates recurring income.',
        sortOrder: 4,
      },
      {
        slug: 'fi-start-freelancing',
        title: 'Start freelancing',
        tagline: 'Take on direct client projects and contracts',
        description: 'Build a client pipeline, establish competitive rates, and deliver quality independent work.',
        sortOrder: 5,
      },
      {
        slug: 'fi-remote-international',
        title: 'Get a remote international job',
        tagline: 'Earn in global currency from home',
        description: 'Position your profile for global remote hiring, navigate interviews, and earn in foreign currency.',
        sortOrder: 6,
      },
      {
        slug: 'fi-monetise-skills',
        title: 'Monetise my skills',
        tagline: 'Turn knowledge and expertise into digital products or advisory',
        description: 'Package your professional skills into consulting, digital templates, cohorts, or workshops.',
        sortOrder: 7,
      },
      {
        slug: 'fi-start-investing',
        title: 'Start investing',
        tagline: 'Put money to work in low-risk, verified assets',
        description: 'Build long-term compounding through dollar-cost averaging into diversified index funds and bonds.',
        sortOrder: 8,
      },
      {
        slug: 'fi-save-more',
        title: 'Save more money',
        tagline: 'Build a resilient financial safety cushion',
        description: 'Increase your monthly savings rate to protect against emergencies and fund future opportunities.',
        sortOrder: 9,
      },
      {
        slug: 'fi-reduce-expenses',
        title: 'Reduce my expenses',
        tagline: 'Eliminate waste and renegotiate recurring bills',
        description: 'Audit subscriptions, utility plans, and discretionary spending to preserve more capital.',
        sortOrder: 10,
      },
      {
        slug: 'fi-pay-debts',
        title: 'Pay off debts',
        tagline: 'Regain financial freedom with a structured payoff plan',
        description: 'Eliminate high-interest obligations using snowball or avalanche repayment strategies.',
        sortOrder: 11,
      },
      {
        slug: 'fi-family-occasion',
        title: 'Save for a family occasion',
        tagline: 'Fund weddings, milestones, and family reunions',
        description: 'Plan and accumulate funds for significant family celebrations without straining regular cash flow.',
        sortOrder: 12,
      },
      {
        slug: 'fi-relocate-abroad',
        title: 'Relocate abroad',
        tagline: 'Fund visa fees, relocation deposits, and settlement funds',
        description: 'Systematically prepare the proof of funds, documentation, and travel logistics required to move abroad.',
        sortOrder: 13,
      },
    ],
  },
  {
    slug: 'career-professional',
    title: 'Career & Professional Development',
    description: 'Career pivots, management transitions, professional examinations and executive skills.',
    iconName: 'Briefcase',
    sortOrder: 3,
    goals: [
      {
        slug: 'cp-first-job',
        title: 'Get my first job',
        tagline: 'Land your career-defining entry position',
        description: 'Target relevant graduate openings, showcase practical projects, and secure an offer.',
        sortOrder: 1,
      },
      {
        slug: 'cp-get-internship',
        title: 'Get an internship',
        tagline: 'Gain hands-on corporate or agency experience',
        description: 'Secure an internship placement at a recognized organization to build industry references.',
        sortOrder: 2,
      },
      {
        slug: 'cp-change-career',
        title: 'Change my career',
        tagline: 'Transition strategically into a new domain',
        description: 'Map transferable skills, close key knowledge gaps, and reposition yourself in a high-demand sector.',
        sortOrder: 3,
      },
      {
        slug: 'cp-switch-tech',
        title: 'Switch to tech',
        tagline: 'Break into software engineering, product, or data',
        description: 'Build technical competency, ship real-world projects, and transition into the technology ecosystem.',
        sortOrder: 4,
      },
      {
        slug: 'cp-move-management',
        title: 'Move into management',
        tagline: 'Transition from individual contributor to people leader',
        description: 'Develop coaching capabilities, master strategic planning, and step into team leadership.',
        sortOrder: 5,
      },
      {
        slug: 'cp-grow-business',
        title: 'Grow my business',
        tagline: 'Scale operations, revenue, and customer acquisition',
        description: 'Refine customer funnels, hire key talent, and drive profitable enterprise growth.',
        sortOrder: 6,
      },
      {
        slug: 'cp-leadership-skills',
        title: 'Develop leadership skills',
        tagline: 'Master executive decision-making and influence',
        description: 'Cultivate strategic thinking, high-stakes communication, and high-trust leadership habits.',
        sortOrder: 7,
      },
      {
        slug: 'cp-public-speaking',
        title: 'Improve public speaking',
        tagline: 'Speak with clarity, authority, and presence',
        description: 'Overcome presentation anxiety, deliver memorable keynotes, and command meetings.',
        sortOrder: 8,
      },
      {
        slug: 'cp-sales-skills',
        title: 'Improve sales skills',
        tagline: 'Master consultative selling, discovery, and closing',
        description: 'Learn discovery frameworks, handle objections gracefully, and increase closing conversion.',
        sortOrder: 9,
      },
      {
        slug: 'cp-professional-appearance',
        title: 'Improve professional appearance',
        tagline: 'Curate a polished, confident executive wardrobe',
        description: 'Upgrade grooming, tailoring, and executive attire suited to senior professional environments.',
        sortOrder: 10,
      },
      {
        slug: 'cp-remote-effective',
        title: 'Become more effective at remote work',
        tagline: 'Master async workflows, written communication, and deep work',
        description: 'Structure focus blocks, document processes cleanly, and excel in distributed environments.',
        sortOrder: 11,
      },
      {
        slug: 'cp-remote-setup',
        title: 'Build a remote-work setup',
        tagline: 'Commercial-grade home office infrastructure',
        description: 'Assemble enterprise-grade microphone, 4K camera, dual monitors, and high-speed networking.',
        sortOrder: 12,
      },
      {
        slug: 'cp-obtain-certification',
        title: 'Obtain a certification',
        tagline: 'Earn an internationally recognized credential',
        description: 'Prepare for and sit exams for recognized certifications like PMP, CISA, CCNA, or CEH.',
        sortOrder: 13,
      },
      {
        slug: 'cp-obtain-licence',
        title: 'Obtain a professional licence',
        tagline: 'Accredited practice licence (COREN, ICAN, SURCON, etc.)',
        description: 'Fulfill mandatory regulatory practice requirements and obtain your official licence.',
        sortOrder: 14,
      },
      {
        slug: 'cp-prepare-exam',
        title: 'Prepare for a professional examination',
        tagline: 'Structured exam prep and mock assessments',
        description: 'Set a disciplined revision timetable, complete past papers, and secure your passing grade.',
        sortOrder: 15,
      },
      {
        slug: 'cp-pursue-masters',
        title: "Pursue a Master's degree",
        tagline: 'Enroll in an MSc, MBA, or MEng program',
        description: 'Evaluate accredited graduate programs, prepare statements of purpose, and gain admission.',
        sortOrder: 16,
      },
      {
        slug: 'cp-grow-career-business',
        title: 'Grow my career or business',
        tagline: 'Long-term enterprise and career scaling',
        description: 'Create sustained long-term leverage through strategic partnerships and continuous expansion.',
        sortOrder: 17,
      },
    ],
  },
  {
    slug: 'childrens-development',
    title: "Children's Development",
    description: 'Academic excellence, athletic training, creative discovery and character building.',
    iconName: 'GraduationCap',
    sortOrder: 4,
    goals: [
      {
        slug: 'cd-improve-maths',
        title: 'Improve mathematics',
        tagline: 'Build strong numerical logic and problem solving',
        description: 'Engage private tutoring and structured problem sets to build mathematics confidence and speed.',
        sortOrder: 1,
      },
      {
        slug: 'cd-improve-english',
        title: 'Improve English',
        tagline: 'Grammar, reading comprehension, and written expression',
        description: 'Foster regular reading habits, vocabulary expansion, and articulate essay writing.',
        sortOrder: 2,
      },
      {
        slug: 'cd-communication',
        title: 'Improve communication and speaking',
        tagline: 'Articulate ideas confidently and respectfully',
        description: 'Develop public speaking, debate, and interpersonal conversational skills from an early age.',
        sortOrder: 3,
      },
      {
        slug: 'cd-programming-tech',
        title: 'Learn programming and technology',
        tagline: 'Scratch, Python, and creative problem solving',
        description: 'Introduce computational thinking, basic game development, and logic building.',
        sortOrder: 4,
      },
      {
        slug: 'cd-digital-skills',
        title: 'Develop digital skills',
        tagline: 'Safe web research, typing speed, and digital productivity',
        description: 'Cultivate healthy screen habits, touch typing, and safe internet research capabilities.',
        sortOrder: 5,
      },
      {
        slug: 'cd-entrance-exams',
        title: 'Prepare for entrance examinations',
        tagline: 'Secondary school & college entrance success',
        description: 'Complete structured past paper revisions and exam timing strategies for top admissions.',
        sortOrder: 6,
      },
      {
        slug: 'cd-leadership',
        title: 'Develop leadership skills',
        tagline: 'Team collaboration, empathy, and initiative',
        description: 'Encourage responsibility, school club participation, and collaborative team problem solving.',
        sortOrder: 7,
      },
      {
        slug: 'cd-sports-tennis',
        title: 'Learn sports, including tennis',
        tagline: 'Physical fitness, coordination, and sportsmanship',
        description: 'Enroll in weekly coaching, develop athletic endurance, and build hand-eye coordination.',
        sortOrder: 8,
      },
      {
        slug: 'cd-learn-piano',
        title: 'Learn piano',
        tagline: 'Sheet music reading, tempo, and classical foundations',
        description: 'Learn keyboard fundamentals, finger discipline, and musical ear development.',
        sortOrder: 9,
      },
      {
        slug: 'cd-another-instrument',
        title: 'Learn another musical instrument',
        tagline: 'Guitar, violin, drums, or saxophone',
        description: 'Explore musical passion with professional instruction on your child’s chosen instrument.',
        sortOrder: 10,
      },
      {
        slug: 'cd-martial-arts',
        title: 'Learn martial arts',
        tagline: 'Discipline, self-defence, and inner focus',
        description: 'Build core strength, agility, self-discipline, and respect through Taekwondo or Karate.',
        sortOrder: 11,
      },
      {
        slug: 'cd-creative-skills',
        title: 'Develop creative skills',
        tagline: 'Painting, pottery, creative crafts, and design',
        description: 'Encourage imagination and fine motor skills through guided arts and hands-on making.',
        sortOrder: 12,
      },
      {
        slug: 'cd-other-development',
        title: 'Other personal development activities',
        tagline: 'Bespoke extracurricular and character pursuits',
        description: 'Tailor custom enrichment programs aligned with your child’s unique passions.',
        sortOrder: 13,
      },
    ],
  },
  {
    slug: 'personal-goals',
    title: 'Personal Goals',
    description: 'Custom self-directed ambitions, private milestones, and life transitions.',
    iconName: 'Sparkles',
    sortOrder: 5,
    goals: [
      {
        slug: 'pg-create-custom',
        title: 'Create my own goal',
        tagline: 'Define a personal goal with custom title and targets',
        description: 'Enter your own goal title, describe your desired outcome, add custom milestones, and track your progress.',
        sortOrder: 1,
      },
    ],
  },
]

async function seedGoalsCatalogue() {
  console.log('🧹 Cleaning up legacy goals data from database...')

  // Delete child records first to respect foreign keys
  await prisma.upward_goal_milestone.deleteMany({})
  await prisma.upward_goal_interest_history.deleteMany({})
  await prisma.upward_goal_interest.deleteMany({})
  await prisma.upward_housing_adoption_decision.deleteMany({})
  await prisma.upward_goal_offering.deleteMany({})
  await prisma.upward_goal_collection.deleteMany({})
  await prisma.upward_user_goal.deleteMany({})
  await prisma.upward_goal.deleteMany({})
  await prisma.upward_goal_category.deleteMany({})

  console.log('🌱 Seeding canonical 5 categories and proposed goal catalogue...')

  let totalCategories = 0
  let totalGoals = 0

  for (const cat of CANONICAL_GOALS_CATALOGUE) {
    const createdCategory = await prisma.upward_goal_category.create({
      data: {
        slug: cat.slug,
        title: cat.title,
        description: cat.description,
        iconName: cat.iconName,
        sortOrder: cat.sortOrder,
        status: GoalPublishStatus.PUBLISHED,
      },
    })
    totalCategories++
    console.log(`  📁 Category [${createdCategory.sortOrder}]: ${createdCategory.title} (${createdCategory.slug})`)

    for (const g of cat.goals) {
      await prisma.upward_goal.create({
        data: {
          categoryId: createdCategory.id,
          slug: g.slug,
          title: g.title,
          tagline: g.tagline,
          description: g.description,
          sortOrder: g.sortOrder,
          status: GoalPublishStatus.PUBLISHED,
          isFeatured: Boolean(g.isFeatured),
        },
      })
      totalGoals++
    }
  }

  console.log(`\n✅ Successfully seeded ${totalCategories} categories and ${totalGoals} catalogue goals!`)
}

seedGoalsCatalogue()
  .catch((err) => {
    console.error('❌ Seeding failed with error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
