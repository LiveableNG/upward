import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== Starting Database-Wide Tenancy Date Audit & Repair ===\n')

  const units = await prisma.upward_pm_unit.findMany({
    where: {
      tenantId: { not: null },
    },
    include: {
      tenant: true,
    },
  })

  console.log(`Found ${units.length} unit(s) with assigned tenants. Inspecting...\n`)

  let inspectedCount = 0
  let inconsistentCount = 0
  let fixedCount = 0

  for (const unit of units) {
    inspectedCount++
    if (!unit.tenantId) continue

    const tenantPayments = await prisma.upward_pm_rent_payment.findMany({
      where: {
        unitId: unit.id,
        tenantId: unit.tenantId,
        status: 'SUCCESS',
      },
    })

    if (tenantPayments.length === 0) continue

    const periodMap = new Map<string, { periodStart: Date; periodEnd: Date; total: number }>()
    for (const p of tenantPayments) {
      if (!p.periodStart) continue
      const key = new Date(p.periodStart).toISOString().split('T')[0]!
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          periodStart: new Date(p.periodStart),
          periodEnd: p.periodEnd ? new Date(p.periodEnd) : new Date(p.periodStart),
          total: 0,
        })
      }
      periodMap.get(key)!.total += p.amount
    }

    const sortedPeriods = Array.from(periodMap.values()).sort(
      (a, b) => a.periodStart.getTime() - b.periodStart.getTime()
    )

    const fullyPaidPeriods = sortedPeriods.filter((p) => p.total >= (unit.rentAmount || 0))

    if (fullyPaidPeriods.length === 0) continue

    const latestFullyPaid = fullyPaidPeriods[fullyPaidPeriods.length - 1]!

    // Check if unit dates match latestFullyPaid
    const unitStartMatch =
      unit.rentStartDate &&
      new Date(unit.rentStartDate).toISOString().split('T')[0] ===
        latestFullyPaid.periodStart.toISOString().split('T')[0]
    const unitEndMatch =
      unit.rentDueDate &&
      new Date(unit.rentDueDate).toISOString().split('T')[0] ===
        latestFullyPaid.periodEnd.toISOString().split('T')[0]

    // Check userProperty if linked
    let userProperty = null
    if (unit.userPropertyUuid) {
      userProperty = await prisma.upward_user_property.findUnique({
        where: { uuid: unit.userPropertyUuid },
      })
    }

    const propStartMatch =
      userProperty?.rentStartDate &&
      new Date(userProperty.rentStartDate).toISOString().split('T')[0] ===
        latestFullyPaid.periodStart.toISOString().split('T')[0]
    const propEndMatch =
      userProperty?.rentEndDate &&
      new Date(userProperty.rentEndDate).toISOString().split('T')[0] ===
        latestFullyPaid.periodEnd.toISOString().split('T')[0]

    const isInconsistent =
      !unitStartMatch ||
      !unitEndMatch ||
      (userProperty && (!propStartMatch || !propEndMatch))

    if (isInconsistent) {
      inconsistentCount++
      console.log(`[INCONSISTENCY DETECTED] Unit #${unit.id} (${unit.unitName}):`)
      console.log(
        `  Current Unit Dates: ${unit.rentStartDate?.toISOString().split('T')[0]} to ${unit.rentDueDate?.toISOString().split('T')[0]}`
      )
      if (userProperty) {
        console.log(
          `  Current Property Dates: ${userProperty.rentStartDate?.toISOString().split('T')[0]} to ${userProperty.rentEndDate?.toISOString().split('T')[0]}`
        )
      }
      console.log(
        `  Expected (Latest Fully Paid): ${latestFullyPaid.periodStart.toISOString().split('T')[0]} to ${latestFullyPaid.periodEnd.toISOString().split('T')[0]}`
      )

      // Apply fix
      await prisma.upward_pm_unit.update({
        where: { id: unit.id },
        data: {
          rentStartDate: latestFullyPaid.periodStart,
          rentDueDate: latestFullyPaid.periodEnd,
        },
      })

      if (userProperty) {
        await prisma.upward_user_property.update({
          where: { id: userProperty.id },
          data: {
            rentStartDate: latestFullyPaid.periodStart,
            rentEndDate: latestFullyPaid.periodEnd,
            pmUnitId: unit.id,
          },
        })
      }

      fixedCount++
      console.log(`  -> Fixed successfully!\n`)
    }
  }

  console.log('=== Audit & Repair Summary ===')
  console.log(`Total Units Inspected: ${inspectedCount}`)
  console.log(`Inconsistencies Found: ${inconsistentCount}`)
  console.log(`Records Fixed: ${fixedCount}`)
}

main()
  .catch((e) => {
    console.error('Error running audit script:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
