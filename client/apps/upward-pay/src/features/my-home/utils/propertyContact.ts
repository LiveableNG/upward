type PropertyContactSource = {
  managerName?: string
  managerEmail?: string
  companyName?: string
  manager?: {
    firstName?: string
    lastName?: string
    email?: string
  }
  company?: {
    name?: string
    email?: string
  }
  pm?: {
    firstName?: string
    lastName?: string
    email?: string
    businessName?: string
  }
}

export function managerDisplayNameFromProperty(property: PropertyContactSource): string | undefined {
  const fromCompany = property.companyName?.trim() || property.company?.name?.trim()
  if (fromCompany) return fromCompany

  const fromManager =
    property.managerName?.trim() ||
    [property.manager?.firstName, property.manager?.lastName].filter(Boolean).join(' ').trim()
  if (fromManager) return fromManager

  const fromPm =
    [property.pm?.firstName, property.pm?.lastName].filter(Boolean).join(' ').trim() ||
    property.pm?.businessName?.trim()

  return fromPm || undefined
}

export function managerEmailFromProperty(property: PropertyContactSource): string | undefined {
  return (
    property.managerEmail?.trim() ||
    property.manager?.email?.trim() ||
    property.pm?.email?.trim() ||
    property.company?.email?.trim() ||
    undefined
  )
}
