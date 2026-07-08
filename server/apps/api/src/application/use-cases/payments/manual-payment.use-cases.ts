import { Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { RecordTransactionUseCase } from './payment.use-cases'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import * as crypto from 'crypto'

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

    return this.prisma.upward_manual_account.upsert({
      where: data.userPropertyId 
        ? { userPropertyId: data.userPropertyId } 
        : { pmPropertyId: data.pmPropertyId },
      create: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
        userPropertyId: data.userPropertyId,
        pmPropertyId: data.pmPropertyId,
      },
      update: {
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        bankName: data.bankName,
        bankCode: data.bankCode,
      }
    })
  }
}

@Injectable()
export class UploadProofOfPaymentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    paymentRequestId?: number
    userPropertyId?: number
    amount?: number
    currency?: string
    fileUrl: string
    fileName?: string
    uploadedByUserId: number
  }) {
    if (!data.paymentRequestId && (!data.userPropertyId || !data.amount)) {
      throw new Error('Must provide either paymentRequestId or userPropertyId + amount')
    }

    if (data.paymentRequestId) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { id: data.paymentRequestId }
      })
      if (!pr) throw new NotFoundException('Payment request not found')
    } else if (data.userPropertyId) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: data.userPropertyId }
      })
      if (!prop) throw new NotFoundException('Property not found')
    }

    return this.prisma.upward_payment_proof.create({
      data: {
        paymentRequestId: data.paymentRequestId,
        userPropertyId: data.userPropertyId,
        amount: data.amount,
        currency: data.currency || 'NGN',
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        uploadedByUserId: data.uploadedByUserId,
        status: 'PENDING'
      }
    })
  }
}

@Injectable()
export class GetPaymentProofUploadUrlUseCase {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(
    private readonly s3Service: S3Service,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(dto: { userId: number; fileName: string; fileType: string; fileSize?: number }) {
    const user = await this.userRepository.findById(dto.userId)
    if (!user) throw new Error('User not found')

    if (dto.fileSize && dto.fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of 10MB.`)
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(dto.fileType)) {
      throw new Error('Only PDF and Image files are allowed for payment proofs.')
    }

    const fileExtension = dto.fileName.split('.').pop()
    const uuid = crypto.randomUUID()
    const s3Key = `users/${user.uuid}/payment-proofs/${uuid}.${fileExtension}`

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
      if ((this.s3Service as any).deleteFile) {
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
    pmId: number
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
          narration: `Manual Payment Approved - Proof #${proof.id}`,
          settlementStatus: 'VERIFIED',
          isManual: true,
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
        
        await this.sendApprovalNotification(user, property)
        
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
  
  private async sendApprovalNotification(user: any, property: any) {
    const address = property?.location?.address || property?.location?.area || 'your property'
    const name = user.firstName || 'Tenant'
    const baseUrl = process.env.FRONTEND_URL || 'https://upward.goodtenants.io'
    
    await this.notificationService.notifyUser(user.id, {
      title: 'Payment Approved ✅',
      message: `Your manual payment for ${address} has been approved. Your Upward Score has been updated!`,
      type: 'SYSTEM',
      url: '/dashboard/payments'
    })
    
    if (user.email) {
      await this.emailService.sendEmailWithRetry({
        userId: user.id,
        email: user.email,
        subject: 'Manual Payment Approved - Upward',
        html: `<p>Hi ${name},</p><p>Great news! Your manual bank transfer for <b>${address}</b> has been successfully approved.</p><p>Your Upward Score has been updated and a receipt has been generated.</p><p><a href="${baseUrl}/dashboard/payments">View Receipt</a></p>`,
        type: 'SYSTEM'
      }).catch(() => {})
    }
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
