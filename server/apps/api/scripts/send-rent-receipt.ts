import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { ReceiptService, ReceiptPdfData } from '../src/shared/infrastructure/common/receipt/receipt.service'
import { S3Service } from '../src/shared/infrastructure/common/s3/s3.service'
import { buildRentReceiptEmailHtml } from '../src/shared/infrastructure/email/email.helper'
import { COMMUNICATION_TEMPLATES } from '../src/shared/infrastructure/communication/communication-templates'

// 1. Load environment variables
const envPath = path.join(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8')
  envRaw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const idx = trimmed.indexOf('=')
    if (idx === -1) return
    const key = trimmed.slice(0, idx)
    let val = trimmed.slice(idx + 1)
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    process.env[key] = val
  })
}

const prisma = new PrismaClient()

function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return ''
  if (!encryptedText.includes(':')) return encryptedText
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) return encryptedText
    const [ivHex, authTagHex, encrypted] = parts
    const hexKey = process.env.ENCRYPTION_KEY || '4a8fb008ac99a75788a473c7029bdf5b5b2a198c8dbc873b3efa637d08abfca8'
    const key = Buffer.from(hexKey, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let dec = decipher.update(encrypted, 'hex', 'utf8')
    dec += decipher.final('utf8')
    return dec
  } catch (e) {
    return encryptedText
  }
}

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

async function main() {
  const args = process.argv.slice(2)
  
  let searchEmail = 'joke4321@hotmail.com'
  let recipientEmail: string | undefined = undefined

  for (const arg of args) {
    if (arg.startsWith('--search=')) {
      searchEmail = arg.split('=')[1]!.trim()
    } else if (arg.startsWith('--to=')) {
      recipientEmail = arg.split('=')[1]!.trim()
    } else if (!arg.startsWith('--')) {
      if (!recipientEmail && arg.includes('@')) {
        if (arg.toLowerCase().includes('joke')) {
          searchEmail = arg.trim()
        } else {
          recipientEmail = arg.trim()
        }
      }
    }
  }

  const finalRecipient = recipientEmail || searchEmail

  console.log('====================================================')
  console.log(`===    RENT RECEIPT EMAIL DISPATCH SCRIPT       ===`)
  console.log('====================================================')
  console.log(`Search Account  : "${searchEmail}"`)
  console.log(`Send Receipt To : "${finalRecipient}"\n`)

  const emailHash = hashEmail(searchEmail)

  // 1. Locate User by email or hash
  let user = await prisma.upward_user.findFirst({
    where: {
      OR: [
        { emailHash },
        { email: searchEmail.toLowerCase().trim() }
      ]
    },
    include: {
      properties: {
        include: {
          location: true,
          company: true,
          manager: true,
          pm: {
            include: {
              emailSetting: true,
              receiptSetting: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    console.log(`Searching decrypted emails for "${searchEmail}"...`)
    const allUsers = await prisma.upward_user.findMany({
      include: {
        properties: {
          include: {
            location: true,
            company: true,
            manager: true,
            pm: {
              include: {
                emailSetting: true,
                receiptSetting: true
              }
            }
          }
        }
      }
    })
    for (const u of allUsers) {
      if (u.email && u.email.includes(':')) {
        const dec = decrypt(u.email)
        if (dec.toLowerCase().trim() === searchEmail.toLowerCase().trim()) {
          user = u
          break
        }
      }
    }
  }

  if (!user) {
    console.error(`❌ User "${searchEmail}" not found in database. Exiting.`)
    process.exit(1)
  }

  const decryptedEmail = decrypt(user.email)
  const decryptedFirstName = decrypt(user.firstName)
  const decryptedLastName = decrypt(user.lastName)
  const tenantName = `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Tenant'
  console.log(`Found User ID ${user.id} (${tenantName} <${decryptedEmail}>)`)

  // 2. Find latest successful transaction for user
  const tx = await prisma.upward_transaction.findFirst({
    where: {
      userId: user.id,
      status: 'SUCCESS',
    },
    include: {
      paymentRequest: true,
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!tx) {
    console.error(`❌ No successful transactions found for user ${user.id}.`)
    process.exit(1)
  }

  console.log(`Found Transaction ID ${tx.id} (Ref: ${tx.reference}, Amount: ${tx.currency} ${tx.amount.toLocaleString()})`)

  // 3. Resolve Property & Branding
  const property = user.properties[0]
  const loc = property?.location

  let rawAddr = tx.propertyAddress
  if (!rawAddr && loc) {
    rawAddr = [loc.address || loc.area, loc.state, loc.country].filter(Boolean).join(', ')
  }
  if (!rawAddr) rawAddr = 'Your Property'

  // Clean and deduplicate words/segments (e.g. "Lekky County Homes, ikota Lagos, Nigeria, lagos, nigeria")
  const segments = rawAddr.split(',').map(s => s.trim()).filter(Boolean)
  const cleanedSegments: string[] = []
  for (const seg of segments) {
    const isDuplicate = cleanedSegments.some(existing => 
      existing.toLowerCase().includes(seg.toLowerCase()) || 
      seg.toLowerCase().includes(existing.toLowerCase())
    )
    if (!isDuplicate) {
      cleanedSegments.push(seg)
    }
  }
  const propertyAddress = cleanedSegments.join(', ') || rawAddr
  console.log(`Cleaned Property Address: "${propertyAddress}"`)

  let companyName = 'Upward'
  let logoUrl: string | undefined = undefined
  let themeColor = '#d97757'
  let managerName: string | undefined = undefined

  if (property?.pm) {
    if (property.pm.businessName) {
      const dec = decrypt(property.pm.businessName)
      if (dec && dec !== 'account_name' && !dec.includes(':')) companyName = dec
    }
    logoUrl = property.pm.receiptSetting?.useEmailLogo === false 
      ? property.pm.receiptSetting?.logoUrl 
      : property.pm.emailSetting?.logoUrl
    themeColor = property.pm.receiptSetting?.themeColor || themeColor
  } else if (property?.company?.name && property.company.name !== 'account_name') {
    const decComp = decrypt(property.company.name)
    if (decComp && !decComp.includes(':')) companyName = decComp
    logoUrl = property.company.logoUrl || undefined
  }

  if (property?.manager) {
    const f = decrypt(property.manager.firstName)
    const l = decrypt(property.manager.lastName)
    if (f !== 'account_name' && l !== 'account_name' && !f.includes(':') && !l.includes(':')) {
      managerName = `${f} ${l}`.trim()
    }
  }

  // If companyName still looks like raw encrypted text or is undefined, fallback to Upward
  if (!companyName || companyName.includes(':')) {
    companyName = 'Upward'
  }

  // 4. Extract Line Items
  let lineItems: Array<{ label: string; amount: number }> = []
  if (tx.lineItems && Array.isArray(tx.lineItems)) {
    lineItems = tx.lineItems
      .filter((i: any) => i.name && i.category !== 'Fee' && i.name !== 'Upward Benefits')
      .map((i: any) => ({ label: i.label || i.name, amount: Number(i.amount || 0) }))
  }
  if (lineItems.length === 0) {
    lineItems = [{ label: 'Rent', amount: tx.amount }]
  }

  const receiptNumber = `RCP-${tx.reference.slice(-5).toUpperCase()}`
  const formattedAmount = `${tx.currency || 'NGN'} ${tx.amount.toLocaleString()}`
  const channel = tx.isManual ? 'Bank Transfer' : 'Paystack'
  const rentStartDate = tx.paymentRequest?.rentStartDate
  const rentEndDate = tx.paymentRequest?.rentEndDate
  const tenancyPeriod = (rentStartDate && rentEndDate)
    ? `${new Date(rentStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(rentEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : undefined

  const paymentDateFormatted = new Date(tx.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  const receiptData: ReceiptPdfData = {
    title: 'Rent Payment Receipt',
    receiptNumber,
    paidAt: tx.createdAt,
    tenantName,
    landlordName: managerName,
    propertyAddress,
    propertyName: propertyAddress,
    paymentType: tx.paymentType || 'Rent Payment',
    amount: tx.amount,
    currency: tx.currency || 'NGN',
    reference: tx.reference,
    channel,
    type: 'RENT',
    status: tx.paymentRequest?.status === 'PARTIAL' ? 'PARTIAL' : 'PAID',
    lineItems,
    brandName: companyName,
    logoUrl,
    themeColor,
    tenancyPeriod,
  }

  console.log(`\nGenerating PDF receipt for ${receiptNumber}...`)
  const s3Service = new S3Service(null as any)
  const receiptService = new ReceiptService(s3Service)
  const pdfBuffer = await receiptService.generateReceiptPdf(receiptData)
  const pdfFilename = `receipt-${receiptNumber.replace(/\//g, '-')}.pdf`
  console.log(`✅ Generated PDF (${pdfBuffer.length} bytes): ${pdfFilename}`)

  // 5. Build HTML Email
  const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()
  const receiptUrl = `${baseUrl}/dashboard/receipts?id=${tx.uuid}`

  const emailContext = {
    tenantName,
    firstName: decryptedFirstName,
    amount: formattedAmount,
    amountPaid: tx.amount,
    propertyAddress,
    receiptNumber,
    receiptUrl,
    paymentDate: paymentDateFormatted,
    companyName,
    logoUrl,
    tenancyPeriod,
    lineItems,
  }

  const htmlContent = buildRentReceiptEmailHtml(emailContext as any, 'CLAY')
  const subject = `Rent Payment Receipt - ${receiptNumber} (${propertyAddress})`

  // 6. Send via Mailgun
  console.log(`\nSending receipt email to "${finalRecipient}" via Mailgun...`)
  const mailgunKey = process.env.MAILGUN_API_KEY
  const mailgunDomain = process.env.MAILGUN_DOMAIN || 'mg.goodtenants.io'
  const emailFrom = process.env.EMAIL_FROM || `Upward by GoodTenants <hello@${mailgunDomain}>`

  if (!mailgunKey) {
    console.error('❌ MAILGUN_API_KEY is not configured in .env')
    process.exit(1)
  }

  const mailgun = new Mailgun(FormData)
  const mg = mailgun.client({ username: 'api', key: mailgunKey })

  const sendPayload: any = {
    from: emailFrom,
    to: [finalRecipient],
    subject,
    html: htmlContent,
    text: `Hi ${decryptedFirstName}, your payment of ${formattedAmount} for ${propertyAddress} has been received. Receipt #${receiptNumber} is attached. View digital receipt: ${receiptUrl}`,
    attachment: [
      {
        filename: pdfFilename,
        data: pdfBuffer,
      }
    ]
  }

  const res = await mg.messages.create(mailgunDomain, sendPayload)
  console.log('\n====================================================')
  console.log(`✅ SUCCESS: Rent receipt email with PDF attachment sent to "${finalRecipient}"!`)
  console.log(`Mailgun Response ID: ${res.id}`)
  console.log('====================================================')
}

main()
  .catch(err => {
    console.error('❌ Error executing receipt dispatch script:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
