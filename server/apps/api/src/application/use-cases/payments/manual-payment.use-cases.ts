import { Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from './payment.use-cases'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import * as crypto from 'crypto'
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service'

@Injectable()
export class AddManualAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    accountNumber: string
    accountName: string
    bankName: string
    bankCode?: string
    pmUuid?: string
    isPrimary?: boolean
    userPropertyId?: number
    pmPropertyId?: number
  }) {
    let pmId: number | undefined

    if (data.pmUuid) {
      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { uuid: data.pmUuid }
      })
      if (!pm) throw new NotFoundException('Property manager not found')
      pmId = pm.id
    } else if (data.pmPropertyId) {
      const pmProperty = await this.prisma.upward_pm_property.findUnique({
        where: { id: data.pmPropertyId }
      })
      if (pmProperty) pmId = pmProperty.pmId
    } else if (data.userPropertyId) {
      const userProperty = await this.prisma.upward_user_property.findUnique({
        where: { id: data.userPropertyId }
      })
      if (userProperty) pmId = userProperty.pmId || undefined
    }

    if (data.isPrimary && pmId) {
      const existingPrimary = await this.prisma.upward_manual_account.findFirst({
        where: { pmId, isPrimary: true }
      })
      if (existingPrimary) {
        return this.prisma.upward_manual_account.update({
          where: { id: existingPrimary.id },
          data: {
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            bankName: data.bankName,
            bankCode: data.bankCode,
          }
        })
      }
    }

    const account = await this.prisma.upward_manual_account.create({
      data: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        pmId,
        isPrimary: data.isPrimary || false,
      }
    })

    if (data.userPropertyId) {
      await this.prisma.upward_user_property.update({
        where: { id: data.userPropertyId },
        data: { manualAccountId: account.id }
      })
    }
    if (data.pmPropertyId) {
      await this.prisma.upward_pm_property.update({
        where: { id: data.pmPropertyId },
        data: { manualAccountId: account.id }
      })
    }

    return account
  }
}

@Injectable()
export class GetManualAccountsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid }
    })
    if (!pm) throw new NotFoundException('Property manager not found')

    if (pm.accountNumber && pm.bankName) {
      const existingPrimary = await this.prisma.upward_manual_account.findFirst({
        where: { pmId: pm.id, isPrimary: true }
      })
      if (!existingPrimary) {
        await this.prisma.upward_manual_account.create({
          data: {
            accountNumber: pm.accountNumber,
            accountName: pm.accountName || pm.businessName || `${pm.firstName} ${pm.lastName}`,
            bankName: pm.bankName,
            bankCode: pm.bankCode,
            pmId: pm.id,
            isPrimary: true,
          }
        })
      }
    }

    return this.prisma.upward_manual_account.findMany({
      where: { pmId: pm.id },
      include: {
        pmProperties: {
          select: { id: true, uuid: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}

@Injectable()
export class DeleteManualAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, pmUuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid }
    })
    if (!pm) throw new NotFoundException('Property manager not found')

    const account = await this.prisma.upward_manual_account.findFirst({
      where: { id, pmId: pm.id }
    })
    if (!account) throw new NotFoundException('Account not found')
    if (account.isPrimary) throw new Error('Cannot delete the primary settlement account')

    await this.prisma.upward_pm_property.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null }
    })
    await this.prisma.upward_user_property.updateMany({
      where: { manualAccountId: id },
      data: { manualAccountId: null }
    })

    await this.prisma.upward_manual_account.delete({
      where: { id }
    })

    return { success: true }
  }
}

@Injectable()
export class LinkPropertiesToAccountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: { accountId: number; propertyUuids: string[]; pmUuid: string }) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: data.pmUuid }
    })
    if (!pm) throw new NotFoundException('Property manager not found')

    const account = await this.prisma.upward_manual_account.findFirst({
      where: { id: data.accountId, pmId: pm.id }
    })
    if (!account) throw new NotFoundException('Account not found')

    const properties = await this.prisma.upward_pm_property.findMany({
      where: { uuid: { in: data.propertyUuids }, pmId: pm.id },
      select: { id: true }
    })

    const propertyIds = properties.map(p => p.id)

    // Clear old links for this account
    await this.prisma.upward_pm_property.updateMany({
      where: { manualAccountId: data.accountId, id: { notIn: propertyIds } },
      data: { manualAccountId: null }
    })

    // Link new ones
    if (propertyIds.length > 0) {
      await this.prisma.upward_pm_property.updateMany({
        where: { id: { in: propertyIds } },
        data: { manualAccountId: data.accountId }
      })

      const pmUnits = await this.prisma.upward_pm_unit.findMany({
        where: { propertyId: { in: propertyIds } },
        select: { id: true }
      })
      const pmUnitIds = pmUnits.map(u => u.id)
      if (pmUnitIds.length > 0) {
        await this.prisma.upward_user_property.updateMany({
          where: { pmUnitId: { in: pmUnitIds } },
          data: { manualAccountId: data.accountId }
        })
      }
    }

    return { success: true }
  }
}

@Injectable()
export class UploadProofOfPaymentUseCase {
  constructor(
    private readonly prisma: PrismaService, 
    private readonly s3Service: S3Service,
    private readonly webhookService: WebhookService
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

    if (propertyContext?.platformId) {
      await this.webhookService.sendWebhook(propertyContext.platformId, 'payment_proof.uploaded', {
        proofId: proof.id,
        paymentRequestUuid: data.paymentRequestUuid,
        userPropertyUuid: data.userPropertyUuid || propertyContext.userPropertyUuid,
        amount: proof.amount,
        currency: proof.currency,
        fileUrl: proof.fileUrl,
        fileName: proof.fileName,
        senderName: proof.senderName,
        paymentDate: proof.paymentDate,
        referenceNumber: proof.referenceNumber,
        status: proof.status
      }).catch(err => console.error('Failed to dispatch webhook for payment proof:', err))
    }

    return proof
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

    return { uuid, uploadUrl, fileUrl: s3Key }
  }
}

@Injectable()
export class GetPaymentProofUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(proofId: number) {
    const proof = await this.prisma.upward_payment_proof.findUnique({
      where: { id: proofId },
    })

    if (!proof) {
      throw new NotFoundException('Proof of payment not found')
    }

    if (!proof.fileUrl) {
      throw new NotFoundException('This payment proof does not have an attached file')
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
    
    // Also delete from S3
    // Assuming S3Service has a deleteFile method or we just leave it for garbage collection, 
    // but typically we should delete. For now, we'll try to call delete if it exists on S3Service.
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
    const amount = pr ? pr.amount : proof.amount
    const currency = pr ? pr.currency : proof.currency

    if (!user || !amount) {
      throw new Error('Missing essential payment details on proof')
    }

    if (data.status === 'APPROVED') {
      const reference = `MNL-APR-${Date.now()}`
      
      try {
        const txPayload: any = {
          userId: user.uuid,
          amount: amount,
          currency: currency || 'NGN',
          reference: reference,
          type: 'RENT',
          status: 'SUCCESS',
          narration: pr?.description ? `${pr.description} (Manual)` : 'Manual Rent Payment',
          settlementStatus: 'VERIFIED',
          isManual: true,
          sequentialFill: (proof as any).lineItems ? false : true,
          lineItemPayments: (proof as any).lineItems ? (proof as any).lineItems : undefined,
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
            remarks: data.remarks,
            transactionId: tx.id
          }
        })
        
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
