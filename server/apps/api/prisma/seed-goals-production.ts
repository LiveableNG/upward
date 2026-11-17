import { PrismaClient, GoalPublishStatus, GoalTargetType } from '@prisma/client'

const prisma = new PrismaClient()

export interface GoalSeedItem {
  slug: string
  title: string
  tagline: string
  description: string
  iconName: string
  sortOrder: number
  targetType: GoalTargetType
  defaultDurationDays?: number
  suggestedAmountKobo?: bigint
  actions: Array<{
    title: string
    description?: string
    isRequired?: boolean
  }>
}

export interface GoalCategorySeed {
  slug: string
  title: string
  description: string
  iconName: string
  sortOrder: number
  goals: GoalSeedItem[]
}

/**
 * Production & Dev Goal Catalog Seed:
 * Directly derived from Upward Goals Specification Document:
 * - housing (A. Home and Lifestyle Goals)
 * - income (B. Income and Financial Goals)
 * - career (C. Career and Professional Development Goals)
 * - pay-less (D. Pay less for stuff)
 * - children (E. Children's Development Goals)
 * - custom (F. Custom Goals)
 *
 * Rule: Users can select multiple goals, with a strict cap of 3 per category.
 */
export const PRODUCTION_GOAL_CATEGORIES: GoalCategorySeed[] = [
  // ── A. Home and Lifestyle Goals ──────────────────────────────────────────
  {
    slug: 'housing',
    title: 'Home & lifestyle',
    description: 'Renting, preparing for a move, home ownership, and living space improvements.',
    iconName: 'Home',
    sortOrder: 1,
    goals: [
      {
        slug: 'pay-my-rent-now',
        title: 'Pay my rent now',
        tagline: 'Make my rent payment through Upward',
        description:
          'Make my rent payment through Upward to build payment score and obtain instant receipts.',
        iconName: 'CreditCard',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 30,
        actions: [
          { title: 'Review upcoming rent due date and amount' },
          { title: 'Select preferred payment method or dedicated bank account' },
          { title: 'Complete payment and generate verified receipt' },
        ],
      },
      {
        slug: 'pay-less-for-my-next-rent',
        title: 'Pay less for my next rent',
        tagline: 'Build up savings towards my upcoming rent',
        description:
          'Build up savings towards my upcoming rent and let compound interest help pay down your rent.',
        iconName: 'TrendingUp',
        sortOrder: 2,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365,
        actions: [
          { title: 'Set target rent amount and upcoming due date' },
          { title: 'Activate dedicated ARM rent savings account' },
          { title: 'Set up initial deposit and recurring savings plan' },
        ],
      },
      {
        slug: 'move-to-a-new-apartment',
        title: 'Move to a new apartment (coming soon)',
        tagline: 'Plan and save towards moving into a new home',
        description:
          'Plan and save towards moving into a new home; indicate preferred neighborhoods and relocation timeline.',
        iconName: 'Truck',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Specify target neighborhoods and desired apartment features' },
          { title: 'Estimate deposit, agency fees, and moving logistics budget' },
          { title: 'Set up monthly relocation reserve fund' },
        ],
      },
      {
        slug: 'buy-a-house',
        title: 'Buy a house',
        tagline: 'Start preparing financially to buy a house in the future',
        description:
          'Start preparing financially to buy a house in the future with homebuyer education and equity building.',
        iconName: 'Building',
        sortOrder: 4,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365 * 2,
        actions: [
          { title: 'Check Upward rent score and mortgage readiness' },
          { title: 'Calculate target home price and 20% equity down-payment' },
          { title: 'Start long-term automated home savings fund' },
          { title: 'Explore cooperative homeownership paths and mortgage partners' },
        ],
      },
      {
        slug: 'prepare-for-the-new-year',
        title: 'Prepare for the new year',
        tagline: 'Home refresh packages & apartment renewal kits',
        description:
          'Prepare your home for the new year with curated home refresh packages in the marketplace — mop, broom, scrubbing brush, toilet brush, bathroom slippers, cleaning sponge, dust parker, dust bins, room carpets/rug, bathroom carpets/footmats, dishwashing sponge, kitchen towels, cutlery set, kitchen mat, dish rack, toothbrush holders, floor wiper, cleaning gloves, refuse bags, multipurpose cleaning liquid, disinfectant, bleach, toilet cleaner, dishwashing liquid, air freshener.',
        iconName: 'Sparkles',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Browse curated New Year home refresh packages' },
          { title: 'Select room carpets, footmats, and cleaning bundles' },
          { title: 'Order through marketplace with doorstep delivery' },
        ],
      },
      {
        slug: 'improve-my-home-feel',
        title: 'Improve my home feel',
        tagline: 'Improve the look and feel of my home with furniture and decoration',
        description:
          'Improve the look and feel of my home with verified furniture, painting, accent lighting, and interior decoration.',
        iconName: 'Sofa',
        sortOrder: 6,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 120,
        actions: [
          { title: 'Identify priority rooms and aesthetic improvements needed' },
          { title: 'Browse verified Upward furniture and interior design partners' },
          { title: 'Set furnishing budget and schedule delivery' },
        ],
      },
      {
        slug: 'improve-remote-work-productivity',
        title: 'Improve remote work productivity',
        tagline: 'Make my home more suitable for work and everyday productivity',
        description:
          'Make my home more suitable for work and everyday productivity with ergonomic workstations and 24/7 power backup.',
        iconName: 'Laptop',
        sortOrder: 7,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Audit home office desk, chair, and lighting setup' },
          { title: 'Set up reliable solar or inverter power backup' },
          { title: 'Ensure high-speed redundant internet connectivity' },
        ],
      },
      {
        slug: 'travel',
        title: 'Travel',
        tagline: 'Plan and save towards travel and vacation experiences',
        description: 'Plan trips, explore getaways, and build a dedicated vacation savings fund.',
        iconName: 'Plane',
        sortOrder: 8,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 180,
        actions: [
          { title: 'Choose travel destination and preferred travel dates' },
          { title: 'Estimate total flight, accommodation, and daily budget' },
          { title: 'Automate monthly savings towards vacation fund' },
        ],
      },
      {
        slug: 'gift-someone',
        title: 'Gift someone',
        tagline: 'Birthday, Christmas, and celebration gifting',
        description:
          'Plan and budget gifts for birthdays, Christmas, and milestones without last-minute stress.',
        iconName: 'Gift',
        sortOrder: 9,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Create gift calendar with recipient birthdays and holidays' },
          { title: 'Set dedicated gifting spending cap' },
          { title: 'Select and preorder curated gifts ahead of time' },
        ],
      },
    ],
  },

  // ── B. Income and Financial Goals ────────────────────────────────────────
  {
    slug: 'income',
    title: 'Income & financial goals',
    description:
      'Earn more, increase financial stability, build additional income streams, and make financial progress.',
    iconName: 'Coins',
    sortOrder: 2,
    goals: [
      {
        slug: 'get-a-promotion',
        title: 'Get a promotion',
        tagline: 'Get promoted in the coming year to increase my income',
        description:
          'Advance to the next seniority tier and negotiate a higher salary through measurable business impact.',
        iconName: 'Award',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Document key work achievements and measurable business impact' },
          { title: 'Schedule quarterly performance review with manager' },
          { title: 'Take ownership of a high-visibility company initiative' },
        ],
      },
      {
        slug: 'start-a-side-hustle',
        title: 'Start a side hustle',
        tagline: 'Find an additional source of income outside my main job and build an extra income stream',
        description:
          'Find an additional source of income outside your main job and build an extra income stream.',
        iconName: 'Flame',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 120,
        actions: [
          { title: 'Identify top marketable skills and business ideas' },
          { title: 'Validate business concept with initial customers' },
          { title: 'Commit 5 hours weekly to side business development' },
        ],
      },
      {
        slug: 'start-freelancing',
        title: 'Start freelancing',
        tagline: 'Offer professional services to clients independently',
        description:
          'Offer professional services to clients independently and build a recurring client roster.',
        iconName: 'Globe',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Assemble online portfolio highlighting best client projects' },
          { title: 'Create profiles on leading freelance platforms' },
          { title: 'Send personalized proposals to 10 prospective clients' },
        ],
      },
      {
        slug: 'get-a-remote-international-job',
        title: 'Get a remote international job',
        tagline: 'Earn income by working remotely for an international employer',
        description:
          'Secure global remote employment to earn foreign currency income from home.',
        iconName: 'Laptop',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Format CV and LinkedIn to international standards' },
          { title: 'Apply to 5 global remote job postings each week' },
          { title: 'Complete mock interview and technical assessment practice' },
        ],
      },
      {
        slug: 'monetise-my-skills',
        title: 'Monetise my skills',
        tagline: 'Earn money from skills I already possess',
        description:
          'Turn existing expertise into consulting, digital products, tutoring, or creative services.',
        iconName: 'Zap',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'List top 3 skills others frequently ask your advice on' },
          { title: 'Package knowledge into a consult, workshop, or digital guide' },
          { title: 'Share with initial audience to make your first sale' },
        ],
      },
      {
        slug: 'grow-my-existing-income',
        title: 'Grow my existing income',
        tagline: 'Increase what I currently earn',
        description:
          'Increase earnings through merit increases, bonus targets, and high-value project delivery.',
        iconName: 'TrendingUp',
        sortOrder: 6,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Research industry compensation benchmarks for your role' },
          { title: 'Build a business case for a salary review' },
          { title: 'Present performance metrics to leadership' },
        ],
      },
      {
        slug: 'get-my-first-source-of-income',
        title: 'Get my first source of income',
        tagline: 'Start earning, particularly for someone early in their career',
        description:
          'Land your first paying role, paid internship, or entry-level contract to begin your financial journey.',
        iconName: 'Compass',
        sortOrder: 7,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Craft a clean entry-level resume emphasizing skills and projects' },
          { title: 'Submit applications to 10 entry-level listings weekly' },
          { title: 'Reach out to alumni and professional contacts for referrals' },
        ],
      },
      {
        slug: 'start-investing',
        title: 'Start investing',
        tagline: 'Begin investing towards long-term financial security',
        description:
          'Build sustainable wealth through disciplined, diversified investing in mutual funds and equities.',
        iconName: 'PieChart',
        sortOrder: 8,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365,
        actions: [
          { title: 'Determine investment horizon and risk tolerance' },
          { title: 'Open regulated brokerage or mutual fund investment account' },
          { title: 'Set up recurring automated monthly investment transfers' },
        ],
      },
      {
        slug: 'save-more-money',
        title: 'Save more money',
        tagline: 'Improve my ability to save and build financial reserves',
        description:
          'Cultivate consistent savings habits and build a 3 to 6-month emergency reserve.',
        iconName: 'PiggyBank',
        sortOrder: 9,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 180,
        actions: [
          { title: 'Track daily spending for 30 consecutive days' },
          { title: 'Target saving 20% of net monthly income' },
          { title: 'Automate savings immediately when salary arrives' },
        ],
      },
      {
        slug: 'reduce-my-expenses',
        title: 'Reduce my expenses',
        tagline: 'Spend less and find ways to reduce costs',
        description:
          'Audit recurring costs, negotiate bills, and eliminate wasteful spending.',
        iconName: 'Scissors',
        sortOrder: 10,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Audit bank statements for unused recurring subscriptions' },
          { title: 'Compare utility, internet, and mobile data plans' },
          { title: 'Set weekly caps for dining and entertainment' },
        ],
      },
      {
        slug: 'relocate-abroad',
        title: 'Relocate abroad',
        tagline: 'Explore relocating to another country as an economic or financial goal',
        description:
          'Plan visas, proof of funds, credential evaluation, and overseas relocation budget.',
        iconName: 'PlaneTakeoff',
        sortOrder: 11,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365,
        actions: [
          { title: 'Shortlist target countries and immigration pathways' },
          { title: 'Calculate total proof of funds and relocation budget' },
          { title: 'Prepare transcripts, evaluations, and language tests (IELTS/TOEFL)' },
        ],
      },
      {
        slug: 'save-towards-an-important-family-occasion',
        title: 'Save towards an important family occasion',
        tagline: 'For example, save towards my mother\'s birthday',
        description:
          'Save towards family milestones, weddings, anniversaries, or parents\' celebrations.',
        iconName: 'Calendar',
        sortOrder: 12,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 180,
        actions: [
          { title: 'Set event date and total estimated budget' },
          { title: 'Create dedicated savings goal with monthly targets' },
          { title: 'Track progress until the target date' },
        ],
      },
      {
        slug: 'pay-off-my-debts',
        title: 'Pay off my debts',
        tagline: 'Reduce or clear outstanding debts',
        description:
          'Systematically eliminate high-interest loans, cards, and outstanding obligations.',
        iconName: 'CheckCircle2',
        sortOrder: 13,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365,
        actions: [
          { title: 'List all debts, interest rates, and minimum monthly payments' },
          { title: 'Choose debt snowball or avalanche repayment plan' },
          { title: 'Direct extra cashflow and windfalls toward loan principal' },
        ],
      },
    ],
  },

  // ── C. Career and Professional Development Goals ─────────────────────────
  {
    slug: 'career',
    title: 'Career & professional development',
    description:
      'First job, changing careers, advancing professionally, acquiring qualifications, and workplace skills.',
    iconName: 'Briefcase',
    sortOrder: 3,
    goals: [
      {
        slug: 'get-my-first-job',
        title: 'Get my first job',
        tagline: 'Secure my first employment opportunity',
        description: 'Secure your first employment opportunity in your field of interest.',
        iconName: 'Sparkles',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Prepare tailored CV and project portfolio' },
          { title: 'Apply for 10 graduate or entry-level positions weekly' },
          { title: 'Attend career fairs and alumni networking sessions' },
        ],
      },
      {
        slug: 'get-an-internship',
        title: 'Get an internship',
        tagline: 'Gain practical experience in a chosen field',
        description: 'Gain practical experience and industry exposure in a chosen profession.',
        iconName: 'GraduationCap',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Identify 15 target companies offering internships' },
          { title: 'Reach out to hiring managers with cover letters' },
          { title: 'Prepare for technical and cultural fit interview tests' },
        ],
      },
      {
        slug: 'change-my-career',
        title: 'Change my career',
        tagline: 'Move from my current career into another field',
        description: 'Transition smoothly from your current field into a new industry.',
        iconName: 'RefreshCw',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Assess transferable skills and identify gap areas' },
          { title: 'Enrol in foundational coursework for target industry' },
          { title: 'Build portfolio demonstrating target domain competence' },
        ],
      },
      {
        slug: 'switch-career-to-tech',
        title: 'Switch career to tech',
        tagline: 'Transition into the technology industry',
        description:
          'Transition into software development, product management, design, data, or cybersecurity.',
        iconName: 'Code',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Choose a tech specialization (Engineering, Product, Design, Data)' },
          { title: 'Complete structured bootcamp or certification track' },
          { title: 'Build and deploy 3 production-grade capstone projects' },
        ],
      },
      {
        slug: 'get-promoted-to-management',
        title: 'Get promoted to management',
        tagline: 'Progress into a management or leadership role',
        description: 'Step up from individual contributor into leadership and team management.',
        iconName: 'Users',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Mentor junior team members and coordinate group projects' },
          { title: 'Discuss management promotion criteria with senior leadership' },
          { title: 'Complete management and people-leadership workshop' },
        ],
      },
      {
        slug: 'start-my-own-business',
        title: 'Start my own business',
        tagline: 'Build a small or medium-sized business',
        description: 'Establish and scale a profitable enterprise from the ground up.',
        iconName: 'Building2',
        sortOrder: 6,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Draft business model canvas and cashflow forecast' },
          { title: 'Complete legal registration (CAC) and corporate account' },
          { title: 'Acquire first 10 paying customers' },
        ],
      },
      {
        slug: 'improve-my-leadership-skills',
        title: 'Improve my leadership skills',
        tagline: 'Develop the skills needed to lead people and teams',
        description: 'Develop the emotional intelligence, delegation, and coaching skills to lead teams.',
        iconName: 'Compass',
        sortOrder: 7,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Read 2 classic leadership and high-output management books' },
          { title: 'Lead a cross-functional workgroup or initiative' },
          { title: 'Conduct 360-degree feedback reviews with peers' },
        ],
      },
      {
        slug: 'improve-my-presentation-skills',
        title: 'Improve my presentation skills',
        tagline: 'Master presentation design, pitching, and executive communication',
        description: 'Master delivering engaging slide presentations and compelling pitches.',
        iconName: 'Presentation',
        sortOrder: 8,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Learn executive slide structuring and storytelling principles' },
          { title: 'Record and critique 3 mock presentation deliveries' },
          { title: 'Deliver presentation at team or company all-hands' },
        ],
      },
      {
        slug: 'improve-my-speaking-skills',
        title: 'Improve my speaking skills',
        tagline: 'Become a better and more confident speaker',
        description: 'Overcome public speaking anxiety and articulate ideas clearly in public.',
        iconName: 'Mic',
        sortOrder: 9,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Join Toastmasters or public speaking practice group' },
          { title: 'Practice 5-minute impromptu talks weekly' },
          { title: 'Speak at a local meetup or professional panel' },
        ],
      },
      {
        slug: 'get-a-mentor-coach',
        title: 'Get a mentor/coach',
        tagline: 'Connect with an experienced mentor or coach to accelerate growth',
        description: 'Partner with seasoned leaders for strategic career guidance and sponsorship.',
        iconName: 'UserCheck',
        sortOrder: 10,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Define specific career objectives and questions for a mentor' },
          { title: 'Reach out to 3 respected senior professionals' },
          { title: 'Schedule recurring monthly mentorship check-ins' },
        ],
      },
      {
        slug: 'become-a-better-salesperson',
        title: 'Become a better salesperson',
        tagline: 'Improve my ability to communicate, persuade and sell',
        description: 'Master discovery questions, objection handling, and closing deals with confidence.',
        iconName: 'Target',
        sortOrder: 11,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Study consultative selling and objection-handling frameworks' },
          { title: 'Shadow 5 live sales calls with top-performing reps' },
          { title: 'Track outbound calls, conversion rates, and closed pipeline' },
        ],
      },
      {
        slug: 'improve-my-professional-appearance',
        title: 'Improve my professional appearance',
        tagline: 'Upgrade my professional wardrobe and present myself better professionally',
        description: 'Upgrade wardrobe, grooming, and personal branding for executive presence.',
        iconName: 'Sparkles',
        sortOrder: 12,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Audit current work wardrobe and create capsule outfit list' },
          { title: 'Invest in tailored professional suits or business-casual pieces' },
          { title: 'Update professional headshots for LinkedIn and company profiles' },
        ],
      },
      {
        slug: 'start-working-remotely',
        title: 'Start working remotely',
        tagline: 'Find an opportunity to work remotely',
        description: 'Transition from office-based work to full-time remote or hybrid flexibility.',
        iconName: 'Wifi',
        sortOrder: 13,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 120,
        actions: [
          { title: 'Build asynchronous communication and documentation skills' },
          { title: 'Filter job applications for remote-first companies' },
          { title: 'Negotiate hybrid or remote trial period with current employer' },
        ],
      },
      {
        slug: 'improve-my-remote-work-setup',
        title: 'Improve my remote-work setup',
        tagline: 'Create a more suitable, work-friendly space',
        description: 'Create an ergonomic, distraction-free home office setup.',
        iconName: 'Monitor',
        sortOrder: 14,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 60,
        actions: [
          { title: 'Procure ergonomic chair and external monitor stand' },
          { title: 'Ensure uninterrupted power supply with inverter or backup' },
          { title: 'Optimize lighting and microphone for professional video calls' },
        ],
      },
      {
        slug: 'get-a-professional-certification',
        title: 'Get a professional certification',
        tagline: 'Prepare for and obtain a recognised professional qualification',
        description:
          'Prepare for recognized qualifications: PMP, ICAN, OGF Academy, CIPM, NIPM, CISA, CCNA, CEH, TOGAF, DCP, ACIN, FCIN, CPPM, CLM, CPPP, HSE, TCRN, NIMASA Standards, or engineering exams.',
        iconName: 'Award',
        sortOrder: 15,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Select targeted certification from recognized registry' },
          { title: 'Register for examination date and obtain official syllabus' },
          { title: 'Complete past exam questions and mock practice tests' },
        ],
      },
      {
        slug: 'get-a-professional-licence',
        title: 'Get a professional licence',
        tagline: 'Obtain a licence required to practise in a profession',
        description:
          'Obtain state or professional regulatory licenses to practise: COREN, NSE, SURCON, NIS, NIESV, CORBON, NIOB, NIQS.',
        iconName: 'ShieldCheck',
        sortOrder: 16,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Check regulatory council registration prerequisites' },
          { title: 'Submit professional logbook and technical reports' },
          { title: 'Attend council interview and receive seal of practice' },
        ],
      },
      {
        slug: 'take-a-professional-examination',
        title: 'Take a professional examination',
        tagline: 'Prepare for a specific professional exam',
        description: 'Prepare diligently and sit for career-defining qualification exams.',
        iconName: 'FileText',
        sortOrder: 17,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 120,
        actions: [
          { title: 'Acquire official study texts and revision kits' },
          { title: 'Block 2 hours of daily study time for 90 days' },
          { title: 'Complete mock exam simulations under timed conditions' },
        ],
      },
      {
        slug: 'get-a-masters-degree',
        title: 'Get a master\'s degree',
        tagline: 'Plan and prepare for postgraduate studies',
        description: 'Plan, fund, and prepare admissions applications for master\'s degree programs.',
        iconName: 'GraduationCap',
        sortOrder: 18,
        targetType: GoalTargetType.AMOUNT,
        defaultDurationDays: 365,
        actions: [
          { title: 'Shortlist top 5 postgraduate institutions and curriculum' },
          { title: 'Prepare statement of purpose, references, and transcripts' },
          { title: 'Set up postgraduate tuition and living expenses savings plan' },
        ],
      },
      {
        slug: 'grow-my-professional-career',
        title: 'Grow my professional career',
        tagline: 'Become more established and progress in my chosen profession',
        description: 'Build industry authority, publish thought leadership, and expand influence.',
        iconName: 'TrendingUp',
        sortOrder: 19,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Attend 2 premier industry conferences this year' },
          { title: 'Publish quarterly industry articles on LinkedIn' },
          { title: 'Join national professional institute committees' },
        ],
      },
      {
        slug: 'grow-my-business-career',
        title: 'Grow my business career',
        tagline: 'Develop and advance my business or entrepreneurial career',
        description: 'Scale business operations, build strategic alliances, and increase profitability.',
        iconName: 'Briefcase',
        sortOrder: 20,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Refine customer acquisition funnel and unit economics' },
          { title: 'Form strategic commercial partnerships' },
          { title: 'Automate repetitive workflows to free executive time' },
        ],
      },
    ],
  },

  // ── D. Pay less for stuff ────────────────────────────────────────────────
  {
    slug: 'pay-less',
    title: 'Pay less for stuff',
    description:
      'Save on routine household and living expenses through group buying and bulk partner rates.',
    iconName: 'Tag',
    sortOrder: 4,
    goals: [
      {
        slug: 'laundry-savings',
        title: 'Save on laundry & drycleaning',
        tagline: 'How much do you currently spend on drycleaning?',
        description:
          'Cut drycleaning and laundry costs with bulk partner rates and scheduled pickups.',
        iconName: 'Shirt',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Track monthly drycleaning and laundry expenses' },
          { title: 'Opt into Upward neighborhood bulk laundry service' },
          { title: 'Schedule weekly recurring pickup and doorstep delivery' },
        ],
      },
      {
        slug: 'grocery-regular-staples',
        title: 'Save on regular grocery purchases',
        tagline: 'What 3 things do you buy regularly?',
        description:
          'Cut grocery bills on everyday staples (rice, oil, provisions) through bulk community buying.',
        iconName: 'ShoppingBag',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'List the 3 grocery items you buy most regularly' },
          { title: 'Join monthly neighborhood bulk-buying cart' },
          { title: 'Save 15-25% compared to open-market retail prices' },
        ],
      },
      {
        slug: 'grocery-top-spends',
        title: 'Cut top monthly grocery spends',
        tagline: 'What 3 things do you spend the most money on monthly?',
        description:
          'Target your biggest food and pantry expenditures to optimize monthly household cashflow.',
        iconName: 'PieChart',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Identify top 3 monthly grocery expenditure drivers' },
          { title: 'Switch to wholesale partner supplies' },
          { title: 'Reinvest monthly savings into your rent fund' },
        ],
      },
      {
        slug: 'housing-roommate-sharing',
        title: 'Share living space with a roommate',
        tagline: 'Would you be open to sharing your space with a roommate?',
        description:
          'Cut housing costs by sharing verified apartments and splitting rent with vetted roommates.',
        iconName: 'Users',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Indicate roommate preferences and budget parameters' },
          { title: 'Connect with verified upward roommate candidates' },
          { title: 'Split tenancy lease and save up to 50% on rent' },
        ],
      },
      {
        slug: 'commute-transportation-savings',
        title: 'Reduce transportation & commute spend',
        tagline: 'How much do you spend on transportation per month?',
        description:
          'Reduce daily transit costs through carpooling, shared shuttles, and route optimization.',
        iconName: 'Car',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Calculate monthly transportation and fuel expenses' },
          { title: 'Explore carpool groups along common transit corridors' },
          { title: 'Save on weekly commute and reduce travel fatigue' },
        ],
      },
    ],
  },

  // ── E. Children's Development Goals ──────────────────────────────────────
  {
    slug: 'children',
    title: 'Children\'s development',
    description:
      'Helping parents identify academic skills, educational interests, and extracurricular activities.',
    iconName: 'GraduationCap',
    sortOrder: 5,
    goals: [
      {
        slug: 'improve-child-mathematics',
        title: 'Improve my child\'s mathematics',
        tagline: 'Help my child become better at mathematics',
        description: 'Strengthen mathematical intuition, problem-solving, and confidence in exams.',
        iconName: 'Calculator',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Assess current math grade level and diagnostic gaps' },
          { title: 'Enroll in structured weekend math clinic or tutor' },
          { title: 'Practice 30 minutes of math exercises 3x weekly' },
        ],
      },
      {
        slug: 'improve-child-english',
        title: 'Improve my child\'s English',
        tagline: 'Help my child improve their English skills',
        description: 'Develop vocabulary, reading comprehension, grammar, and creative writing.',
        iconName: 'BookOpen',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Set a weekly reading goal of 1 age-appropriate book' },
          { title: 'Practice weekly vocabulary flashcards and spelling tests' },
          { title: 'Write one short creative essay or story each week' },
        ],
      },
      {
        slug: 'improve-child-speaking-skills',
        title: 'Improve my child\'s speaking skills',
        tagline: 'Help my child become a better speaker',
        description: 'Cultivate articulate speech, diction, and public speaking confidence in kids.',
        iconName: 'Mic',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Practice daily bedtime reading aloud with expression' },
          { title: 'Enroll child in school debate or drama society' },
          { title: 'Organize mini family presentation evenings' },
        ],
      },
      {
        slug: 'introduce-child-to-programming',
        title: 'Introduce my child to programming and technology',
        tagline: 'Enrol my child in coding classes',
        description: 'Introduce logical thinking, Scratch, robotics, and child-friendly coding.',
        iconName: 'Code',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 120,
        actions: [
          { title: 'Select suitable age-appropriate coding platform (Scratch / Python)' },
          { title: 'Enrol in weekly interactive coding classes' },
          { title: 'Build and showcase child\'s first interactive mini-game' },
        ],
      },
      {
        slug: 'improve-child-digital-skills',
        title: 'Improve my child\'s digital skills',
        tagline: 'Teach useful computer and digital skills',
        description: 'Teach keyboard typing, word processing, research, and safe internet usage.',
        iconName: 'Laptop',
        sortOrder: 5,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Install touch-typing software on home computer' },
          { title: 'Teach document formatting and presentation creation' },
          { title: 'Review digital safety, privacy, and healthy screen limits' },
        ],
      },
      {
        slug: 'prepare-child-for-entrance-examinations',
        title: 'Prepare my child for entrance examinations',
        tagline: 'Support preparation for school entrance exams',
        description: 'Prepare thoroughly for Common Entrance, WAEC, Cambridge, or school admissions.',
        iconName: 'Award',
        sortOrder: 6,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Obtain past entrance exam papers for target schools' },
          { title: 'Create weekly timed mock exam schedule' },
          { title: 'Review mock results and strengthen weaker subject areas' },
        ],
      },
      {
        slug: 'develop-child-leadership-skills',
        title: 'Develop my child\'s leadership skills',
        tagline: 'Help my child develop confidence and leadership abilities',
        description: 'Nurture team collaboration, empathy, responsibility, and initiative.',
        iconName: 'Compass',
        sortOrder: 7,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 120,
        actions: [
          { title: 'Assign household project leadership responsibilities' },
          { title: 'Encourage leadership roles in school clubs or sports teams' },
          { title: 'Support community volunteering and teamwork projects' },
        ],
      },
      {
        slug: 'get-child-involved-in-sports',
        title: 'Get my child involved in sports',
        tagline: 'Enrol my child in a sports club; lawn tennis',
        description: 'Enrol in swimming, football, basketball, or lawn tennis for fitness and grit.',
        iconName: 'Activity',
        sortOrder: 8,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Choose preferred sport (Lawn Tennis, Swimming, Football)' },
          { title: 'Enrol in reputable youth sports academy' },
          { title: 'Attend scheduled weekend coaching sessions consistently' },
        ],
      },
      {
        slug: 'help-child-learn-piano',
        title: 'Help my child learn piano',
        tagline: 'Enrol my child in piano lessons',
        description: 'Develop musical ear, finger dexterity, and sheet music reading on the piano.',
        iconName: 'Music',
        sortOrder: 9,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Acquire or lease beginner digital piano/keyboard' },
          { title: 'Book weekly piano tutor or conservatory classes' },
          { title: 'Schedule 20 minutes of daily piano practice' },
        ],
      },
      {
        slug: 'develop-child-musical-ability',
        title: 'Develop my child’s musical ability beyond piano',
        tagline: 'Enrol my child in music lessons',
        description: 'Explore violin, guitar, drums, or voice training for well-rounded musicianship.',
        iconName: 'Music2',
        sortOrder: 10,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Identify child\'s musical instrument interest (Guitar, Violin, Drums, Vocals)' },
          { title: 'Engage qualified instrument coach' },
          { title: 'Prepare for musical grade performance assessments' },
        ],
      },
      {
        slug: 'help-child-learn-martial-arts',
        title: 'Help my child learn martial arts',
        tagline: 'Enrol my child in karate',
        description: 'Instil self-discipline, focus, respect, and physical self-defense in karate or taekwondo.',
        iconName: 'Shield',
        sortOrder: 11,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 180,
        actions: [
          { title: 'Register child with certified martial arts dojo (Karate/Taekwondo)' },
          { title: 'Procure official uniform (gi) and protective gear' },
          { title: 'Prepare for termly belt promotion grading exams' },
        ],
      },
      {
        slug: 'improve-child-creative-skills',
        title: 'Improve my child\'s creative skills',
        tagline: 'Support drawing, painting, crafts and other creative activities',
        description: 'Encourage artistic expression through sketching, painting, ceramics, and crafting.',
        iconName: 'Palette',
        sortOrder: 12,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Set up dedicated art and creative crafts station at home' },
          { title: 'Stock quality sketchbooks, paints, and crafting materials' },
          { title: 'Enrol in weekend youth art and design workshop' },
        ],
      },
    ],
  },

  // ── F. Custom Goals ──────────────────────────────────────────────────────
  {
    slug: 'custom',
    title: 'Custom goals',
    description:
      'Create your own goal, describe what you want to achieve, and set your own timeline.',
    iconName: 'Sparkles',
    sortOrder: 6,
    goals: [
      {
        slug: 'create-my-own-goal',
        title: 'Create my own goal',
        tagline: 'Enter a goal that is not already listed',
        description: 'Define an outcome that matters specifically to your personal journey.',
        iconName: 'PlusCircle',
        sortOrder: 1,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Describe specific outcome and target milestone' },
          { title: 'Set completion timeline and date' },
          { title: 'Add custom actionable steps' },
        ],
      },
      {
        slug: 'describe-what-i-want-to-achieve',
        title: 'Describe what I want to achieve',
        tagline: 'Explain the outcome I am working towards',
        description: 'Provide detailed notes on the milestone and success criteria.',
        iconName: 'FileText',
        sortOrder: 2,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'Write down what success looks like' },
          { title: 'Determine required resources and budget' },
          { title: 'Track weekly execution steps' },
        ],
      },
      {
        slug: 'add-actions-towards-my-goal',
        title: 'Add actions towards my goal',
        tagline: 'List the steps I intend to take',
        description: 'Break down your goal into small, measurable, daily or weekly actions.',
        iconName: 'ListChecks',
        sortOrder: 3,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 90,
        actions: [
          { title: 'List the first 3 steps to take this week' },
          { title: 'Set check-in reminders for key milestones' },
          { title: 'Mark tasks complete as you make progress' },
        ],
      },
      {
        slug: 'suggest-a-new-goal-category',
        title: 'Suggest a new goal category',
        tagline: 'Tell Upward about a goal that is not currently supported',
        description: 'Help Upward understand what users want and identify new opportunities to support them.',
        iconName: 'MessageSquare',
        sortOrder: 4,
        targetType: GoalTargetType.CHECKLIST_ACTIONS,
        defaultDurationDays: 30,
        actions: [
          { title: 'Enter proposed category name and description' },
          { title: 'Submit feedback to Upward platform team' },
        ],
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding production goal categories, system goals, and predefined action templates...')

  for (const catData of PRODUCTION_GOAL_CATEGORIES) {
    const { goals, ...categoryFields } = catData
    const categoryStatus = GoalPublishStatus.PUBLISHED

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
