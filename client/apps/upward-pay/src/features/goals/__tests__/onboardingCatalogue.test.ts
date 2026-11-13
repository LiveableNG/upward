import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESENTATION_CATALOGUE,
  PROFESSIONAL_QUALIFICATIONS,
  type PresentationGoal,
} from '../data/presentationCatalogue'
import { majorToMinorString } from '../utils/monetary'

describe('Stage 3C.4 — Presentation Catalogue & Onboarding Logic', () => {
  describe('Presentation Catalogue Structure & Categories', () => {
    it('contains exactly the five agreed product categories', () => {
      const categoryIds = PRESENTATION_CATALOGUE.map((c) => c.id)
      assert.deepEqual(categoryIds, [
        'housing-living',
        'financial-income',
        'career-professional',
        'childrens-development',
        'personal-goals',
      ])
    })

    it('defines non-empty titles, descriptions and icons for each category', () => {
      PRESENTATION_CATALOGUE.forEach((cat) => {
        assert.ok(cat.title.length > 0)
        assert.ok(cat.description.length > 0)
        assert.ok(cat.iconName.length > 0)
        assert.ok(cat.subcategories.length > 0)
        assert.ok(cat.goals.length > 0)
      })
    })
  })

  describe('Category A: Housing & Living', () => {
    const housing = PRESENTATION_CATALOGUE.find((c) => c.id === 'housing-living')!

    it('contains all required subcategories', () => {
      const subcatIds = housing.subcategories.map((s) => s.id)
      assert.ok(subcatIds.includes('rent-housing'))
      assert.ok(subcatIds.includes('home-improvement'))
      assert.ok(subcatIds.includes('furniture-decor'))
      assert.ok(subcatIds.includes('installations'))
      assert.ok(subcatIds.includes('remote-work'))
    })

    it('marks "Move to a new apartment" as coming soon', () => {
      const moveGoal = housing.goals.find((g) => g.title === 'Move to a new apartment')
      assert.ok(moveGoal)
      assert.equal(moveGoal.comingSoon, true)
    })

    it('includes core rent, home and furniture goals', () => {
      const titles = housing.goals.map((g) => g.title)
      assert.ok(titles.includes('Pay my rent'))
      assert.ok(titles.includes('Save towards my next rent'))
      assert.ok(titles.includes('Save towards owning a home'))
      assert.ok(titles.includes('Improve my home'))
      assert.ok(titles.includes('Improve my home feel'))
      assert.ok(titles.includes('Buy furniture'))
      assert.ok(titles.includes('Paint a room'))
      assert.ok(titles.includes('Improve home décor'))
      assert.ok(titles.includes('Home installations'))
      assert.ok(titles.includes('Improve my remote-work productivity'))
      assert.ok(titles.includes('Setting up a productive workspace'))
    })
  })

  describe('Category B: Financial & Income', () => {
    const financial = PRESENTATION_CATALOGUE.find((c) => c.id === 'financial-income')!

    it('includes income, side-hustle, investing and debt goals', () => {
      const titles = financial.goals.map((g) => g.title)
      assert.ok(titles.includes('Get my first source of income'))
      assert.ok(titles.includes('Grow my existing income'))
      assert.ok(titles.includes('Get a promotion'))
      assert.ok(titles.includes('Start a side hustle'))
      assert.ok(titles.includes('Start freelancing'))
      assert.ok(titles.includes('Get a remote international job'))
      assert.ok(titles.includes('Monetise my skills'))
      assert.ok(titles.includes('Start investing'))
      assert.ok(titles.includes('Save more money'))
      assert.ok(titles.includes('Reduce my expenses'))
      assert.ok(titles.includes('Pay off debts'))
      assert.ok(titles.includes('Save for a family occasion'))
      assert.ok(titles.includes('Relocate abroad'))
    })
  })

  describe('Category C: Career & Professional Development & Qualifications', () => {
    const career = PRESENTATION_CATALOGUE.find((c) => c.id === 'career-professional')!

    it('includes career advancement, management and learning goals', () => {
      const titles = career.goals.map((g) => g.title)
      assert.ok(titles.includes('Get my first job'))
      assert.ok(titles.includes('Get an internship'))
      assert.ok(titles.includes('Change my career'))
      assert.ok(titles.includes('Switch to tech'))
      assert.ok(titles.includes('Move into management'))
      assert.ok(titles.includes('Grow my business'))
      assert.ok(titles.includes('Develop leadership skills'))
      assert.ok(titles.includes('Improve public speaking'))
      assert.ok(titles.includes('Improve sales skills'))
      assert.ok(titles.includes('Improve professional appearance'))
      assert.ok(titles.includes('Become more effective at remote work'))
      assert.ok(titles.includes('Build a remote-work setup'))
      assert.ok(titles.includes('Obtain a certification'))
      assert.ok(titles.includes('Obtain a professional licence'))
      assert.ok(titles.includes('Prepare for a professional examination'))
      assert.ok(titles.includes("Pursue a Master's degree"))
      assert.ok(titles.includes('Grow my career or business'))
    })

    it('contains all required professional certifications in the qualification catalogue', () => {
      const required = [
        'PMP',
        'ICAN',
        'OGF Academy',
        'CIPM',
        'NIPM',
        'CISA',
        'CCNA',
        'CEH',
        'TOGAF',
        'DCP',
        'ACIN',
        'FCIN',
        'CPPM',
        'CLM',
        'CPPP',
        'HSE',
        'TCRN',
        'NIMASA',
        'COREN',
        'NSE',
        'SURCON',
        'NIS',
        'NIESV',
        'CORBON',
        'NIOB',
        'NIQS',
        'Professional Engineering',
        "Master's Degree",
      ]

      required.forEach((keyword) => {
        const found = PROFESSIONAL_QUALIFICATIONS.some((q) => q.includes(keyword))
        assert.ok(found, `Expected qualification containing "${keyword}"`)
      })
      assert.ok(PROFESSIONAL_QUALIFICATIONS.length >= 27)
    })
  })

  describe('Category D: Children\'s Development', () => {
    const children = PRESENTATION_CATALOGUE.find((c) => c.id === 'childrens-development')!

    it('includes academics, sports, arts and life skills goals', () => {
      const titles = children.goals.map((g) => g.title)
      assert.ok(titles.includes('Improve mathematics'))
      assert.ok(titles.includes('Improve English'))
      assert.ok(titles.includes('Improve communication and speaking'))
      assert.ok(titles.includes('Learn programming and technology'))
      assert.ok(titles.includes('Develop digital skills'))
      assert.ok(titles.includes('Prepare for entrance examinations'))
      assert.ok(titles.includes('Develop leadership skills'))
      assert.ok(titles.includes('Learn sports, including tennis'))
      assert.ok(titles.includes('Learn piano'))
      assert.ok(titles.includes('Learn another musical instrument'))
      assert.ok(titles.includes('Learn martial arts'))
      assert.ok(titles.includes('Develop creative skills'))
      assert.ok(titles.includes('Other personal development activities'))
    })
  })

  describe('Category E: Personal Goals', () => {
    const personal = PRESENTATION_CATALOGUE.find((c) => c.id === 'personal-goals')!

    it('includes custom personal goal creation template', () => {
      const customGoal = personal.goals.find((g) => g.title === 'Create my own goal')
      assert.ok(customGoal)
      assert.equal(customGoal.categoryId, 'personal-goals')
    })
  })

  describe('Search & Filter Invariants', () => {
    it('finds goals case-insensitively across categories', () => {
      const query = 'piano'
      const matches: PresentationGoal[] = []
      PRESENTATION_CATALOGUE.forEach((cat) => {
        cat.goals.forEach((g) => {
          if (
            g.title.toLowerCase().includes(query) ||
            g.tagline?.toLowerCase().includes(query) ||
            g.description?.toLowerCase().includes(query)
          ) {
            matches.push(g)
          }
        })
      })
      assert.equal(matches.length, 1)
      assert.equal(matches[0].title, 'Learn piano')
    })

    it('converts major target strings to minor units safely', () => {
      assert.equal(majorToMinorString('500000'), '50000000')
      assert.equal(majorToMinorString('1,250.50'), '125050')
      assert.equal(majorToMinorString(''), '0')
    })

    it('uses restrained iconography without Sparkles across all categories', () => {
      PRESENTATION_CATALOGUE.forEach((cat) => {
        assert.notEqual(cat.iconName, 'Sparkles')
      })
    })
  })
})
