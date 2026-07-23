export const MOCK_RENT_PASSPORT = {
  name: 'David Adeyemi',
  address: '14 Admiralty Way, Lekki, Lagos',
  score: 350,
  maxScore: 900,
  band: 'Silver',
  onTimeRate: '100%',
  memberSince: 'Jul 2025',
  totalPaid: '₦100k',
  onTimeCycles: '1 / 1',
  identityVerified: true,
  landlordSees: [
    'Verified identity (BVN confirmed)',
    'Confirmed tenancy in Lekki, Lagos',
    '100% on-time payment record',
  ],
}

export const APPLICATION_KYC_COPY = {
  profileTitle: 'Rent Credibility',
  profileSubtitle: 'Preview what landlords see with your Upward profile',
  profileIntro:
    'Share this verified report with landlords and lenders to prove your rent reliability — no paperwork needed.',
  profileLandlordHeading: 'What landlords & lenders see',
  identityTitle: 'KYC Information',
  identitySubtitle: 'Complete this so the landlord can review your application',
  identityMockNote: 'Your responses are saved securely and only shared with relevant reviewers.',
}

export type KycCondition = {
  type: 'equals' | 'not_equals' | 'empty' | 'not_empty'
  questionId: string | null
  value?: string | null
}

export type KycSectionNavigationRule = {
  value: string
  goToSection: string | 'submit'
}

export type KycQuestion = {
  id: string
  key?: string | null
  type: 'short' | 'long' | 'radio' | 'checkbox' | 'dropdown' | 'date' | 'time' | 'file'
  title: string
  options: string[]
  visible: boolean
  disabled: boolean
  readonly: boolean
  required: boolean
  placeholder?: string | null
  description?: string | null
  accept?: string
  conditions?: {
    visible_if?: KycCondition | null
    required_if?: KycCondition | null
  }
  sectionNavigation?: {
    enabled: boolean
    rules: KycSectionNavigationRule[]
  }
}

export type KycSection = {
  id: string
  title: string
  description?: string | null
  questions: KycQuestion[]
  nextSection?: string | 'submit' | null
  isCollapsed?: boolean
}

export type KycFormSchema = {
  title: string | null
  description: string | null
  sections: KycSection[]
}

export type ApplicationKycSettings = {
  id: string
  name: string
  form: KycFormSchema
}

export const MOCK_APPLICATION_KYC_SETTINGS: ApplicationKycSettings = {
  id: 'x6ZBklM0pJ',
  name: 'Simple Form',
  form: {
    title: 'Tenant Verification Form',
    description: 'This helps us verify your profile and speed up landlord review.',
    sections: [
      {
        id: "1",
        title: "Personal Information",
        questions: [
          {
            id: "1732617992285",
            key: "type_of_tenant",
            type: "radio",
            title: "Type of tenant",
            options: [
              "Individual",
              "Corporate"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618028233",
            key: "first_name",
            type: "short",
            title: "First Name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: {
                type: "equals",
                value: "Individual",
                questionId: "1732617992285"
              },
              required_if: {
                type: "equals",
                value: "Individual",
                questionId: "1732617992285"
              }
            },
            description: null,
            placeholder: "Enter your first name",
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618031862",
            key: "last_name",
            type: "short",
            title: "Last Name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: {
                type: "equals",
                value: "Individual",
                questionId: "1732617992285"
              },
              required_if: {
                type: "equals",
                value: "Individual",
                questionId: "1732617992285"
              }
            },
            description: null,
            placeholder: "Enter your last name",
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618033947",
            key: "corporate_name",
            type: "short",
            title: "Corporate Name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: {
                type: "equals",
                value: "Corporate",
                questionId: "1732617992285"
              },
              required_if: {
                type: "equals",
                value: "Corporate",
                questionId: "1732617992285"
              }
            },
            description: null,
            placeholder: "Enter your corporate name",
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618315136",
            key: "email",
            type: "short",
            title: "Email",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: "Enter your email address",
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618381734",
            key: "phone",
            type: "short",
            title: "Phone",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: null,
              required_if: {
                type: "equals",
                value: null,
                questionId: null
              }
            },
            description: null,
            placeholder: "Enter your phone number",
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1732618701511",
            key: null,
            type: "radio",
            title: "Work Type",
            options: [
              "Employee",
              "Self Employed"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [
                {
                  value: "Employee",
                  goToSection: "2"
                },
                {
                  value: "Self Employed",
                  goToSection: "3"
                }
              ],
              enabled: true
            }
          },
          {
            id: "1733738252739",
            key: null,
            type: "short",
            title: "Previous Landlord\/Caretaker Phone Number",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733738279810",
            key: null,
            type: "short",
            title: "Previous Apartment Address",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733738450900",
            key: null,
            type: "radio",
            title: "Who Will You Live With?",
            options: [
              "Family (Married)",
              "Friends",
              "Alone",
              "Partner",
              "Relatives"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733738607877",
            key: null,
            type: "radio",
            title: "Do You Own Pets?",
            options: [
              "Yes",
              "No"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          }
        ],
        description: null,
        isCollapsed: true,
        nextSection: null
      },
      {
        id: "2",
        title: "Employee Information",
        questions: [
          {
            id: "1732618687663",
            key: null,
            type: "short",
            title: "Where do you work?",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733738698556",
            key: null,
            type: "radio",
            title: "Do you have a work email?",
            options: [
              "Yes",
              "No"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733738924645",
            key: null,
            type: "short",
            title: "Enter your work email:",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: {
                type: "equals",
                value: "Yes",
                questionId: "1733738698556"
              },
              required_if: {
                type: "equals",
                value: "Yes",
                questionId: "1733738698556"
              }
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739144609",
            key: null,
            type: "short",
            title: "Enter work place address:",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: {
                type: "equals",
                value: "No",
                questionId: "1733738698556"
              },
              required_if: {
                type: "equals",
                value: "No",
                questionId: "1733738698556"
              }
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739295121",
            key: null,
            type: "short",
            title: "Work Position",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          }
        ],
        description: null,
        isCollapsed: true,
        nextSection: "4"
      },
      {
        id: "3",
        title: "Self-employed Information",
        questions: [
          {
            id: "1732618689259",
            key: null,
            type: "short",
            title: "Business Name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: true,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739470686",
            key: null,
            type: "short",
            title: "Business Address",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739481792",
            key: null,
            type: "short",
            title: "Linkedin URL",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739490216",
            key: null,
            type: "short",
            title: "Other Sociam Media URL",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          }
        ],
        description: null,
        isCollapsed: true,
        nextSection: "4"
      },
      {
        id: "4",
        title: "Referee Info",
        questions: [
          {
            id: "1733739616032",
            key: null,
            type: "short",
            title: "Next of kin full name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739639424",
            key: null,
            type: "radio",
            title: "Next of kin relationship",
            options: [
              "Parent",
              "Sibling",
              "Friend",
              "Relative"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733739652360",
            key: null,
            type: "short",
            title: "What best describes your referee?",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740086726",
            key: null,
            type: "short",
            title: "Referee Work Email",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740099865",
            key: null,
            type: "short",
            title: "Referee Phone Number",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          }
        ],
        description: null,
        isCollapsed: true,
        nextSection: null
      },
      {
        id: "5",
        title: "Financial Info",
        questions: [
          {
            id: "1733740210859",
            key: null,
            type: "radio",
            title: "Bank Name",
            options: [
              "First Bank",
              "GTB",
              "Zenith Bank",
              "Kuda Bank",
              "Moniepoint MFB"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740264846",
            key: null,
            type: "short",
            title: "Account Number (Preferably salary account)",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740296850",
            key: null,
            type: "short",
            title: "Account Name",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740304822",
            key: null,
            type: "radio",
            title: "Account Type",
            options: [
              "Current",
              "Savings"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733741303464",
            key: null,
            type: "file",
            title: "Upload Bank Statement",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733740397601",
            key: null,
            type: "radio",
            title: "Is Bank Statement passworded?",
            options: [
              "Yes",
              "No"
            ],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: null,
              required_if: null
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          },
          {
            id: "1733741328491",
            key: null,
            type: "short",
            title: "Enter Bank Statement Password",
            options: [],
            visible: true,
            disabled: false,
            readonly: false,
            required: false,
            conditions: {
              visible_if: {
                type: "equals",
                value: "Yes",
                questionId: "1733740397601"
              },
              required_if: {
                type: "equals",
                value: "Yes",
                questionId: "1733740397601"
              }
            },
            description: null,
            placeholder: null,
            sectionNavigation: {
              rules: [],
              enabled: false
            }
          }
        ],
        description: null,
        isCollapsed: true,
        nextSection: "submit"
      }
    ],
  },
}
