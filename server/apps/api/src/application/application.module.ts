import { Module } from '@nestjs/common'
import { AdminAuditEventHandler } from './events/handlers/admin-audit.handler'
import { EmailLogEventHandler } from './events/handlers/email-log.handler'
import { InteractionHandler } from './events/handlers/interaction.handler'
import { PaymentWebhookHandler } from './events/handlers/payment-webhook.handler'
import { S3Module } from '../shared/infrastructure/common/s3/s3.module'
import { ReceiptModule } from '../shared/infrastructure/common/receipt/receipt.module'
import { WebhookService } from '../shared/infrastructure/common/webhook/webhook.service'
import { EncryptionService } from '../shared/infrastructure/common/encryption.service'
import { KYCModule } from '../shared/infrastructure/common/kyc/kyc.module'

// Use Cases
import { DeleteAdminUseCase } from './use-cases/admin/delete-admin.use-case'
import { GetAdminsUseCase } from './use-cases/admin/get-admins.use-case'
import { CreateAdminUseCase } from './use-cases/admin/create-admin.use-case'
import { DemoteAdminUseCase } from './use-cases/admin/demote-admin.use-case'
import { PromoteAdminUseCase } from './use-cases/admin/promote-admin.use-case'
import { ChangeAdminPasswordUseCase } from './use-cases/admin/change-admin-password.use-case'
import { SearchUsersUseCase } from './use-cases/admin/search-users.use-case'

import { JoinWaitlistUseCase } from './use-cases/waitlist/join-waitlist.use-case'
import { GetWaitlistUseCase } from './use-cases/waitlist/get-waitlist.use-case'
import { UpdateWaitlistUserUseCase } from './use-cases/waitlist/update-waitlist-user.use-case'
import { DeleteWaitlistUserUseCase } from './use-cases/waitlist/delete-waitlist-user.use-case'
import { BulkDeleteWaitlistUsersUseCase } from './use-cases/waitlist/bulk-delete-waitlist-users.use-case'
import { GetWaitlistFilterOptionsUseCase } from './use-cases/waitlist/get-waitlist-filter-options.use-case'
import { GetWaitlistCountUseCase } from './use-cases/waitlist/get-waitlist-count.use-case'
import { GetWaitlistByEmailUseCase } from './use-cases/waitlist/get-waitlist-by-email.use-case'
import { UnsubscribeWaitlistUseCase } from './use-cases/waitlist/unsubscribe-waitlist.use-case'

import { GetSessionsUseCase } from './use-cases/sessions/get-sessions.use-case'
import { CreateSessionUseCase } from './use-cases/sessions/create-session.use-case'
import { UpdateSessionUseCase } from './use-cases/sessions/update-session.use-case'
import { DeleteSessionUseCase } from './use-cases/sessions/delete-session.use-case'
import { MarkAttendanceUseCase } from './use-cases/sessions/mark-attendance.use-case'
import { ChangeUserSessionUseCase } from './use-cases/sessions/change-user-session.use-case'

import { GetWaitlistAnalyticsUseCase } from './use-cases/analytics/get-waitlist-analytics.use-case'
import { GetDropOffAnalysisUseCase } from './use-cases/analytics/get-drop-off-analysis.use-case'
import { GetAbStatsUseCase } from './use-cases/analytics/get-ab-stats.use-case'
import { SendDailyReportUseCase } from './use-cases/analytics/send-daily-report.use-case'
import { TrackInteractionUseCase } from './use-cases/analytics/track-interaction.use-case'

import { SendBulkEmailUseCase } from './use-cases/email/send-bulk-email.use-case'
import { ResendConfirmationEmailUseCase } from './use-cases/email/resend-confirmation-email.use-case'
import { GetEmailLogsUseCase } from './use-cases/email/get-email-logs.use-case'
import { GetSystemEmailUseCase } from './use-cases/email/get-system-email.use-case'
import { UpsertSystemEmailUseCase } from './use-cases/email/upsert-system-email.use-case'
import { SendTestEmailsUseCase } from './use-cases/email/send-test-emails.use-case'
import { RetryEmailUseCase } from './use-cases/email/retry-email.use-case'

import { GetErrorLogsUseCase } from './use-cases/system/get-error-logs.use-case'
import { ResolveErrorUseCase } from './use-cases/system/resolve-error.use-case'
import { ClearErrorLogsUseCase } from './use-cases/system/clear-error-logs.use-case'

import { GetCampaignsUseCase } from './use-cases/campaign/get-campaigns.use-case'
import { GetCampaignByWeekUseCase } from './use-cases/campaign/get-campaign-by-week.use-case'
import { UpsertCampaignUseCase } from './use-cases/campaign/upsert-campaign.use-case'
import { DeleteCampaignUseCase } from './use-cases/campaign/delete-campaign.use-case'
import { ToggleCampaignUseCase } from './use-cases/campaign/toggle-campaign.use-case'
import { PreviewCampaignAudienceUseCase } from './use-cases/campaign/preview-campaign-audience.use-case'
import { RunTuesdayCampaignUseCase } from './use-cases/campaign/run-tuesday-campaign.use-case'
import { CreateFairnessStoryUseCase } from './use-cases/fairness-story/create-fairness-story.use-case'
import { GetFairnessStoriesUseCase } from './use-cases/fairness-story/get-fairness-stories.use-case'
import { DeleteFairnessStoryUseCase } from './use-cases/fairness-story/delete-fairness-story.use-case'
import { GetStoryUploadUrlsUseCase } from './use-cases/fairness-story/get-story-upload-urls.use-case'
import { GetAdminLogsUseCase } from './use-cases/admin-log/get-admin-logs.use-case'
import { LogAdminActionUseCase } from './use-cases/admin-log/log-admin-action.use-case'
import { GetWebhookLogsUseCase } from './use-cases/admin/get-webhook-logs.use-case'
import { RetryWebhookUseCase } from './use-cases/admin/retry-webhook.use-case'
import { GetCountriesUseCase } from './use-cases/location/get-countries.use-case'
import { GetCitiesUseCase } from './use-cases/location/get-cities.use-case'
import { CompleteUserProfileUseCase } from './use-cases/user/complete-user-profile.use-case'
import { GetPublicProfileUseCase } from './use-cases/user/get-public-profile.use-case'
import { CalculateRentScoreUseCase } from './use-cases/user/calculate-rent-score.use-case'
import { GetAvatarUploadUrlUseCase } from './use-cases/user/get-avatar-upload-url.use-case'
import { IngestPastRecordsUseCase } from './use-cases/user/ingest-past-records.use-case'
import { RequestCredibilityRecordsUseCase } from './use-cases/user/request-credibility-records.use-case'
import { GetCredibilityRequestsUseCase } from './use-cases/user/get-credibility-requests.use-case'
import { CheckSlugAvailabilityUseCase } from './use-cases/user/check-slug-availability.use-case'
import { GetCredibilityRequestDetailsUseCase } from './use-cases/external/get-credibility-request-details.use-case'
import { FulfillCredibilityRequestUseCase } from './use-cases/external/fulfill-credibility-request.use-case'
import { SingleInviteUseCase } from './use-cases/external/single-invite.use-case'
import { GenerateKYCReportPdfUseCase } from './use-cases/user/generate-kyc-report-pdf.use-case'
import { CreatePlatformUseCase } from './use-cases/platform/create-platform.use-case'
import { CreateExternalPaymentRequestUseCase } from './use-cases/external/create-payment-request.use-case'
import { GetPublicPaymentDetailsUseCase } from './use-cases/external/get-public-payment.use-case'
import { ConfirmExternalPaymentUseCase } from './use-cases/external/confirm-payment.use-case'
import { AddPropertyUseCase } from './use-cases/external/add-property.use-case'
import { RenewPropertyUseCase } from './use-cases/external/renew-property.use-case'
import { UpdatePmProfileUseCase } from './use-cases/pm/update-pm-profile.use-case'
import { UpdatePmBankInfoUseCase } from './use-cases/pm/update-pm-bank-info.use-case'
import { ChangePmPasswordUseCase } from './use-cases/pm/change-pm-password.use-case'
import { GetPmAvatarUploadUrlUseCase } from './use-cases/pm/get-pm-avatar-upload-url.use-case'
import { CreatePropertyUseCase } from './pm/use-cases/create-property.use-case'
import { UpdatePropertyUseCase } from './pm/use-cases/update-property.use-case'
import { GetPmPropertiesUseCase } from './pm/use-cases/get-pm-properties.use-case'
import { BulkCreateUnitsUseCase } from './pm/use-cases/bulk-create-units.use-case'
import { GetPmUnitsUseCase } from './pm/use-cases/get-pm-units.use-case'
import { GetUnitUseCase } from './pm/use-cases/get-unit.use-case'
import { UpdateUnitUseCase } from './pm/use-cases/update-unit.use-case'
import { DeleteUnitUseCase } from './pm/use-cases/delete-unit.use-case'
import { GetUnitPaymentsUseCase } from './pm/use-cases/get-unit-payments.use-case'
import { AddUnitPaymentUseCase } from './pm/use-cases/add-unit-payment.use-case'
import { GetPropertyImageUploadUrlUseCase } from './pm/use-cases/get-property-image-upload-url.use-case'
import { AuthModule } from './auth/auth.module'
import { CreateAnnouncementUseCase } from './use-cases/notifications/create-announcement.use-case'
import { DeactivateAnnouncementsUseCase } from './use-cases/notifications/deactivate-announcements.use-case'
import {
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
  GetUserNotificationsUseCase,
  UpdateAnnouncementStateUseCase,
  MarkNotificationReadUseCase,
  MarkNotificationsByCategoryReadUseCase,
} from './use-cases/notifications/notification.use-cases'
import { RentReminderWorkflowUseCase } from './use-cases/notifications/rent-reminder-workflow.use-case'

// Payments
import {
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetUserTransactionsUseCase,
  GenerateReceiptPdfUseCase,
  GetPendingPaymentsUseCase,
  ResolveSubaccountUseCase,
  GetPropertyBalanceUseCase,
} from './use-cases/payments/payment.use-cases'

import { UploadContractUseCase } from './use-cases/contracts/upload-contract.use-case'
import { GetContractsUseCase } from './use-cases/contracts/get-contracts.use-case'
import { DeleteContractUseCase } from './use-cases/contracts/delete-contract.use-case'

import { CreateSupportTicketUseCase } from './use-cases/support/create-support-ticket.use-case'
import { GetUserTicketsUseCase } from './use-cases/support/get-user-tickets.use-case'
import { GetAllTicketsUseCase } from './use-cases/support/get-all-tickets.use-case'
import { ResolveTicketUseCase } from './use-cases/support/resolve-ticket.use-case'
import { RegisterDeviceTokenUseCase, UnregisterDeviceTokenUseCase, SendPushToUserUseCase } from './use-cases/push/push.use-cases'
import { PushNotificationService } from '../shared/infrastructure/common/push-notification.service'
import { NotificationService } from '../shared/infrastructure/common/notification.service'
import { PrismaDeviceTokenRepository } from '../shared/infrastructure/prisma/repositories/prisma-device-token.repository'


const UseCases = [
  DeleteAdminUseCase,
  GetAdminsUseCase,
  CreateAdminUseCase,
  DemoteAdminUseCase,
  PromoteAdminUseCase,
  ChangeAdminPasswordUseCase,
  SearchUsersUseCase,
  JoinWaitlistUseCase,
  GetWaitlistUseCase,
  UpdateWaitlistUserUseCase,
  DeleteWaitlistUserUseCase,
  BulkDeleteWaitlistUsersUseCase,
  GetWaitlistFilterOptionsUseCase,
  GetWaitlistCountUseCase,
  GetWaitlistByEmailUseCase,
  UnsubscribeWaitlistUseCase,
  GetSessionsUseCase,
  CreateSessionUseCase,
  UpdateSessionUseCase,
  DeleteSessionUseCase,
  MarkAttendanceUseCase,
  ChangeUserSessionUseCase,
  GetWaitlistAnalyticsUseCase,
  GetDropOffAnalysisUseCase,
  GetAbStatsUseCase,
  SendDailyReportUseCase,
  TrackInteractionUseCase,
  SendBulkEmailUseCase,
  ResendConfirmationEmailUseCase,
  GetEmailLogsUseCase,
  GetSystemEmailUseCase,
  UpsertSystemEmailUseCase,
  SendTestEmailsUseCase,
  RetryEmailUseCase,
  GetErrorLogsUseCase,
  ResolveErrorUseCase,
  ClearErrorLogsUseCase,
  CreateFairnessStoryUseCase,
  GetFairnessStoriesUseCase,
  DeleteFairnessStoryUseCase,
  GetStoryUploadUrlsUseCase,
  GetCampaignsUseCase,
  GetCampaignByWeekUseCase,
  UpsertCampaignUseCase,
  DeleteCampaignUseCase,
  ToggleCampaignUseCase,
  PreviewCampaignAudienceUseCase,
  RunTuesdayCampaignUseCase,
  GetAdminLogsUseCase,
  LogAdminActionUseCase,
  GetWebhookLogsUseCase,
  RetryWebhookUseCase,
  GetCountriesUseCase,
  GetCitiesUseCase,
  CompleteUserProfileUseCase,
  GetPublicProfileUseCase,
  CalculateRentScoreUseCase,
  GetAvatarUploadUrlUseCase,
  IngestPastRecordsUseCase,
  RequestCredibilityRecordsUseCase,
  GetCredibilityRequestsUseCase,
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetUserTransactionsUseCase,
  GenerateKYCReportPdfUseCase,
  GenerateReceiptPdfUseCase,
  CheckSlugAvailabilityUseCase,
  MarkNotificationReadUseCase,

  CreateAnnouncementUseCase,
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
  GetUserNotificationsUseCase,
  UpdateAnnouncementStateUseCase,
  MarkNotificationReadUseCase,
  MarkNotificationsByCategoryReadUseCase,
  SingleInviteUseCase,
  CreatePlatformUseCase,
  CreateExternalPaymentRequestUseCase,
  GetPublicPaymentDetailsUseCase,
  ConfirmExternalPaymentUseCase,
  AddPropertyUseCase,
  RenewPropertyUseCase,
  GetCredibilityRequestDetailsUseCase,
  FulfillCredibilityRequestUseCase,
  GetPendingPaymentsUseCase,
  ResolveSubaccountUseCase,
  GetPropertyBalanceUseCase,
  RentReminderWorkflowUseCase,
  DeactivateAnnouncementsUseCase,

  UploadContractUseCase,
  GetContractsUseCase,
  DeleteContractUseCase,

  CreateSupportTicketUseCase,
  GetUserTicketsUseCase,
  GetAllTicketsUseCase,
  ResolveTicketUseCase,

  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  SendPushToUserUseCase,
  UpdatePmProfileUseCase,
  UpdatePmBankInfoUseCase,
  ChangePmPasswordUseCase,
  GetPmAvatarUploadUrlUseCase,
  CreatePropertyUseCase,
  UpdatePropertyUseCase,
  GetPmPropertiesUseCase,
  BulkCreateUnitsUseCase,
  GetPmUnitsUseCase,
  GetUnitUseCase,
  UpdateUnitUseCase,
  DeleteUnitUseCase,
  GetUnitPaymentsUseCase,
  AddUnitPaymentUseCase,
  GetPropertyImageUploadUrlUseCase,
]

@Module({
  imports: [S3Module, ReceiptModule, KYCModule, AuthModule],
  providers: [
    AdminAuditEventHandler,
    EmailLogEventHandler,
    InteractionHandler,
    PaymentWebhookHandler,
    WebhookService,
    EncryptionService,
    PushNotificationService,
    NotificationService,
    PrismaDeviceTokenRepository,
    ...UseCases,
  ],
  exports: [WebhookService, EncryptionService, PushNotificationService, NotificationService, PrismaDeviceTokenRepository, ...UseCases],
})
export class ApplicationModule { }
