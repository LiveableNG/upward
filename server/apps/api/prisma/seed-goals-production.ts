import { PrismaClient, GoalPublishStatus, GoalTargetType } from '@prisma/client'

const prisma = new PrismaClient()

interface GoalSeedItem {
  slug: string
  title: string
  tagline: string
  description: string
  iconName: string
  sortOrder: number
  targetType: GoalTargetType
  defaultDurationDays?: number
  actions: Array<{
    title: string
    description?: string
    isRequired?: boolean
  }>
}

interface GoalCategorySeed {
  slug: string
  title: string
  description: string
  iconName: string
  sortOrder: number
  goals: GoalSeedItem[]
}

/**
 * Production & Dev Goal Catalog Seed:
 * - housing
 * - fitness (Health & fitness)
 * - career (Career & professional)
 * - income (Income)
 * - other (Custom / Personal goal suggestions)
 * - lifestyle (Lifestyle)
 *
 * Every goal includes realistic predefined action templates in upward_goal_action_template
 * so admins can edit/reorder/add/remove them in the Admin Dashboard.
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
        defaultDurationDays: 365,
        actions: [
          { title: 'Check your current Upward Rent Score and credit readiness' },
          { title: 'Estimate target property price and 20% equity down-payment' },
          { title: 'Set up an automated monthly housing deposit' },
          { title: 'Review mortgage and cooperative homeownership options' },
        ],
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
        defaultDurationDays: 180,
        actions: [
          { title: 'List priority rooms and furniture pieces needed' },
          { title: 'Compare quotes from verified Upward furniture vendors' },
          { title: 'Set a monthly furnishing budget' },
          { title: 'Schedule delivery and installation' },
        ],
      },
    ],
  },
  {
    slug: 'fitness',
    title: 'Health & fitness',
    description: 'Build sustainable exercise, nutrition, and physical wellness habits.',
    iconName: 'HeartPulse',
    sortOrder: 2,
    goals: [
      {
        slug: 'lose-weight',
        title: 'Lose weight',
        tagline: 'Sustainable calorie balance, movement, and weekly progress tracking',
        description: 'Reach a healthy target weight through consistent daily habits and nutrition.',
        iconName: 'Activity',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Set a realistic target weight and weekly check-in day' },
          { title: 'Log meals and daily water intake for 7 days' },
          { title: 'Complete 3 brisk-walk or cardio sessions this week' },
          { title: 'Swap sugary drinks for water or unsweetened options for 14 days' },
        ],
      },
      {
        slug: 'build-muscle-or-strength',
        title: 'Build muscle or strength',
        tagline: 'Structured resistance training and high-protein recovery',
        description: 'Increase lean muscle mass and functional strength safely.',
        iconName: 'Dumbbell',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Choose a 3-day or 4-day weekly strength training split' },
          { title: 'Book an introductory gym or personal trainer session' },
          { title: 'Set a daily protein target and prep high-protein meals' },
          { title: 'Track weights and reps each week for progressive overload' },
        ],
      },
      {
        slug: 'stay-consistent-with-exercise',
        title: 'Stay consistent with exercise',
        tagline: 'Turn movement into an automatic weekly routine',
        description: 'Build a dependable fitness schedule that fits around work and life.',
        iconName: 'CalendarCheck',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Block 3 recurring 45-minute workout slots on your calendar' },
          { title: 'Pack workout clothes or set gear out the night before' },
          { title: 'Find a workout partner or accountability group' },
          { title: 'Complete 12 workouts in the next 30 days' },
        ],
      },
      {
        slug: 'improve-diet-and-nutrition',
        title: 'Improve my diet and nutrition',
        tagline: 'Whole foods, meal planning, and steady daily energy',
        description: 'Upgrade everyday meals with balanced nutrition and better hydration.',
        iconName: 'Apple',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Plan 5 balanced home-cooked meals for the week' },
          { title: 'Stock your kitchen with fresh vegetables, fruits, and lean protein' },
          { title: 'Drink at least 2 litres of water daily for 14 days' },
          { title: 'Cut late-night snacking on weekdays' },
        ],
      },
      {
        slug: 'prepare-for-fitness-event',
        title: 'Prepare for a fitness event or run',
        tagline: 'Endurance buildup, pacing, and race-day readiness',
        description: 'Train systematically for a 5K, 10K, marathon, or fitness challenge.',
        iconName: 'Trophy',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Register for your target 5K, 10K, or fitness event' },
          { title: 'Follow a weekly progressive running or conditioning plan' },
          { title: 'Schedule one longer endurance session every weekend' },
          { title: 'Test your race-day footwear and hydration plan' },
        ],
      },
    ],
  },
  {
    slug: 'career',
    title: 'Career & professional',
    description: 'Certifications, high-income skills, career transitions, and promotions.',
    iconName: 'Briefcase',
    sortOrder: 3,
    goals: [
      {
        slug: 'pass-professional-certification',
        title: 'Pass a professional certification exam',
        tagline: 'ICAN, ACCA, CFA, PMP, CIPM, AWS & industry credentials',
        description:
          'Prepare systematically with a syllabus schedule, weekly study blocks, and timed mock exams.',
        iconName: 'Award',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Confirm exam registration window and download the official syllabus' },
          { title: 'Create a 12-week study timetable covering every exam module' },
          { title: 'Block 4 focused study hours every week' },
          { title: 'Complete 2 full-length timed mock exams before your sitting' },
        ],
      },
      {
        slug: 'learn-a-skill',
        title: 'Learn a new high-income skill',
        tagline: 'Professional courses, bootcamps, and hands-on portfolio projects',
        description:
          'Upskill in product design, software engineering, data, finance, or growth marketing.',
        iconName: 'BookOpen',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Select one high-demand skill aligned with your career target' },
          { title: 'Enroll in a structured course, cohort, or mentorship program' },
          { title: 'Build 2 real-world portfolio projects demonstrating the skill' },
          { title: 'Ask a senior practitioner to review your portfolio' },
        ],
      },
      {
        slug: 'transition-new-career-role',
        title: 'Transition into a new career role',
        tagline: 'Reposition your experience and land interviews in your target field',
        description: 'Bridge skill gaps, tailor your CV, and run a focused job search.',
        iconName: 'Compass',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Shortlist 3 target roles and map the required skills' },
          { title: 'Update your CV and LinkedIn profile for transferable impact' },
          { title: 'Speak with 2 professionals already working in the target role' },
          { title: 'Submit 5 tailored job applications each week' },
        ],
      },
      {
        slug: 'get-promoted-at-workplace',
        title: 'Get promoted at my current workplace',
        tagline: 'High-impact delivery, visibility, and alignment with your manager',
        description: 'Document wins and demonstrate next-level ownership ahead of review cycles.',
        iconName: 'TrendingUp',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Meet with your manager to align on clear promotion criteria' },
          { title: 'Take ownership of one high-visibility team initiative' },
          { title: 'Keep a weekly brag doc of measurable wins and impact' },
          { title: 'Schedule a mid-cycle feedback and readiness check-in' },
        ],
      },
      {
        slug: 'build-professional-network',
        title: 'Build a stronger professional network',
        tagline: 'Meaningful industry relationships, mentors, and peer visibility',
        description: 'Expand your professional circle through deliberate outreach and events.',
        iconName: 'Users',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Reconnect with 5 former colleagues, classmates, or peers' },
          { title: 'Attend at least 1 industry meetup, conference, or webinar this month' },
          { title: 'Reach out to a potential mentor for a 20-minute coffee chat' },
          { title: 'Share thoughtful insights or project updates weekly' },
        ],
      },
    ],
  },
  {
    slug: 'income',
    title: 'Income',
    description: 'Business startup, side streams, emergency funds, and investing.',
    iconName: 'TrendingUp',
    sortOrder: 4,
    goals: [
      {
        slug: 'start-a-business',
        title: 'Start a business',
        tagline: 'Validate demand, register your business, and land your first customers',
        description:
          'Turn your side project into an incorporated enterprise with a clear launch plan.',
        iconName: 'Briefcase',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Validate your product or service idea with 5 potential customers' },
          { title: 'Estimate startup capital and first-3-months operating runway' },
          { title: 'Register your business name (CAC) and open a dedicated account' },
          { title: 'Launch a simple storefront or pitch and close your first sale' },
        ],
      },
      {
        slug: 'grow-existing-business-revenue',
        title: 'Grow my existing business revenue',
        tagline: 'Higher-margin offers, repeat customers, and tighter cashflow',
        description: 'Increase monthly revenue sustainably without ballooning expenses.',
        iconName: 'BarChart3',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Identify your top 2 highest-margin products or services' },
          { title: 'Follow up with 10 past customers for repeat orders or referrals' },
          { title: 'Test one new customer acquisition channel or bundle offer' },
          { title: 'Review weekly revenue, expenses, and net profit margins' },
        ],
      },
      {
        slug: 'add-second-income-stream',
        title: 'Add a second stream of income',
        tagline: 'Monetize skills or assets outside your primary paycheck',
        description: 'Create reliable supplemental income without burning out.',
        iconName: 'PlusCircle',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'List 2 monetizable skills or services you can offer part-time' },
          { title: 'Set a monthly side-income target and weekly hours budget' },
          { title: 'Create a simple portfolio or service offer and pitch 5 prospects' },
          { title: 'Automate saving 50% of side income toward rent or investments' },
        ],
      },
      {
        slug: 'save-emergency-or-investment-fund',
        title: 'Save towards an emergency or investment fund',
        tagline: 'Build a 3-month safety buffer before taking bigger financial bets',
        description: 'Protect your rent and living expenses with a dedicated liquid reserve.',
        iconName: 'ShieldCheck',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Calculate 3 months of essential living and rent expenses' },
          { title: 'Set up an automated weekly or payday transfer' },
          { title: 'Trim 1 recurring non-essential expense and redirect it to savings' },
          { title: 'Review your emergency fund milestone every 30 days' },
        ],
      },
      {
        slug: 'start-investing-seriously',
        title: 'Start investing more seriously',
        tagline: 'Consistent monthly investing aligned with your risk profile',
        description: 'Grow long-term wealth alongside your rent savings.',
        iconName: 'LineChart',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 365,
        actions: [
          { title: 'Define your investment horizon and risk tolerance' },
          { title: 'Keep short-term rent funds separate from long-term investments' },
          { title: 'Set a fixed monthly auto-invest amount on payday' },
          { title: 'Review portfolio performance and rebalance quarterly' },
        ],
      },
    ],
  },
  {
    slug: 'other',
    title: 'Children development',
    description: 'Family milestones, education, mobility, and personal projects.',
    iconName: 'Target',
    sortOrder: 5,
    goals: [
      {
        slug: 'goals-for-my-children',
        title: 'Goals for my children',
        tagline: 'Education, skills, and long-term family support',
        description: 'Plan ahead for school fees, extracurriculars, or children’s savings.',
        iconName: 'Users',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 365,
        actions: [
          { title: 'Define the specific milestone (education fund, skill, or care)' },
          { title: 'Estimate total target cost and academic term deadline' },
          { title: 'Set up a dedicated monthly contribution' },
          { title: 'Review progress at the end of each school term' },
        ],
      },
      {
        slug: 'a-family-goal',
        title: 'A family goal',
        tagline: 'Shared household milestones and family projects',
        description: 'Coordinate a meaningful goal with your household.',
        iconName: 'Home',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Agree on the family milestone and target completion date' },
          { title: 'Break the total budget into monthly contributions' },
          { title: 'Assign clear responsibilities for each step' },
          { title: 'Hold a monthly family check-in to track progress' },
        ],
      },
      {
        slug: 'buy-a-car',
        title: 'Buy a car',
        tagline: 'Budgeting, inspection, and total cost of ownership',
        description: 'Save smartly and verify the vehicle before making payment.',
        iconName: 'Car',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 365,
        actions: [
          { title: 'Set a total budget including registration and comprehensive insurance' },
          { title: 'Shortlist 3 reliable models and compare fuel & maintenance costs' },
          { title: 'Build your purchase fund with consistent monthly deposits' },
          { title: 'Book an independent mechanic inspection before paying' },
        ],
      },
      {
        slug: 'travel-abroad',
        title: 'Travel abroad',
        tagline: 'Passports, visas, flights, and trip budgeting',
        description: 'Plan and fund an international trip without straining your rent.',
        iconName: 'Plane',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Check passport validity (6+ months) and visa requirements' },
          { title: 'Estimate flights, accommodation, visa fees, and daily spend' },
          { title: 'Set a monthly travel savings target' },
          { title: 'Book refundable flights and stays once 70% funded' },
        ],
      },
    ],
  },
  {
    slug: 'lifestyle',
    title: 'Lifestyle',
    description: 'Home refresh, wellness, energy solutions, and everyday apartment essentials.',
    iconName: 'Sparkles',
    sortOrder: 6,
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
        defaultDurationDays: 90,
        actions: [
          { title: 'Choose rooms or areas for deep cleaning and refresh' },
          { title: 'Select a verified home refresh package or bundle' },
          { title: 'Pick a convenient weekend or weekday service slot' },
        ],
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
        defaultDurationDays: 90,
        actions: [
          { title: 'Choose your preferred wellness or nutrition subscription' },
          { title: 'Set your weekly delivery or gym schedule' },
          { title: 'Track consistency across your first 30 days' },
        ],
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding production goal categories, system goals, and predefined action templates...')

  for (const catData of PRODUCTION_GOAL_CATEGORIES) {
    const { goals, ...categoryFields } = catData
    const categoryStatus =
      categoryFields.slug === 'fitness'
        ? GoalPublishStatus.DRAFT
        : GoalPublishStatus.PUBLISHED

    const category = await prisma.upward_goal_category.upsert({
      where: { slug: categoryFields.slug },
      update: {
        title: categoryFields.title,
        description: categoryFields.description,
        iconName: categoryFields.iconName,
        sortOrder: categoryFields.sortOrder,
        status: categoryStatus,
      },
      create: {
        slug: categoryFields.slug,
        title: categoryFields.title,
        description: categoryFields.description,
        iconName: categoryFields.iconName,
        sortOrder: categoryFields.sortOrder,
        status: categoryStatus,
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
          defaultDurationDays: goalData.defaultDurationDays ?? 180,
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
          defaultDurationDays: goalData.defaultDurationDays ?? 180,
          status: GoalPublishStatus.PUBLISHED,
        },
      })

      const existingTemplatesCount = await prisma.upward_goal_action_template.count({
        where: { goalId: goal.id },
      })

      if (existingTemplatesCount === 0 && goalData.actions.length > 0) {
        await prisma.upward_goal_action_template.createMany({
          data: goalData.actions.map((act, idx) => ({
            goalId: goal.id,
            title: act.title,
            description: act.description ?? null,
            sortOrder: idx,
            isRequired: act.isRequired ?? false,
          })),
        })
        console.log(
          `  🎯 Goal: [${goal.slug}] ${goal.title} (+${goalData.actions.length} predefined actions)`,
        )
      } else {
        console.log(
          `  🎯 Goal: [${goal.slug}] ${goal.title} (kept ${existingTemplatesCount} existing actions)`,
        )
      }
    }
  }

  console.log('✅ Production goal categories, goals, and action templates seeded successfully.')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding production goals:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
