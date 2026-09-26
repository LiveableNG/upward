import { Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from './payment.use-cases'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import * as crypto from 'crypto'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AddManualAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    accountNumber: string
    accountName: string
    bankName: string
    bankCode?: string
    userPropertyId?: number
    pmPropertyId?: number
  }) {
    if (!data.userPropertyId && !data.pmPropertyId) {
      throw new Error('Must provide either userPropertyId or pmPropertyId')
    }

    if (data.userPropertyId) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: data.userPropertyId },
        select: { id: true, manualAccountId: true }
      })
      if (!prop) throw new NotFoundException('User property not found')

      if ((prop as any)?.manualAccountId) {
        return this.prisma.upward_manual_account.update({
          where: { id: (prop as any).manualAccountId },
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
          }
        })
      } else {
        const account = await this.prisma.upward_manual_account.create({
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
          }
        })
        await (this.prisma as any).upward_user_property.update({
          where: { id: data.userPropertyId },
          data: { manualAccountId: account.id }
        })
        return account
      }
    }

    if (data.pmPropertyId) {
      const pmProp = await this.prisma.upward_pm_property.findUnique({
        where: { id: data.pmPropertyId },
        select: { id: true, manualAccountId: true, pmId: true } as any
      })
      if (!pmProp) throw new NotFoundException('PM property not found')

      if ((pmProp as any)?.manualAccountId) {
        return this.prisma.upward_manual_account.update({
          where: { id: (pmProp as any).manualAccountId },
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
          }
        })
      } else {
        const account = await this.prisma.upward_manual_account.create({
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
            pmId: (pmProp as any)?.pmId ?? null,
          }
        })
        await this.prisma.upward_pm_property.update({
          where: { id: data.pmPropertyId },
          data: { manualAccountId: account.id }
        })
        return account
      }
    }
  }
}

@Injectable()
export class UploadProofOfPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly s3Service: S3Service,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService
  ) {}

  async execute(data: {
    paymentRequestUuid?: string
    userPropertyUuid?: string
    amount?: number
    currency?: string
    lineItems?: any[]
    fileBuffer?: Buffer
    fileType?: string
    fileSize?: number
    fileName?: string
    senderName?: string
    paymentDate?: Date
    referenceNumber?: string
    uploadedByUserId?: number
    userUuid: string
  }) {
    if (!data.paymentRequestUuid && (!data.userPropertyUuid || !data.amount)) {
      throw new Error('Must provide either paymentRequestUuid or userPropertyUuid + amount')
    }

    let paymentRequestId: number | undefined
    let userPropertyId: number | undefined
    let uploadedByUserId = data.uploadedByUserId

    if (!uploadedByUserId && data.userUuid) {
      const uploader = await this.prisma.upward_user.findUnique({
        where: { uuid: String(data.userUuid) },
        select: { id: true },
      })
      uploadedByUserId = uploader?.id
    }

    if (data.paymentRequestUuid) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { uuid: data.paymentRequestUuid }
      })
      if (!pr) throw new NotFoundException('Payment request not found')
      paymentRequestId = pr.id
      if (!uploadedByUserId && pr.userId) {
        uploadedByUserId = pr.userId
      }
      if (!data.amount) {
        const remaining = Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0))
        data.amount = remaining > 0 ? remaining : (pr.amount || 0)
      }
      if (!data.currency) {
        data.currency = pr.currency || 'NGN'
      }
    } else if (data.userPropertyUuid) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { uuid: data.userPropertyUuid }
      })
      if (!prop) throw new NotFoundException('Property not found')
      userPropertyId = prop.id
      if (!uploadedByUserId && prop.userId) {
        uploadedByUserId = prop.userId
      }
    }

    let s3Key: string | undefined

    if (data.fileBuffer && data.fileType && data.fileName) {
      if (data.fileSize && data.fileSize > 10 * 1024 * 1024) {
        throw new Error(`File size exceeds limit of 10MB.`)
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(data.fileType)) {
        throw new Error('Only PDF, JPG, and PNG files are allowed')
      }

      const fileExtension = data.fileName.split('.').pop()
      const uuid = crypto.randomUUID()
      s3Key = `users/${data.userUuid}/payment-proofs/${uuid}.${fileExtension}`

      // Upload to S3 in the background or await it
      await this.s3Service.uploadBuffer(data.fileBuffer, s3Key, data.fileType)
        .catch((err) => console.error(`Background S3 upload failed for ${s3Key}:`, err))
    }

    const proof = await this.prisma.upward_payment_proof.create({
      data: {
        paymentRequestId,
        userPropertyId,
        amount: data.amount,
        currency: data.currency || 'NGN',
        fileUrl: s3Key,
        fileName: data.fileName,
        senderName: data.senderName,
        paymentDate: data.paymentDate,
        referenceNumber: data.referenceNumber,
        uploadedByUserId,
        status: 'PENDING',
        lineItems: data.lineItems ? JSON.parse(JSON.stringify(data.lineItems)) : undefined
      }
    })

    const propertyContext = await this.resolvePropertyContext({
      userPropertyId,
      paymentRequestId,
    })

    if (propertyContext?.pmId) {
      const amountLabel = Number(proof.amount || 0).toLocaleString()
      const placeLabel = propertyContext.placeLabel || 'a property'
      await this.prisma.upward_pm_notification.create({
        data: {
          pmId: propertyContext.pmId,
          title: 'Payment proof uploaded',
          message: `A tenant uploaded proof of payment for ₦${amountLabel} at ${placeLabel}. Review it to approve or reject.`,
          type: 'PAYMENT_PROOF',
          isPopup: true,
          url: '/payments?tab=proofs',
        },
      }).catch(err => console.error('Failed to create PM notification for payment proof:', err))
    }

    const baseUrl = this.configService.get<string>('API_URL') || 
                    this.configService.get<string>('BACKEND_URL') || 
                    'https://api.upward.com';

    const publicUrl = proof.fileUrl
      ? `${baseUrl}/api/v1/public/documents/payment-proofs/${proof.uuid}/file`
      : null;

    if (propertyContext?.platformId) {
      await this.webhookService.sendWebhook(propertyContext.platformId, 'payment_proof.uploaded', {
        proofId: proof.id,
        paymentRequestUuid: data.paymentRequestUuid,
        userPropertyUuid: data.userPropertyUuid || propertyContext.userPropertyUuid,
        amount: proof.amount,
        currency: proof.currency,
        fileUrl: publicUrl || proof.fileUrl,
        fileName: proof.fileName,
        senderName: proof.senderName,
        paymentDate: proof.paymentDate,
        referenceNumber: proof.referenceNumber,
        status: proof.status
      }).catch(err => console.error('Failed to dispatch webhook for payment proof:', err))
    }

    return { ...proof, publicUrl }
  }

  private async resolvePropertyContext(ids: {
    userPropertyId?: number
    paymentRequestId?: number
  }): Promise<{
    pmId?: number
    platformId?: number | null
    userPropertyUuid?: string
    placeLabel?: string
  } | null> {
    if (ids.userPropertyId) {
      const userProp = await this.prisma.upward_user_property.findUnique({
        where: { id: ids.userPropertyId },
        include: { company: true, location: true, pmUnit: true },
      })
      if (!userProp) return null
      const place =
        userProp.pmUnit?.unitName ||
        userProp.location?.address ||
        [userProp.location?.area, userProp.location?.state].filter(Boolean).join(', ') ||
        undefined
      return {
        pmId: userProp.pmId || undefined,
        platformId: userProp.company?.platformId,
        userPropertyUuid: userProp.uuid,
        placeLabel: place,
      }
    }

    if (ids.paymentRequestId) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { id: ids.paymentRequestId },
        include: {
          userProperty: {
            include: { company: true, location: true, pmUnit: true },
          },
        },
      })
      const userProp = pr?.userProperty
      if (!userProp) return null
      const place =
        userProp.pmUnit?.unitName ||
        userProp.location?.address ||
        [userProp.location?.area, userProp.location?.state].filter(Boolean).join(', ') ||
        undefined
      return {
        pmId: userProp.pmId || undefined,
        platformId: userProp.company?.platformId,
        userPropertyUuid: userProp.uuid,
        placeLabel: place,
      }
    }

    return null
  }
}

@Injectable()
export class GetPaymentProofUploadUrlUseCase {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: { userId: string; fileName: string; fileType: string; fileSize?: number }) {

    const folderUuid = dto.userId;

    if (dto.fileSize && dto.fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of 10MB.`)
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(dto.fileType)) {
      throw new Error('Only PDF and Image files are allowed for payment proofs.')
    }

    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${folderUuid}/payment-proofs/${uuid}.${fileExtension}`

    const uploadUrl = await this.s3Service.getUploadUrl(s3Key, dto.fileType)

    const baseUrl = this.configService.get<string>('API_URL') || 
                    this.configService.get<string>('BACKEND_URL') || 
                    'https://api.upward.com';

    const publicUrl = `${baseUrl}/api/v1/public/documents/users/payment-proofs/${folderUuid}/${uuid}.${fileExtension}`;

    return { uuid, uploadUrl, fileUrl: s3Key, publicUrl }
  }
}

@Injectable()
export class GetPaymentProofUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(proofIdentifier: number | string, res?: any) {
    const isNumeric = typeof proofIdentifier === 'number' || /^\d+$/.test(String(proofIdentifier))
    const proof = await this.prisma.upward_payment_proof.findFirst({
      where: isNumeric ? { id: Number(proofIdentifier) } : { uuid: String(proofIdentifier) },
    })

    if (!proof) {
      throw new NotFoundException('Proof of payment not found')
    }

    if (!proof.fileUrl) {
      throw new NotFoundException('This payment proof does not have an attached file')
    }

    if (res) {
      return this.s3Service.streamObject(proof.fileUrl, res, {
        filename: proof.fileName || 'payment_proof',
        cacheControl: 'public, max-age=86400',
      })
    }

    const buffer = await this.s3Service.getFileBuffer(proof.fileUrl)
    return {
      buffer,
      fileName: proof.fileName || 'payment_proof',
      fileType: proof.fileUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
    }
  }
}

@Injectable()
export class DeletePaymentProofUseCase {
  constructor(private readonly prisma: PrismaService, private readonly s3Service: S3Service) {}

  async execute(proofId: number, userId: number) {
    const proof = await this.prisma.upward_payment_proof.findUnique({
      where: { id: proofId },
    })

    if (!proof) throw new NotFoundException('Proof of payment not found')
    if (proof.uploadedByUserId !== userId) throw new UnauthorizedException('Not your proof')
    if (proof.status !== 'PENDING') throw new Error('Cannot delete an already processed proof')

    await this.prisma.upward_payment_proof.delete({ where: { id: proofId } })
    
    try {
      if (proof.fileUrl && (this.s3Service as any).deleteFile) {
        await (this.s3Service as any).deleteFile(proof.fileUrl)
      }
    } catch (e) {}

    return { success: true }
  }
}

@Injectable()
export class ReviewManualPaymentUseCase {
  private readonly logger = new Logger(ReviewManualPaymentUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly recordTransaction: RecordTransactionUseCase,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(data: {
    proofId: number
    pmUuid: string
    status: 'APPROVED' | 'REJECTED'
    remarks?: string
    amount?: number
    lineItems?: any[]
  }) {
    const proof = await this.prisma.upward_payment_proof.findUnique({
      where: { id: data.proofId },
      include: {
        paymentRequest: {
          include: { user: true, userProperty: { include: { location: true } } }
        },
        userProperty: { include: { location: true, user: true } }
      }
    })

    if (!proof) {
      throw new NotFoundException('Proof of payment not found')
    }

    if (proof.status !== 'PENDING') {
      throw new Error(`Proof already processed with status: ${proof.status}`)
    }

    const pr = proof.paymentRequest
    const property = pr ? pr.userProperty : proof.userProperty
    const user = pr ? pr.user : proof.userProperty?.user

    let paymentAmount = 0
    if (data.amount !== undefined && data.amount !== null && !isNaN(Number(data.amount)) && Number(data.amount) > 0) {
      paymentAmount = Number(data.amount)
    } else if (proof.amount && Number(proof.amount) > 0) {
      paymentAmount = Number(proof.amount)
    } else if (pr) {
      const remainingOnPr = Math.max(0, (pr.amount || 0) - (pr.amountPaid || 0))
      paymentAmount = remainingOnPr > 0 ? remainingOnPr : (pr.amount || 0)
    }

    const currency = proof.currency || pr?.currency || 'NGN'

    if (!user || paymentAmount <= 0) {
      throw new Error('Missing essential payment details on proof or invalid payment amount')
    }

    if (data.status === 'APPROVED') {
      const reference = `MNL-APR-${Date.now()}`
      
      try {
        const rawLineItems = (data.lineItems && data.lineItems.length > 0) ? data.lineItems : (proof as any).lineItems
        const normalizedLineItems = Array.isArray(rawLineItems) && rawLineItems.length > 0
          ? rawLineItems
              .map((li: any) => {
                const itemAmt = Number(li.amountAllocated ?? li.amount ?? li.amountPaid ?? 0)
                return {
                  id: li.id,
                  name: li.name || li.label || 'Rent',
                  label: li.label || li.name || 'Rent',
                  amount: itemAmt,
                  amountPaid: itemAmt,
                }
              })
              .filter((li: any) => li.amount > 0)
          : undefined

        const txPayload: any = {
          userId: user.uuid,
          amount: paymentAmount,
          currency: currency || 'NGN',
          reference: reference,
          type: 'RENT',
          status: 'SUCCESS',
          narration: pr?.description ? `${pr.description} (Manual)` : 'Manual Rent Payment',
          settlementStatus: 'SETTLED',
          isManual: true,
          sequentialFill: normalizedLineItems && normalizedLineItems.length > 0 ? false : true,
          lineItemPayments: normalizedLineItems && normalizedLineItems.length > 0 ? normalizedLineItems : undefined,
          userPropertyUuid: property?.uuid,
        }
        
        if (pr) {
          txPayload.paymentRequestId = pr.id
        }
        
        const tx = await this.recordTransaction.execute(txPayload)
        
        await this.prisma.upward_payment_proof.update({
          where: { id: proof.id },
          data: {
            status: 'APPROVED',
            amount: paymentAmount,
            remarks: data.remarks,
            transactionId: tx.id
          }
        })

        // Also mark any pending initial onboarding platform rent payment for this property as SUCCESS
        if (property?.id) {
          await this.prisma.upward_platform_rent_payment.updateMany({
            where: { userPropertyId: property.id, status: 'PENDING_APPROVAL' },
            data: { status: 'SUCCESS' }
          }).catch((err: any) => this.logger.warn(`Failed to update initial onboarding payment status: ${err.message}`))
        }
        
        await this.sendApprovalNotification(user, property, tx.uuid)
        
        return { success: true, transaction: tx }
      } catch (err) {
        this.logger.error('Failed to record manual transaction upon approval', err)
        throw new Error('Failed to record transaction')
      }
    } else {
      await this.prisma.upward_payment_proof.update({
        where: { id: proof.id },
        data: {
          status: 'REJECTED',
          remarks: data.remarks
        }
      })
      
      await this.sendRejectionNotification(user, property, data.remarks)
      
      return { success: true, status: 'REJECTED' }
    }
  }
  
  private async sendApprovalNotification(user: any, property: any, transactionId?: number) {
    const address = property?.location?.address || property?.location?.area || 'your property'
    
    await this.notificationService.notifyUser(user.id, {
      title: 'Payment Approved ✅',
      message: `Your manual payment for ${address} has been approved. Your Upward Score has been updated!`,
      type: 'SYSTEM',
      url: transactionId ? `/dashboard/receipts?id=${transactionId}` : '/dashboard/payments',
    })
  }
  
  private async sendRejectionNotification(user: any, property: any, remarks?: string) {
    const address = property?.location?.address || property?.location?.area || 'your property'
    const name = user.firstName || 'Tenant'
    const baseUrl = process.env.FRONTEND_URL || 'https://upward.goodtenants.io'
    const reasonText = remarks ? ` Reason: ${remarks}` : ''
    
    await this.notificationService.notifyUser(user.id, {
      title: 'Payment Proof Rejected ❌',
      message: `Your uploaded proof of payment for ${address} was rejected.${reasonText}`,
      type: 'SYSTEM',
      url: '/dashboard/payments'
    })
    
    if (user.email) {
      await this.emailService.sendEmailWithRetry({
        userId: user.id,
        email: user.email,
        subject: 'Manual Payment Rejected - Upward',
        html: `<p>Hi ${name},</p><p>Your uploaded proof of payment for <b>${address}</b> was rejected by your property manager.</p><p>${reasonText}</p><p>Please log in to your dashboard to review and try again or pay via our online checkout.</p><p><a href="${baseUrl}/dashboard/payments">Go to Dashboard</a></p>`,
        type: 'SYSTEM'
      }).catch(() => {})
    }
  }
}
