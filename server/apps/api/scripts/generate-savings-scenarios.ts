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

function simulateScenario(cfg: ScenarioConfig) {
  const depositsByDay = new Map<number, number>()
  for (const d of cfg.deposits) {
    depositsByDay.set(d.day, (depositsByDay.get(d.day) || 0) + d.amountNgn)
  }

  const upfrontPremiumNgn =
    cfg.productOption === 'RENT_PROTEC'
      ? Number(((cfg.targetRentNgn * cfg.upfrontPremiumPct) / 100).toFixed(2))
      : 0

  let principal = 0
  let custYield = 0
  let grossArmYield = 0
  let cumSpread = 0
  let unrecoveredPremium = upfrontPremiumNgn
  let netMargin = 0
  let breakevenDay: number | null = upfrontPremiumNgn === 0 ? 0 : null

  const custDailyRate = cfg.customerAnnualRatePct / 100 / 365
  const armDailyRate = cfg.grossArmAnnualRatePct / 100 / 365

  const rows: DailyRow[] = []
  const effectiveDays = cfg.earlyExitDay ? Math.min(cfg.earlyExitDay, cfg.totalDays) : cfg.totalDays

  for (let day = 1; day <= effectiveDays; day++) {
    const dep = depositsByDay.get(day) || 0
    principal += dep

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

    if (breakevenDay === null && unrecoveredPremium <= 0.01) {
      breakevenDay = day
    }

    rows.push({
      day,
      month: Math.ceil(day / 30),
      depositNgn: dep,
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

  let earlyExitSummary: {
    daysHeld: number
    fairExitBaseYieldNgn: number
    adminFeeNgn: number
    unrecoveredPremiumRecoveredNgn: number
    finalCustomerPayoutNgn: number
  } | null = null

  if (cfg.earlyExitDay) {
    const fairExitBaseYield = principal * 0.07 * (effectiveDays / 365)
    const adminFee = principal * 0.015
    const basePayout = Math.max(0, principal + fairExitBaseYield - adminFee)
    const premiumRecoveredOnExit = Math.min(basePayout, unrecoveredPremium)
    const finalCustomerPayout = Math.max(0, basePayout - premiumRecoveredOnExit)

    earlyExitSummary = {
      daysHeld: effectiveDays,
      fairExitBaseYieldNgn: fairExitBaseYield,
      adminFeeNgn: adminFee,
      unrecoveredPremiumRecoveredNgn: premiumRecoveredOnExit,
      finalCustomerPayoutNgn: finalCustomerPayout,
    }
  }

  return {
    config: cfg,
    upfrontPremiumNgn,
    finalPrincipalNgn: principal,
    finalCustomerYieldNgn: custYield,
    finalCustomerBalanceNgn: principal + custYield,
    finalGrossArmYieldNgn: grossArmYield,
    finalSpreadNgn: cumSpread,
    finalUnrecoveredPremiumNgn: unrecoveredPremium,
    finalNetMarginNgn: netMargin,
    breakevenDay,
    earlyExitSummary,
    rows,
  }
}

async function main() {
  const targetRent = 2_000_000 // NGN 2,000,000 annual rent
  const monthlyEqual: DepositEvent[] = Array.from({ length: 10 }, (_, idx) => ({
    day: idx * 30 + 1,
    amountNgn: 185_000,
  }))
  const frontLoaded: DepositEvent[] = [
    { day: 1, amountNgn: 700_000 },
    { day: 31, amountNgn: 200_000 },
    { day: 61, amountNgn: 200_000 },
    { day: 91, amountNgn: 150_000 },
    { day: 121, amountNgn: 150_000 },
    { day: 151, amountNgn: 150_000 },
    { day: 181, amountNgn: 150_000 },
    { day: 211, amountNgn: 150_000 },
  ]

  const scenarios: ScenarioConfig[] = [
    {
      name: '1. Save & Earn (16% vs 16.55% ARM, 10 Months)',
      sheetName: 'S1_Save_And_Earn',
      productOption: 'SAVE_AND_EARN',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 16.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 0,
      deposits: monthlyEqual,
    },
    {
      name: '2. Rent Protec (10% vs 16.55% ARM, 10 Months)',
      sheetName: 'S2_RentProtec_Monthly',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: monthlyEqual,
    },
    {
      name: '3. Rent Protec (Front-Loaded Flexible Deposits)',
      sheetName: 'S3_RentProtec_FrontLoad',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: frontLoaded,
    },
    {
      name: '4a. Rent Protec Early Exit (Month 2 / Day 60)',
      sheetName: 'S4a_EarlyExit_M2',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: monthlyEqual,
      earlyExitDay: 60,
    },
    {
      name: '4b. Rent Protec Early Exit (Month 5 / Day 150)',
      sheetName: 'S4b_EarlyExit_M5',
      productOption: 'RENT_PROTEC',
      targetRentNgn: targetRent,
      totalDays: 300,
      customerAnnualRatePct: 10.0,
      grossArmAnnualRatePct: 16.55,
      upfrontPremiumPct: 2.0,
      deposits: monthlyEqual,
      earlyExitDay: 150,
    },
  ]

  const results = scenarios.map(simulateScenario)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Upward Savings Economics Engine'
  wb.created = new Date()

  // Executive Summary Sheet
  const summarySheet = wb.addWorksheet('Executive_Summary')
  summarySheet.columns = [
    { header: 'Scenario', key: 'name', width: 42 },
    { header: 'Product', key: 'product', width: 16 },
    { header: 'Cust Rate (%)', key: 'custRate', width: 14 },
    { header: 'ARM Rate (%)', key: 'armRate', width: 14 },
    { header: 'Total Deposited (NGN)', key: 'deposited', width: 22 },
    { header: 'Cust Yield (NGN)', key: 'custYield', width: 20 },
    { header: 'Cust Final Value (NGN)', key: 'custValue', width: 22 },
    { header: 'Gross ARM Yield (NGN)', key: 'armYield', width: 22 },
    { header: 'Yield Spread (NGN)', key: 'spread', width: 20 },
    { header: 'Upfront 2% Premium (NGN)', key: 'premium', width: 24 },
    { header: 'Unrecovered Premium (NGN)', key: 'unrecovered', width: 24 },
    { header: 'Breakeven Day', key: 'breakeven', width: 15 },
    { header: 'Net Upward Margin (NGN)', key: 'margin', width: 22 },
    { header: 'Early Exit Payout (NGN)', key: 'exitPayout', width: 22 },
  ]

  summarySheet.getRow(1).font = { bold: true }

  for (const r of results) {
    summarySheet.addRow({
      name: r.config.name,
      product: r.config.productOption,
      custRate: r.config.customerAnnualRatePct,
      armRate: r.config.grossArmAnnualRatePct,
      deposited: Number(r.finalPrincipalNgn.toFixed(2)),
      custYield: Number(r.finalCustomerYieldNgn.toFixed(2)),
      custValue: Number(r.finalCustomerBalanceNgn.toFixed(2)),
      armYield: Number(r.finalGrossArmYieldNgn.toFixed(2)),
      spread: Number(r.finalSpreadNgn.toFixed(2)),
      premium: Number(r.upfrontPremiumNgn.toFixed(2)),
      unrecovered: Number(r.finalUnrecoveredPremiumNgn.toFixed(2)),
      breakeven: r.breakevenDay !== null ? `Day ${r.breakevenDay}` : 'Not Reached',
      margin: Number(r.finalNetMarginNgn.toFixed(2)),
      exitPayout: r.earlyExitSummary
        ? Number(r.earlyExitSummary.finalCustomerPayoutNgn.toFixed(2))
        : 'N/A (Maturity)',
    })
  }

  // Monthly Rollup + Daily Detail Sheets per Scenario
  for (const r of results) {
    const ws = wb.addWorksheet(r.config.sheetName)
    ws.columns = [
      { header: 'Day', key: 'day', width: 8 },
      { header: 'Month', key: 'month', width: 8 },
      { header: 'Deposit (NGN)', key: 'deposit', width: 16 },
      { header: 'Cust Principal (NGN)', key: 'principal', width: 20 },
      { header: 'Cust Daily Yield (NGN)', key: 'custDaily', width: 20 },
      { header: 'Cust Cum Yield (NGN)', key: 'custCum', width: 20 },
      { header: 'Cust Liability Balance (NGN)', key: 'custBal', width: 24 },
      { header: 'Gross ARM Daily (NGN)', key: 'armDaily', width: 20 },
      { header: 'Gross ARM Cum (NGN)', key: 'armCum', width: 20 },
      { header: 'Daily Spread (NGN)', key: 'spread', width: 18 },
      { header: 'Prem Recovery Today (NGN)', key: 'recToday', width: 24 },
      { header: 'Unrecovered Premium (NGN)', key: 'unrec', width: 24 },
      { header: 'Net Upward Margin (NGN)', key: 'margin', width: 22 },
    ]
    ws.getRow(1).font = { bold: true }

    for (const row of r.rows) {
      ws.addRow({
        day: row.day,
        month: row.month,
        deposit: Number(row.depositNgn.toFixed(2)),
        principal: Number(row.customerPrincipalNgn.toFixed(2)),
        custDaily: Number(row.customerDailyYieldNgn.toFixed(2)),
        custCum: Number(row.customerCumulativeYieldNgn.toFixed(2)),
        custBal: Number(row.customerTotalBalanceNgn.toFixed(2)),
        armDaily: Number(row.grossArmDailyYieldNgn.toFixed(2)),
        armCum: Number(row.grossArmCumulativeYieldNgn.toFixed(2)),
        spread: Number(row.dailySpreadNgn.toFixed(2)),
        recToday: Number(row.premiumRecoveredTodayNgn.toFixed(2)),
        unrec: Number(row.unrecoveredPremiumNgn.toFixed(2)),
        margin: Number(row.netPlatformMarginNgn.toFixed(2)),
      })
    }

    if (r.earlyExitSummary) {
      ws.addRow({})
      ws.addRow({
        day: 'EXIT',
        deposit: 'Fair Exit Summary',
        principal: Number(r.finalPrincipalNgn.toFixed(2)),
        custDaily: Number(r.earlyExitSummary.fairExitBaseYieldNgn.toFixed(2)),
        custCum: Number(r.earlyExitSummary.adminFeeNgn.toFixed(2)),
        custBal: Number(r.earlyExitSummary.finalCustomerPayoutNgn.toFixed(2)),
        recToday: Number(r.earlyExitSummary.unrecoveredPremiumRecoveredNgn.toFixed(2)),
      })
    }
  }

  const outPath = path.resolve(__dirname, '../../../../docs/rent_protec_scenarios.xlsx')
  await wb.xlsx.writeFile(outPath)
  console.log(`Generated multi-scenario workbook at: ${outPath}`)
  for (const r of results) {
    console.log(
      `- ${r.config.name}: Deposited=₦${r.finalPrincipalNgn.toLocaleString()}, CustYield=₦${Math.round(r.finalCustomerYieldNgn).toLocaleString()}, ArmYield=₦${Math.round(r.finalGrossArmYieldNgn).toLocaleString()}, Spread=₦${Math.round(r.finalSpreadNgn).toLocaleString()}, UnrecoveredPrem=₦${Math.round(r.finalUnrecoveredPremiumNgn).toLocaleString()}, NetMargin=₦${Math.round(r.finalNetMarginNgn).toLocaleString()}`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
