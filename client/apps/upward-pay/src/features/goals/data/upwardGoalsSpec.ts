export type GoalCategoryId =
  | 'housing'
  | 'income'
  | 'career'
  | 'save_money'
  | 'children'

export const MAX_GOALS_PER_CATEGORY = 3

export interface SpecGoalOption {
  id: string
  title: string
  description: string
  comingSoon?: boolean
  requiresQualification?: boolean
  requiresLocationPrompt?: boolean
  requiresGiftOccasionPrompt?: boolean
  requiresHomeRefreshModal?: boolean
  requiresSideIncomePrompt?: boolean
  actionHref?: string
  defaultMilestones: string[]
}

export interface SpecCategoryDefinition {
  id: GoalCategoryId
  title: string
  shortTitle: string
  subtitle: string
  intro: string
  isDefaultActive?: boolean
  badgeDefault: string
  goals: SpecGoalOption[]
}

export const HOME_REFRESH_ITEMS = [
  { id: 'room-carpets', name: 'Room Carpets & Centre Rugs', category: 'Living Room' },
  { id: 'bathroom-footmats', name: 'Bathroom Carpets & Footmats', category: 'Bath & Entry' },
  { id: 'mop-bucket', name: 'Microfibre Mop & Spin Bucket', category: 'Cleaning' },
  { id: 'broom-brush', name: 'Soft Broom & Scrubbing Brush Set', category: 'Cleaning' },
  { id: 'sponge-pack', name: 'Multi-Surface Dish & Bath Sponges', category: 'Kitchen & Bath' },
  { id: 'kitchen-towels', name: 'Absorbent Cotton Kitchen Towels', category: 'Kitchen' },
  { id: 'cutlery-set', name: 'Stainless Steel Cutlery Set', category: 'Dining & Kitchen' },
] as const

export const PROFESSIONAL_QUALIFICATIONS = [
  { group: 'Project, Finance & Management', items: ['PMP', 'ICAN', 'ACCA', 'CIPM', 'NIPM', 'OGF Academy'] },
  { group: 'Technology & Enterprise Architecture', items: ['CISA (ISACA)', 'CCNA (Cisco)', 'CEH (EC-Council)', 'TOGAF'] },
  { group: 'Credit, Procurement & Supply Chain', items: ['DCP', 'ACIN', 'FCIN', 'CPPM', 'CLM', 'CPPP'] },
  { group: 'Safety, Healthcare & Maritime', items: ['HSE', 'TCRN License', 'NIMASA Maritime Standards'] },
  {
    group: 'Engineering, Built Environment & Licences',
    items: [
      'Professional Engineering Examinations',
      'COREN',
      'NSE',
      'SURCON',
      'NIS',
      'NIESV',
      'CORBON',
      'NIOB',
      'NIQS',
    ],
  },
  { group: 'Postgraduate Studies', items: ["Master's Degree Programme"] },
] as const

export interface SaveMoneyAnswers {
  laundrySpendMonthly: string
  groceryRegularItems: [string, string, string]
  groceryTopSpendItems: [string, string, string]
  openToRoommate: 'yes' | 'maybe' | 'no' | ''
  commuteSpendMonthly: string
}

export interface CustomGoalEntry {
  id: string
  title: string
  description: string
  whenTimeline: string
  targetDate?: string
  targetAmountNaira?: number
  savedAmountNaira: number
  suggestedCategory?: string
  actions: Array<{ id: string; title: string; completed: boolean }>
  createdAt: string
}

export const UPWARD_GOAL_CATEGORIES: SpecCategoryDefinition[] = [
  {
    id: 'housing',
    title: 'Home & Lifestyle Goals',
    shortTitle: 'Home & Lifestyle',
    subtitle: 'Rent savings, payments, home ownership, and living space upgrades',
    intro:
      'Housing is active by default on Upward. Select up to 3 additional home and lifestyle goals you want to focus on.',
    isDefaultActive: true,
    badgeDefault: 'Active',
    goals: [
      {
        id: 'pay-rent-now',
        title: 'Pay my rent now',
        description: 'Make my rent payment seamlessly through Upward.',
        actionHref: '/dashboard/pay-rent',
        defaultMilestones: [
          'Confirm rent invoice and landlord bank details',
          'Complete rent transfer and download verified receipt',
        ],
      },
      {
        id: 'pay-less-next-rent',
        title: 'Pay less for my next rent',
        description: 'Build up automated savings towards my upcoming rent.',
        actionHref: '/dashboard/savings',
        defaultMilestones: [
          'Set target rent amount and due date in Rent Vault',
          'Automate monthly or weekly rent reserve contributions',
        ],
      },
      {
        id: 'move-new-apartment',
        title: 'Move to a new apartment',
        description: 'Plan and save towards moving into a new home; indicate where I want to move.',
        comingSoon: true,
        requiresLocationPrompt: true,
        defaultMilestones: [
          'Indicate preferred neighbourhood and apartment budget',
          'Set aside moving and agency reserve fund',
        ],
      },
      {
        id: 'buy-a-house',
        title: 'Buy a house',
        description: 'Start preparing financially to buy a house in the future (education, co-op, and events).',
        defaultMilestones: [
          'Attend home-ownership webinar and review Nigerian mortgage/co-op guides',
          'Register interest in the Upward Housing Cooperative',
          'Join an upcoming 2-day site visit event',
        ],
      },
      {
        id: 'prepare-new-year',
        title: 'Prepare for the new year',
        description:
          'Refresh your home with essential packages — room & bathroom carpets, mop, broom, brush, sponge, kitchen towels, and cutlery.',
        requiresHomeRefreshModal: true,
        defaultMilestones: [
          'Select home refresh items needed for the new year',
          'Reserve Home Refresh bundle in the marketplace',
        ],
      },
      {
        id: 'improve-home-feel',
        title: 'Improve my home feel',
        description: 'Improve the look and feel of my home with furniture, painting, décor, and installations.',
        actionHref: '/dashboard/explore',
        defaultMilestones: [
          'Choose priority room upgrade (painting, décor, or furniture)',
          'Set a target budget or browse vetted marketplace options',
        ],
      },
      {
        id: 'improve-remote-work-home',
        title: 'Improve remote work productivity',
        description: 'Make my home more suitable for work and everyday productivity.',
        actionHref: '/dashboard/explore',
        defaultMilestones: [
          'Audit workspace ergonomics, lighting, and power backup',
          'Upgrade desk, chair, or inverter setup',
        ],
      },
      {
        id: 'travel',
        title: 'Travel',
        description: 'Plan and save intentionally towards an upcoming trip or vacation.',
        defaultMilestones: [
          'Pick destination, travel month, and estimated budget',
          'Set monthly travel savings target',
        ],
      },
      {
        id: 'gift-someone',
        title: 'Gift someone',
        description: 'Plan ahead for birthdays, Christmas, or special occasions — indicate interest.',
        requiresGiftOccasionPrompt: true,
        defaultMilestones: [
          'Select upcoming gifting occasion (Birthday, Christmas, or Anniversary)',
          'Set aside gifting budget ahead of the date',
        ],
      },
    ],
  },
  {
    id: 'income',
    title: 'Income & Financial Goals',
    shortTitle: 'Income & Finance',
    subtitle: 'Earn more, build extra income streams, and strengthen financial stability',
    intro:
      'Select up to 3 income or financial goals. We also connect interested members with relevant speakers, trainers, communities, and events.',
    badgeDefault: 'Get started',
    goals: [
      {
        id: 'get-promotion',
        title: 'Get a promotion',
        description: 'Get promoted in the coming year to increase my income.',
        defaultMilestones: [
          'Document key wins and measurable impact at work',
          'Align promotion criteria and timeline with manager',
        ],
      },
      {
        id: 'start-side-hustle',
        title: 'Start a side hustle',
        description: 'Find an additional source of income outside my main job and build an extra income stream.',
        requiresSideIncomePrompt: true,
        defaultMilestones: [
          'Identify the side-income opportunity I want to pursue',
          'Join an Upward side-income session or community event',
        ],
      },
      {
        id: 'start-freelancing',
        title: 'Start freelancing',
        description: 'Offer professional services to clients independently.',
        requiresSideIncomePrompt: true,
        defaultMilestones: [
          'Define freelance service offering and pricing',
          'Pitch and onboard first paying client',
        ],
      },
      {
        id: 'remote-international-job',
        title: 'Get a remote international job',
        description: 'Earn income by working remotely for an international employer.',
        defaultMilestones: [
          'Tailor CV and LinkedIn profile for global remote roles',
          'Submit weekly applications to remote-first international companies',
        ],
      },
      {
        id: 'monetise-skills',
        title: 'Monetise my skills',
        description: 'Earn money from skills I already possess.',
        requiresSideIncomePrompt: true,
        defaultMilestones: [
          'Package existing skill into a product, service, or workshop',
          'Launch to initial network and collect feedback',
        ],
      },
      {
        id: 'grow-existing-income',
        title: 'Grow my existing income',
        description: 'Increase what I currently earn through salary growth or higher-value work.',
        defaultMilestones: [
          'Set target monthly income benchmark for the year',
          'Identify highest-leverage path to increase earnings',
        ],
      },
      {
        id: 'first-source-of-income',
        title: 'Get my first source of income',
        description: 'Start earning consistently, particularly early in my career.',
        defaultMilestones: [
          'Complete job-readiness portfolio and CV',
          'Apply to entry-level roles, paid internships, or starter gigs',
        ],
      },
      {
        id: 'start-investing',
        title: 'Start investing',
        description: 'Begin investing towards long-term financial security.',
        defaultMilestones: [
          'Determine monthly investment allocation',
          'Start consistent contributions into vetted investment vehicles',
        ],
      },
      {
        id: 'save-more-money',
        title: 'Save more money',
        description: 'Improve my ability to save and build financial reserves.',
        defaultMilestones: [
          'Set a target emergency and savings reserve amount',
          'Automate savings on payday',
        ],
      },
      {
        id: 'reduce-expenses',
        title: 'Reduce my expenses',
        description: 'Spend less and find practical ways to reduce monthly costs.',
        defaultMilestones: [
          'Audit top 3 monthly spending categories',
          'Cut recurring non-essential expenses by 15%',
        ],
      },
      {
        id: 'relocate-abroad',
        title: 'Relocate abroad',
        description: 'Explore relocating to another country as an economic or financial goal.',
        defaultMilestones: [
          'Research visa pathways, qualification requirements, and proof of funds',
          'Build dedicated relocation savings plan',
        ],
      },
      {
        id: 'save-family-occasion',
        title: 'Save towards an important family occasion',
        description: "For example, save towards a parent's birthday, wedding, or family milestone.",
        defaultMilestones: [
          'Set target amount and date for the family occasion',
          'Save monthly towards the celebration budget',
        ],
      },
      {
        id: 'pay-off-debts',
        title: 'Pay off my debts',
        description: 'Reduce or clear outstanding personal debts.',
        defaultMilestones: [
          'List all outstanding balances and repayment priorities',
          'Commit to a fixed monthly debt-clearance schedule',
        ],
      },
    ],
  },
  {
    id: 'career',
    title: 'Career & Professional Development',
    shortTitle: 'Career & Skills',
    subtitle: 'Career transitions, certifications, licences, leadership, and workplace growth',
    intro:
      'Select up to 3 career goals. If you are pursuing a certification, licence, exam, or postgraduate degree, you can choose it from our list or enter your own.',
    badgeDefault: 'Get started',
    goals: [
      {
        id: 'get-first-job',
        title: 'Get my first job',
        description: 'Secure my first employment opportunity.',
        defaultMilestones: ['Revamp CV and LinkedIn', 'Apply to 10 targeted entry-level roles'],
      },
      {
        id: 'get-internship',
        title: 'Get an internship',
        description: 'Gain practical experience in a chosen field.',
        defaultMilestones: ['Shortlist target companies', 'Submit internship applications and prepare for interviews'],
      },
      {
        id: 'change-career',
        title: 'Change my career',
        description: 'Move from my current career into another field.',
        defaultMilestones: ['Map transferable skills to target industry', 'Complete foundational project or course'],
      },
      {
        id: 'switch-to-tech',
        title: 'Switch career to tech',
        description: 'Transition into the technology industry.',
        defaultMilestones: [
          'Choose tech track (Engineering, Product, Data, Design, or Cybersecurity)',
          'Build portfolio projects and join a tech peer community',
        ],
      },
      {
        id: 'promoted-to-management',
        title: 'Get promoted to management',
        description: 'Progress into a management or leadership role.',
        defaultMilestones: ['Take ownership of team-level initiatives', 'Complete management readiness review'],
      },
      {
        id: 'start-own-business',
        title: 'Start my own business',
        description: 'Build a small or medium-sized business.',
        defaultMilestones: ['Validate business model and unit economics', 'Register business and acquire first customers'],
      },
      {
        id: 'improve-leadership',
        title: 'Improve my leadership skills',
        description: 'Develop the skills needed to lead people and teams.',
        defaultMilestones: ['Complete leadership training or coaching', 'Lead a cross-functional project'],
      },
      {
        id: 'improve-speaking-presentation',
        title: 'Improve my presentation & speaking skills',
        description: 'Become a better and more confident speaker.',
        defaultMilestones: ['Practice structured presentations monthly', 'Deliver a talk or team presentation'],
      },
      {
        id: 'get-mentor-coach',
        title: 'Get a mentor / coach',
        description: 'Connect with an experienced mentor or career coach in my field.',
        defaultMilestones: ['Define mentorship goals', 'Connect with a mentor and schedule monthly check-ins'],
      },
      {
        id: 'better-salesperson',
        title: 'Become a better salesperson',
        description: 'Improve my ability to communicate, persuade, and close sales.',
        defaultMilestones: ['Study consultative selling frameworks', 'Track pitch-to-close conversion weekly'],
      },
      {
        id: 'improve-professional-appearance',
        title: 'Improve my professional appearance',
        description: 'Upgrade my professional wardrobe and present myself better professionally.',
        defaultMilestones: ['Plan core professional wardrobe essentials', 'Budget and refresh work attire'],
      },
      {
        id: 'start-working-remotely',
        title: 'Start working remotely',
        description: 'Find an opportunity to work remotely.',
        defaultMilestones: ['Optimize profile for remote roles', 'Apply to remote-friendly employers'],
      },
      {
        id: 'improve-remote-setup',
        title: 'Improve my remote-work setup',
        description: 'Create a more suitable, work-friendly space.',
        defaultMilestones: ['Upgrade chair, desk, and backup power', 'Ensure reliable high-speed internet'],
      },
      {
        id: 'get-professional-certification',
        title: 'Get a professional certification',
        description: 'Prepare for and obtain a recognised professional qualification (PMP, ICAN, CIPM, CISA, CCNA, etc.).',
        requiresQualification: true,
        defaultMilestones: [
          'Select target certification and register for exam window',
          'Follow weekly study plan and practice mock exams',
        ],
      },
      {
        id: 'get-professional-licence',
        title: 'Get a professional licence',
        description: 'Obtain a licence required to practise in a profession (COREN, NSE, SURCON, NIS, NIESV, TCRN, etc.).',
        requiresQualification: true,
        defaultMilestones: [
          'Compile required logbooks, references, and application documents',
          'Complete professional interview and licensing registration',
        ],
      },
      {
        id: 'take-professional-exam',
        title: 'Take a professional examination',
        description: 'Prepare for a specific professional or engineering examination.',
        requiresQualification: true,
        defaultMilestones: ['Register for examination diet', 'Complete syllabus revision and past questions'],
      },
      {
        id: 'get-masters-degree',
        title: "Get a master's degree",
        description: 'Plan and prepare for postgraduate studies.',
        requiresQualification: true,
        defaultMilestones: [
          'Shortlist postgraduate programmes and scholarship/funding options',
          'Prepare transcripts, statement of purpose, and application',
        ],
      },
      {
        id: 'grow-professional-career',
        title: 'Grow my professional career',
        description: 'Become more established and progress in my chosen profession.',
        defaultMilestones: ['Expand professional network and industry visibility', 'Set 12-month career progression milestones'],
      },
      {
        id: 'grow-business-career',
        title: 'Grow my business career',
        description: 'Develop and advance my business or entrepreneurial career.',
        defaultMilestones: ['Strengthen business operations and revenue channels', 'Join an entrepreneurial growth network'],
      },
    ],
  },
  {
    id: 'save_money',
    title: 'Save Money / Pay Less for Stuff',
    shortTitle: 'Pay Less & Save',
    subtitle: 'Cut everyday costs on laundry, groceries, housing, and daily commute',
    intro:
      'Answer a few quick questions about your everyday spending so Upward can unlock group discounts and ways for you to pay less.',
    badgeDefault: 'Quick questions',
    goals: [
      {
        id: 'pay-less-laundry',
        title: 'Pay less on laundry & drycleaning',
        description: 'Lower your monthly drycleaning and laundry spend.',
        defaultMilestones: ['Share monthly drycleaning spend', 'Get matched with discounted laundry bundles'],
      },
      {
        id: 'pay-less-groceries',
        title: 'Pay less on monthly groceries',
        description: 'Save on the 3 staple items you buy regularly and spend the most on.',
        defaultMilestones: ['List top 3 regular and highest-spend grocery items', 'Join Upward bulk grocery buying'],
      },
      {
        id: 'shared-housing-savings',
        title: 'Cut housing costs (Roommate / Co-living)',
        description: 'Explore whether sharing space with a vetted roommate could reduce rent.',
        defaultMilestones: ['Indicate roommate preference', 'Review co-living savings options'],
      },
      {
        id: 'pay-less-commute',
        title: 'Reduce monthly transportation costs',
        description: 'Track and optimize how much you spend on commuting each month.',
        defaultMilestones: ['Log monthly transport spend', 'Explore commute savings options'],
      },
    ],
  },
  {
    id: 'children',
    title: "Children's Development Goals",
    shortTitle: "Children's Growth",
    subtitle: 'Academics, coding, sports, music, martial arts, and creative clubs for your child',
    intro:
      'Select up to 3 development goals for your children. We are also building children’s communities and clubs around mathematics, coding, and sports.',
    badgeDefault: 'Get started',
    goals: [
      {
        id: 'child-mathematics',
        title: "Improve my child's mathematics",
        description: 'Help my child become stronger and more confident in mathematics.',
        defaultMilestones: ['Assess current maths level', 'Enrol in Upward Maths Club or tutoring'],
      },
      {
        id: 'child-english',
        title: "Improve my child's English",
        description: 'Help my child improve their reading, writing, and English skills.',
        defaultMilestones: ['Set weekly reading routine', 'Support structured English practice'],
      },
      {
        id: 'child-speaking',
        title: "Improve my child's speaking skills",
        description: 'Help my child become a confident, articulate speaker.',
        defaultMilestones: ['Practice public speaking and debate exercises', 'Join children’s speaking club'],
      },
      {
        id: 'child-coding-tech',
        title: 'Introduce my child to programming & technology',
        description: 'Enrol my child in coding and technology classes.',
        defaultMilestones: ['Choose age-appropriate coding track', 'Enrol in weekend or holiday coding classes'],
      },
      {
        id: 'child-digital-skills',
        title: "Improve my child's digital skills",
        description: 'Teach useful computer and digital literacy skills.',
        defaultMilestones: ['Set up guided computer learning sessions', 'Complete foundational digital project'],
      },
      {
        id: 'child-entrance-exams',
        title: 'Prepare my child for entrance examinations',
        description: 'Support structured preparation for school entrance exams.',
        defaultMilestones: ['Gather past papers and exam syllabus', 'Set weekly practice schedule'],
      },
      {
        id: 'child-leadership',
        title: "Develop my child's leadership skills",
        description: 'Help my child develop confidence, responsibility, and leadership abilities.',
        defaultMilestones: ['Encourage team and leadership activities', 'Join youth leadership workshop'],
      },
      {
        id: 'child-sports-tennis',
        title: 'Get my child involved in sports (e.g. Lawn Tennis)',
        description: 'Enrol my child in a sports club or lawn tennis coaching.',
        defaultMilestones: ['Choose preferred sport (Lawn Tennis, Football, Swimming)', 'Enrol in weekend sports club'],
      },
      {
        id: 'child-piano',
        title: 'Help my child learn piano',
        description: 'Enrol my child in structured piano lessons.',
        defaultMilestones: ['Schedule beginner/intermediate piano lessons', 'Practice 20 minutes daily'],
      },
      {
        id: 'child-music-beyond-piano',
        title: "Develop my child's musical ability beyond piano",
        description: 'Enrol my child in voice, guitar, violin, or other music lessons.',
        defaultMilestones: ['Pick musical instrument', 'Start weekly music instruction'],
      },
      {
        id: 'child-martial-arts',
        title: 'Help my child learn martial arts (Karate)',
        description: 'Enrol my child in karate or martial arts for discipline and fitness.',
        defaultMilestones: ['Find nearby karate dojo or club', 'Attend first belt training term'],
      },
      {
        id: 'child-creative-skills',
        title: "Improve my child's creative skills",
        description: 'Support drawing, painting, crafts, and creative activities.',
        defaultMilestones: ['Provide art and craft supplies', 'Join weekend creative studio session'],
      },
    ],
  },
]
