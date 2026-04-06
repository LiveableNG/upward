import { Module } from '@nestjs/common'
import { AdminAuditEventHandler } from './events/handlers/admin-audit.handler'
import { EmailLogEventHandler } from './events/handlers/email-log.handler'
import { InteractionHandler } from './events/handlers/interaction.handler'
import { TenantScoringHandler } from './events/handlers/tenant-scoring.handler'
import { S3Module } from '@shared/infrastructure/common/s3/s3.module'
import { ReceiptModule } from '@shared/infrastructure/common/receipt/receipt.module'
import { CreditScoreService } from '@shared/infrastructure/common/credit-score.service'

// Use Cases
import { DeleteAdminUseCase } from './use-cases/admin/delete-admin.use-case'
import { GetAdminsUseCase } from './use-cases/admin/get-admins.use-case'
import { CreateAdminUseCase } from './use-cases/admin/create-admin.use-case'
import { DemoteAdminUseCase } from './use-cases/admin/demote-admin.use-case'
import { PromoteAdminUseCase } from './use-cases/admin/promote-admin.use-case'
import { ChangeAdminPasswordUseCase } from './use-cases/admin/change-admin-password.use-case'

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
import { GetCountriesUseCase } from './use-cases/location/get-countries.use-case'
import { GetCitiesUseCase } from './use-cases/location/get-cities.use-case'
import { CompleteTenantProfileUseCase } from './use-cases/tenant/complete-tenant-profile.use-case'
import { UpdateTenantProfileUseCase } from './use-cases/tenant/update-tenant-profile.use-case'
import { GetPublicProfileUseCase } from './use-cases/tenant/get-public-profile.use-case'
import { AuthModule } from './auth/auth.module'
import { CreateAnnouncementUseCase } from './use-cases/notifications/create-announcement.use-case'
import {
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
  GetTenantNotificationsUseCase,
  UpdateAnnouncementStateUseCase,
  MarkNotificationReadUseCase,
} from './use-cases/notifications/notification.use-cases'

// Payments
import {
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  ProcessGuestPaymentTokenUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetTenantTransactionsUseCase,
  GenerateReceiptPdfUseCase,
} from './use-cases/payments/payment.use-cases'
import {
  InitializeWalletUseCase,
  FundWalletUseCase,
  CreateSavingsGoalUseCase,
  UpdateSavingsGoalUseCase,
  GetSavingsGoalsUseCase,
  GetWalletDetailsUseCase,
  ProcessWalletWebhookUseCase,
} from './use-cases/wallet/wallet.use-cases'

const UseCases = [
  DeleteAdminUseCase,
  GetAdminsUseCase,
  CreateAdminUseCase,
  DemoteAdminUseCase,
  PromoteAdminUseCase,
  ChangeAdminPasswordUseCase,
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
  GetCountriesUseCase,
  GetCitiesUseCase,
  CompleteTenantProfileUseCase,
  UpdateTenantProfileUseCase,
  GetPublicProfileUseCase,

  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  ProcessGuestPaymentTokenUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetTenantTransactionsUseCase,
  GenerateReceiptPdfUseCase,
  MarkNotificationReadUseCase,
  CreditScoreService,

  InitializeWalletUseCase,
  FundWalletUseCase,
  CreateSavingsGoalUseCase,
  UpdateSavingsGoalUseCase,
  GetSavingsGoalsUseCase,
  GetWalletDetailsUseCase,
  ProcessWalletWebhookUseCase,

  CreateAnnouncementUseCase,
  GetAdminAnnouncementsUseCase,
  SendNotificationUseCase,
  GetTenantNotificationsUseCase,
  UpdateAnnouncementStateUseCase,
]

@Module({
  imports: [S3Module, ReceiptModule, AuthModule],
  providers: [
    AdminAuditEventHandler,
    EmailLogEventHandler,
    InteractionHandler,
    TenantScoringHandler,
    ...UseCases,
  ],
  exports: [...UseCases],
})
export class ApplicationModule {}
