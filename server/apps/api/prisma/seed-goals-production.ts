import { PrismaClient, GoalPublishStatus, GoalTargetType } from '@prisma/client'

const prisma = new PrismaClient()

interface GoalCategorySeed {
  slug: string
  title: string
  description: string
  iconName: string
  sortOrder: number
  goals: Array<{
    slug: string
    title: string
    tagline: string
    description: string
    iconName: string
    sortOrder: number
    targetType: GoalTargetType
  }>
}

/**
 * Core categories and goals aligned directly with the dashboard/goals screen:
 * - Housing
 * - Career & professional
 * - Income
 * - Lifestyle
 */
export const PRODUCTION_GOAL_CATEGORIES: GoalCategorySeed[] = [
  {
    slug: 'housing',
    title: 'Housing',
    description: 'Homeownership readiness, rental savings, and apartment furnishing.',
    iconName: 'Home',
    sortOrder: 1,
    goals: [
      {
        slug: 'prepare-towards-owning-a-home',
        title: 'Prepare towards owning a home',
        tagline: 'Education, events, and a cooperative path to homeownership',
        description:
          'Build equity, learn the mortgage landscape, and unlock dedicated homeownership packages.',
        iconName: 'Home',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
      },
      {
        slug: 'save-towards-or-buy-furniture',
        title: 'Save towards or buy furniture',
        tagline: 'Furnish your apartment with verified pieces and flexible plans',
        description:
          'Connect with vetted furniture makers for living, bedroom, and kitchen pieces tailored to rental units.',
        iconName: 'Bed',
        sortOrder: 2,
        targetType: GoalTargetType.AMOUNT,
      },
    ],
  },
  {
    slug: 'career',
    title: 'Career & professional',
    description: 'Skill development, professional tools, and remote workstation setup.',
    iconName: 'Briefcase',
    sortOrder: 2,
    goals: [
      {
        slug: 'learn-a-skill',
        title: 'Learn a skill',
        tagline: 'Professional courses, nanodegrees, and career certifications',
        description:
          'Upskill in product design, engineering, business, and high-demand industry skills.',
        iconName: 'BookOpen',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
      },
    ],
  },
  {
    slug: 'income',
    title: 'Income',
    description: 'Business startup, merchant solutions, and investment growth.',
    iconName: 'TrendingUp',
    sortOrder: 3,
    goals: [
      {
        slug: 'start-a-business',
        title: 'Start a business',
        tagline: 'Business registration, branding, and merchant commerce tools',
        description:
          'Turn your side project into an incorporated enterprise with verified vendor tools.',
        iconName: 'Briefcase',
        sortOrder: 1,
        targetType: GoalTargetType.AMOUNT,
      },
    ],
  },
  {
    slug: 'lifestyle',
    title: 'Lifestyle',
    description: 'Home refresh, wellness, energy solutions, and everyday apartment essentials.',
    iconName: 'Sparkles',
    sortOrder: 4,
    goals: [
      {
        slug: 'home-refresh-package',
        title: 'Home refresh package',
        tagline: 'Curated cleaning, deep sanitization, and seasonal apartment renewals',
        description:
          'Keep your space fresh with recurring cleaning packages and curated move-in essentials.',
        iconName: 'Sparkles',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
      },
      {
        slug: 'healthy-living-lifestyle',
        title: 'Healthy living & lifestyle',
        tagline: 'Wellness passes, fresh nutrition boxes, and clean energy backup',
        description:
          'Daily lifestyle perks including organic grocery deliveries and gym network access.',
        iconName: 'HeartPulse',
        sortOrder: 2,
        targetType: GoalTargetType.RECURRING_HABIT,
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding production goal categories and system goals (no mock commerce data)...')

  for (const catData of PRODUCTION_GOAL_CATEGORIES) {
    const { goals, ...categoryFields } = catData

    const category = await prisma.upward_goal_category.upsert({
      where: { slug: categoryFields.slug },
      update: {
        title: categoryFields.title,
        description: categoryFields.description,
        iconName: categoryFields.iconName,
        sortOrder: categoryFields.sortOrder,
        status: GoalPublishStatus.PUBLISHED,
      },
      create: {
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
      const goal = await prisma.upward_goal.upsert({
        where: { slug: goalData.slug },
        update: {
          categoryId: category.id,
          title: goalData.title,
          tagline: goalData.tagline,
          description: goalData.description,
          iconName: goalData.iconName,
          sortOrder: goalData.sortOrder,
          targetType: goalData.targetType,
          status: GoalPublishStatus.PUBLISHED,
        },
        create: {
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
      console.log(`  🎯 Goal: [${goal.slug}] ${goal.title}`)
    }
  }

  console.log('✅ Production goal categories and system goals seeded successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding production goals:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
