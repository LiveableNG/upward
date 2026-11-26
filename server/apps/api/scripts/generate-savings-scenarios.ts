import * as path from 'path'
import ExcelJS from 'exceljs'

interface DepositEvent {
  day: number
  amountNgn: number
}

interface DailyRow {
  day: number
  month: number
  depositNgn: number
  coverageActive: boolean
  customerPrincipalNgn: number
  customerDailyYieldNgn: number
  customerCumulativeYieldNgn: number
  customerTotalBalanceNgn: number
  grossArmDailyYieldNgn: number
  grossArmCumulativeYieldNgn: number
  dailySpreadNgn: number
  cumulativeSpreadNgn: number
  premiumRecoveredTodayNgn: number
  unrecoveredPremiumNgn: number
  netPlatformMarginNgn: number
}

interface ScenarioConfig {
  name: string
  sheetName: string
  productOption: 'SAVE_AND_EARN' | 'RENT_PROTEC'
  targetRentNgn: number
  totalDays: number
  customerAnnualRatePct: number
  grossArmAnnualRatePct: number
  upfrontPremiumPct: number
  deposits: DepositEvent[]
  earlyExitDay?: number
}

function getActivationThresholdPct(totalDays: number): number {
  return totalDays >= 210 ? 20 : 25
}

function simulateScenario(cfg: ScenarioConfig) {
  const depositsByDay = new Map<number, number>()
  for (const d of cfg.deposits) {
    depositsByDay.set(d.day, (depositsByDay.get(d.day) || 0) + d.amountNgn)
  }

  const activationPct =
    cfg.productOption === 'RENT_PROTEC' ? getActivationThresholdPct(cfg.totalDays) : 0
  const activationThresholdNgn = (cfg.targetRentNgn * activationPct) / 100
  const fullPremiumNgn =
    cfg.productOption === 'RENT_PROTEC'
      ? Number(((cfg.targetRentNgn * cfg.upfrontPremiumPct) / 100).toFixed(2))
      : 0

  let principal = 0
  let custYield = 0
  let grossArmYield = 0
  let cumSpread = 0
  let coverageActivated = false
  let activationDay: number | null = null
  let upfrontPremiumBooked = 0
  let unrecoveredPremium = 0
  let netMargin = 0
  let breakevenDay: number | null = cfg.productOption === 'SAVE_AND_EARN' ? 0 : null

  const custDailyRate = cfg.customerAnnualRatePct / 100 / 365
  const armDailyRate = cfg.grossArmAnnualRatePct / 100 / 365

  const rows: DailyRow[] = []
  const effectiveDays = cfg.earlyExitDay ? Math.min(cfg.earlyExitDay, cfg.totalDays) : cfg.totalDays

  for (let day = 1; day <= effectiveDays; day++) {
    const dep = depositsByDay.get(day) || 0
    principal += dep

    // Safe 20% / 25% activation guardrail: only bind coverage & book 2% insurer premium once funded >= threshold
    if (
      cfg.productOption === 'RENT_PROTEC' &&
      !coverageActivated &&
      principal >= activationThresholdNgn
    ) {
      coverageActivated = true
      activationDay = day
      upfrontPremiumBooked = fullPremiumNgn
      const offsetFromPriorSpread = Math.min(upfrontPremiumBooked, netMargin)
      netMargin -= offsetFromPriorSpread
      unrecoveredPremium = upfrontPremiumBooked - offsetFromPriorSpread
    }

    const balanceBeforeYield = principal + custYield
    const dailyCustYield = balanceBeforeYield > 0 ? balanceBeforeYield * custDailyRate : 0
    const dailyArmYield = balanceBeforeYield > 0 ? balanceBeforeYield * armDailyRate : 0
    const dailySpread = Math.max(0, dailyArmYield - dailyCustYield)

    custYield += dailyCustYield
    grossArmYield += dailyArmYield
    cumSpread += dailySpread

    const recoveredToday =
      unrecoveredPremium > 0 ? Math.min(unrecoveredPremium, dailySpread) : 0
    unrecoveredPremium = Math.max(0, unrecoveredPremium - recoveredToday)
    const marginToday = dailySpread - recoveredToday
    netMargin += marginToday

    if (coverageActivated && breakevenDay === null && unrecoveredPremium <= 0.01) {
      breakevenDay = day
    }

    rows.push({
      day,
      month: Math.ceil(day / 30),
      depositNgn: dep,
      coverageActive: coverageActivated,
      customerPrincipalNgn: principal,
      customerDailyYieldNgn: dailyCustYield,
      customerCumulativeYieldNgn: custYield,
      customerTotalBalanceNgn: principal + custYield,
      grossArmDailyYieldNgn: dailyArmYield,
      grossArmCumulativeYieldNgn: grossArmYield,
      dailySpreadNgn: dailySpread,
      cumulativeSpreadNgn: cumSpread,
      premiumRecoveredTodayNgn: recoveredToday,
      unrecoveredPremiumNgn: unrecoveredPremium,
      netPlatformMarginNgn: netMargin,
    })
  }

  let settlementRecoveryNgn = 0
  let finalPayoutNgn = principal + custYield

  if (cfg.earlyExitDay) {
    const fairExitBaseYield = principal * 0.07 * (effectiveDays / 365)
    const adminFee = principal * 0.015
    const basePayout = Math.max(0, principal + fairExitBaseYield - adminFee)
    settlementRecoveryNgn = Math.min(basePayout, unrecoveredPremium)
    unrecoveredPremium = Math.max(0, unrecoveredPremium - settlementRecoveryNgn)
    finalPayoutNgn = Math.max(0, basePayout - settlementRecoveryNgn)
  } else if (cfg.productOption === 'RENT_PROTEC' && unrecoveredPremium > 0) {
    // Under-funded maturity guardrail: recover any remaining unrecovered premium at settlement
    settlementRecoveryNgn = Math.min(finalPayoutNgn, unrecoveredPremium)
    unrecoveredPremium = Math.max(0, unrecoveredPremium - settlementRecoveryNgn)
    finalPayoutNgn = Math.max(0, finalPayoutNgn - settlementRecoveryNgn)
  }

  return {
    config: cfg,
    activationPct,
    coverageActivated,
    activationDay,
    upfrontPremiumBooked,
    finalPrincipalNgn: principal,
    finalCustomerYieldNgn: custYield,
    finalCustomerBalanceNgn: principal + custYield,
    finalGrossArmYieldNgn: grossArmYield,
    finalSpreadNgn: cumSpread,
    settlementRecoveryNgn,
    finalUnrecoveredPremiumNgn: unrecoveredPremium,
    finalNetMarginNgn: netMargin,
    breakevenDay,
    finalPayoutNgn,
    rows,
  }
}

async function main() {
  const targetRent = 2_000_000 // NGN 2,000,000 annual rent

  // 10-month Rent Protec: 20% Day 1 (₦400k) + 9 monthly deposits of ₦166,000
  const rentProtec10Mo: DepositEvent[] = [
    { day: 1, amountNgn: 400_000 },
    ...Array.from({ length: 9 }, (_, i) => ({ day: (i + 1) * 30 + 1, amountNgn: 166_000 })),
  ]

  // 6-month Rent Protec: 25% Day 1 (₦500k) + 5 monthly deposits of ₦285,000
  const rentProtec6Mo: DepositEvent[] = [
    { day: 1, amountNgn: 500_000 },
    ...Array.from({ length: 5 }, (_, i) => ({ day: (i + 1) * 30 + 1, amountNgn: 285_000 })),
  ]

  // Save & Earn 10-month equal monthly
  const saveAndEarn10Mo: DepositEvent[] = Array.from({ length: 10 }, (_, idx) => ({
    day: idx * 30 + 1,
    amountNgn: 185_000,
  }))

  const scenarios: ScenarioConfig[] = [
    {
      name: '1. Save & Earn (16% vs 16.55% ARM, 10 Months)',
      sheetName: 'S1_SaveAndEarn_10Mo',
      productOption: 'SAVE_AND_EARN',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 16.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 0,
      deposits: saveAndEarn10Mo,
    },
    {
      name: '2. Rent Protec 10Mo (20% Day 1 Activation, Maturity)',
      sheetName: 'S2_RentProtec_10Mo_20pct',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: rentProtec10Mo,
    },
    {
      name: '3. Rent Protec 6Mo (25% Day 1 Activation, Maturity)',
      sheetName: 'S3_RentProtec_6Mo_25pct',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 180,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: rentProtec6Mo,
    },
    {
      name: '4. Rent Protec Early Exit @ Day 90 (3 Months)',
      sheetName: 'S4_EarlyExit_Day90',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: rentProtec10Mo,
      earlyExitDay: 90,
    },
    {
      name: '5. Rent Protec Early Exit @ Day 180 (6 Months)',
      sheetName: 'S5_EarlyExit_Day180',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: rentProtec10Mo,
      earlyExitDay: 180,
    },
    {
      name: '6. Rent Protec Under-Funded (20% Day 1, Then Stops)',
      sheetName: 'S6_UnderFunded_Maturity',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: [{ day: 1, amountNgn: 400_000 }],
    },
    {
      name: '7. Rent Protec Ghost (<20% Funded — Unbound Guardrail)',
      sheetName: 'S7_Ghost_Under20pct',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: [{ day: 1, amountNgn: 100_000 }],
    },
  ]

  const results = scenarios.map(simulateScenario)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Upward Savings Economics Engine'
  wb.created = new Date()

  const summarySheet = wb.addWorksheet('Executive_Summary')
  summarySheet.columns = [
    { header: 'Scenario', key: 'name', width: 46 },
    { header: 'Product', key: 'product', width: 14 },
    { header: 'Activation Min', key: 'actMin', width: 15 },
    { header: 'Coverage Bound', key: 'bound', width: 15 },
    { header: 'Deposited (NGN)', key: 'deposited', width: 18 },
    { header: 'Cust Yield (NGN)', key: 'custYield', width: 18 },
    { header: 'Gross ARM (NGN)', key: 'armYield', width: 18 },
    { header: 'Spread (NGN)', key: 'spread', width: 16 },
    { header: '2% Prem Booked (NGN)', key: 'premium', width: 20 },
    { header: 'Exit/Mat Offset (NGN)', key: 'offset', width: 20 },
    { header: 'Upward Loss (NGN)', key: 'loss', width: 18 },
    { header: 'Breakeven Day', key: 'breakeven', width: 15 },
    { header: 'Net Upward Margin (NGN)', key: 'margin', width: 22 },
    { header: 'Final Payout (NGN)', key: 'payout', width: 18 },
  ]
  summarySheet.getRow(1).font = { bold: true }

  for (const r of results) {
    summarySheet.addRow({
      name: r.config.name,
      product: r.config.productOption,
      actMin: r.activationPct > 0 ? `${r.activationPct}%` : 'N/A',
      bound: r.coverageActivated ? `Day ${r.activationDay}` : 'Unbound (₦0 risk)',
      deposited: Number(r.finalPrincipalNgn.toFixed(2)),
      custYield: Number(r.finalCustomerYieldNgn.toFixed(2)),
      armYield: Number(r.finalGrossArmYieldNgn.toFixed(2)),
      spread: Number(r.finalSpreadNgn.toFixed(2)),
      premium: Number(r.upfrontPremiumBooked.toFixed(2)),
      offset: Number(r.settlementRecoveryNgn.toFixed(2)),
      loss: Number(r.finalUnrecoveredPremiumNgn.toFixed(2)),
      breakeven:
        r.breakevenDay !== null
          ? `Day ${r.breakevenDay}`
          : r.coverageActivated
            ? 'Offset at Exit/Mat'
            : 'N/A',
      margin: Number(r.finalNetMarginNgn.toFixed(2)),
      payout: Number(r.finalPayoutNgn.toFixed(2)),
    })
  }

  for (const r of results) {
    const ws = wb.addWorksheet(r.config.sheetName)
    ws.columns = [
      { header: 'Day', key: 'day', width: 8 },
      { header: 'Month', key: 'month', width: 8 },
      { header: 'Deposit (NGN)', key: 'deposit', width: 15 },
      { header: 'Coverage', key: 'cov', width: 12 },
      { header: 'Cust Principal', key: 'principal', width: 18 },
      { header: 'Cust Cum Yield', key: 'custCum', width: 18 },
      { header: 'Gross ARM Cum', key: 'armCum', width: 18 },
      { header: 'Daily Spread', key: 'spread', width: 15 },
      { header: 'Prem Recovered', key: 'recToday', width: 18 },
      { header: 'Unrecovered Prem', key: 'unrec', width: 18 },
      { header: 'Net Upward Margin', key: 'margin', width: 18 },
    ]
    ws.getRow(1).font = { bold: true }

    for (const row of r.rows) {
      ws.addRow({
        day: row.day,
        month: row.month,
        deposit: Number(row.depositNgn.toFixed(2)),
        cov: row.coverageActive ? 'ACTIVE' : 'PENDING',
        principal: Number(row.customerPrincipalNgn.toFixed(2)),
        custCum: Number(row.customerCumulativeYieldNgn.toFixed(2)),
        armCum: Number(row.grossArmCumulativeYieldNgn.toFixed(2)),
        spread: Number(row.dailySpreadNgn.toFixed(2)),
        recToday: Number(row.premiumRecoveredTodayNgn.toFixed(2)),
        unrec: Number(row.unrecoveredPremiumNgn.toFixed(2)),
        margin: Number(row.netPlatformMarginNgn.toFixed(2)),
      })
    }
  }

  const outPath = path.resolve(__dirname, '../../../../docs/rent_protec_scenarios.xlsx')
  await wb.xlsx.writeFile(outPath)
  console.log(`Generated updated 7-scenario workbook at: ${outPath}`)
  for (const r of results) {
    console.log(
      `- ${r.config.name}: Bound=${r.coverageActivated ? 'Day ' + r.activationDay : 'NO'}, Spread=₦${Math.round(r.finalSpreadNgn).toLocaleString()}, PremBooked=₦${Math.round(r.upfrontPremiumBooked).toLocaleString()}, Offset=₦${Math.round(r.settlementRecoveryNgn).toLocaleString()}, UpwardLoss=₦${Math.round(r.finalUnrecoveredPremiumNgn).toLocaleString()}, NetMargin=₦${Math.round(r.finalNetMarginNgn).toLocaleString()}`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
