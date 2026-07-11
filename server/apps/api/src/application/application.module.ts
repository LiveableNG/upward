import { Module } from '@nestjs/common'
import { AdminAuditEventHandler } from './events/handlers/admin-audit.handler'
import { EmailLogEventHandler } from './events/handlers/email-log.handler'
import { InteractionHandler } from './events/handlers/interaction.handler'
import { PaymentWebhookHandler } from './events/handlers/payment-webhook.handler'
import { PaymentPostActionsHandler } from './events/handlers/payment-post-actions.handler'
import { CredibilityWebhookHandler } from './events/handlers/credibility-webhook.handler'
import { S3Module } from '../shared/infrastructure/common/s3/s3.module'
import { ReceiptModule } from '../shared/infrastructure/common/receipt/receipt.module'
import { WebhookService } from '../shared/infrastructure/common/webhook/webhook.service'
import { BulkInviteService } from '../shared/infrastructure/common/bulk-invite.service'
import { EncryptionService } from '../shared/infrastructure/common/encryption.service'
import { KYCModule } from '../shared/infrastructure/common/kyc/kyc.module'
import { UnifiedReminderService } from '../shared/infrastructure/common/reminder.service'
import { PaymentConfigurationService } from '../shared/infrastructure/common/payment-config.service'

// Use Cases
import { DeleteAdminUseCase } from './use-cases/admin/delete-admin.use-case'
import { GetAdminsUseCase } from './use-cases/admin/get-admins.use-case'
import { CreateAdminUseCase } from './use-cases/admin/create-admin.use-case'
import { DemoteAdminUseCase } from './use-cases/admin/demote-admin.use-case'
import { PromoteAdminUseCase } from './use-cases/admin/promote-admin.use-case'
import { ChangeAdminPasswordUseCase } from './use-cases/admin/change-admin-password.use-case'
import { SearchUsersUseCase } from './use-cases/admin/search-users.use-case'
import { GetAdminUserDetailUseCase } from './use-cases/admin/get-admin-user-detail.use-case'
import { GetAdminPmDetailUseCase } from './use-cases/admin/get-admin-pm-detail.use-case'
import { UpdateAdminUserUseCase } from './use-cases/admin/update-admin-user.use-case'
import { UpdateAdminPmUseCase } from './use-cases/admin/update-admin-pm.use-case'
import { SendAdminNotificationUseCase } from './use-cases/admin/send-admin-notification.use-case'
import {
  GetFeeOverridesUseCase,
  UpsertFeeOverrideUseCase,
  DeleteFeeOverrideUseCase,
  SearchFeeTargetsUseCase,
} from './use-cases/admin/fee-overrides.use-cases'
import { GetAppActivityLogsUseCase } from './use-cases/admin/get-app-activity-logs.use-case'
import { GetInternalAccountsUseCase } from './use-cases/admin/get-internal-accounts.use-case'
import { ToggleInternalAccountUseCase } from './use-cases/admin/toggle-internal-account.use-case'
import { SyncTenantUseCase } from './use-cases/admin/sync-tenant.use-case'

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
import { GetPerformanceMetricsUseCase } from './use-cases/analytics/get-performance-metrics.use-case'
import { GetRevenueMetricsUseCase } from './use-cases/analytics/get-revenue-metrics.use-case'
import { GetWaitlistMetricsUseCase } from './use-cases/analytics/get-waitlist-metrics.use-case'
import { GetSignedUpMetricsUseCase } from './use-cases/analytics/get-signed-up-metrics.use-case'
import { GetInvitedMetricsUseCase } from './use-cases/analytics/get-invited-metrics.use-case'
import { GetPmMetricsUseCase } from './use-cases/analytics/get-pm-metrics.use-case'
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
import { EmailBatchRetryManager } from './use-cases/email/email-batch-retry-manager.service'
import { RetryBatchEmailsUseCase } from './use-cases/email/retry-batch-emails.use-case'

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
import { VerifyBvnUseCase } from './use-cases/user/verify-bvn.use-case'
import { GetCredibilityRequestDetailsUseCase } from './use-cases/external/get-credibility-request-details.use-case'
import { FulfillCredibilityRequestUseCase } from './use-cases/external/fulfill-credibility-request.use-case'
import { SingleInviteUseCase } from './use-cases/external/single-invite.use-case'
import { GenerateKYCReportPdfUseCase } from './use-cases/user/generate-kyc-report-pdf.use-case'
import { RequestDataDeletionUseCase } from './use-cases/user/request-data-deletion.use-case'
import { CreatePlatformUseCase } from './use-cases/platform/create-platform.use-case'
import { CreateExternalPaymentRequestUseCase } from './use-cases/external/create-payment-request.use-case'
import { GetPublicPaymentDetailsUseCase } from './use-cases/external/get-public-payment.use-case'
import { ConfirmExternalPaymentUseCase } from './use-cases/external/confirm-payment.use-case'
import { ResolveExternalPendingRefundUseCase } from './use-cases/external/resolve-external-refund.use-case'
import { AddPropertyUseCase } from './use-cases/external/add-property.use-case'
import { RenewPropertyUseCase } from './use-cases/external/renew-property.use-case'
import { CancelExternalPaymentRequestUseCase } from './use-cases/external/cancel-payment-request.use-case'
import { UpdateExternalPaymentRequestUseCase } from './use-cases/external/update-payment-request.use-case'
import { ProcessScheduledExternalPaymentRequestsUseCase } from './use-cases/external/process-scheduled-payments.use-case'
import { UpdatePmProfileUseCase } from './use-cases/pm/update-pm-profile.use-case'
import { UpdatePmBankInfoUseCase } from './use-cases/pm/update-pm-bank-info.use-case'
import { ChangePmPasswordUseCase } from './use-cases/pm/change-pm-password.use-case'
import { GetPmAvatarUploadUrlUseCase } from './use-cases/pm/get-pm-avatar-upload-url.use-case'
import { UploadPmAvatarUseCase } from './use-cases/pm/upload-pm-avatar.use-case'
import { GetPmLetterheadUploadUrlUseCase } from './use-cases/pm/get-pm-letterhead-upload-url.use-case'
import { UploadPmLetterheadUseCase } from './use-cases/pm/upload-pm-letterhead.use-case'
import { CreatePropertyUseCase } from './pm/use-cases/create-property.use-case'
import { UpdatePropertyUseCase } from './pm/use-cases/update-property.use-case'
import { DeletePropertyUseCase } from './pm/use-cases/delete-property.use-case'
import { GetPmPropertiesUseCase } from './pm/use-cases/get-pm-properties.use-case'
import { GetPmDashboardSummaryUseCase } from './pm/use-cases/get-pm-dashboard-summary.use-case'
import { GetPmPropertyUseCase } from './pm/use-cases/get-pm-property.use-case'
import { BulkCreateUnitsUseCase } from './pm/use-cases/bulk-create-units.use-case'
import { GetPmUnitsUseCase } from './pm/use-cases/get-pm-units.use-case'
import { GetUnitUseCase } from './pm/use-cases/get-unit.use-case'
import { UpdateUnitUseCase } from './pm/use-cases/update-unit.use-case'
import { DeleteUnitUseCase } from './pm/use-cases/delete-unit.use-case'
import { GetUnitPaymentsUseCase } from './pm/use-cases/get-unit-payments.use-case'
import { AddUnitPaymentUseCase } from './pm/use-cases/add-unit-payment.use-case'
import { GetPropertyImageUploadUrlUseCase } from './pm/use-cases/get-property-image-upload-url.use-case'
import { GetPmTenantsUseCase } from './pm/use-cases/tenants/get-pm-tenants.use-case'
import { InviteTenantUseCase } from './pm/use-cases/tenants/invite-tenant.use-case'
import { CreateTenantUseCase } from './pm/use-cases/tenants/create-tenant.use-case'
import { GetTenantUseCase } from './pm/use-cases/tenants/get-tenant.use-case'
import { AssignTenantToUnitUseCase } from './pm/use-cases/tenants/assign-tenant-to-unit.use-case'
import { UpdateTenantUseCase } from './pm/use-cases/tenants/update-tenant.use-case'
import { SyncUnitToUpwardUseCase } from './pm/use-cases/units/sync-unit.use-case'
import { CreatePmPaymentRequestUseCase } from './pm/use-cases/payments/create-pm-payment-request.use-case'
import { GetPmPaymentRequestsUseCase } from './pm/use-cases/payments/get-pm-payment-requests.use-case'
import { GetPmPaymentRequestUseCase } from './pm/use-cases/payments/get-pm-payment-request.use-case'
import { ResendPmPaymentRequestUseCase } from './pm/use-cases/payments/resend-pm-payment-request.use-case'
import { UpdatePmPaymentRequestUseCase } from './pm/use-cases/payments/update-pm-payment-request.use-case'
import { CancelPmPaymentRequestUseCase } from './pm/use-cases/payments/cancel-pm-payment-request.use-case'
import { ProcessScheduledPmPaymentRequestsUseCase } from './pm/use-cases/payments/process-scheduled-payment-requests.use-case'
import { ResolvePendingRefundUseCase } from './pm/use-cases/payments/resolve-refund.use-case'
import { GetPmDocumentsUseCase } from './pm/use-cases/documents/get-pm-documents.use-case'
import { GetTenantUploadedDocumentsUseCase } from './pm/use-cases/documents/get-tenant-uploaded-documents.use-case'
import { SaveDocumentTemplateUseCase } from './pm/use-cases/documents/save-document-template.use-case'
import { SendDocumentUseCase } from './pm/use-cases/documents/send-document.use-case'
import { GenerateDocumentPdfUseCase } from './pm/use-cases/documents/generate-document-pdf.use-case'
import { SendToTenantVaultUseCase } from './pm/use-cases/documents/send-to-tenant-vault.use-case'
import { GetPendingCredibilityRequestsUseCase } from './pm/use-cases/get-pending-credibility-requests.use-case'
import { BulkCreateTenantRecordsUseCase } from './pm/use-cases/bulk-create-tenant-records.use-case'
import { BulkInviteTenantsUseCase } from './pm/use-cases/tenants/bulk-invite-tenants.use-case'
import { GetPendingJoinRequestsUseCase } from './pm/use-cases/tenants/get-pending-join-requests.use-case'
import { DismissJoinRequestUseCase } from './pm/use-cases/tenants/dismiss-join-request.use-case'
import { ResolveDuplicateJoinRequestUseCase } from './pm/use-cases/tenants/resolve-duplicate-join-request.use-case'
import { BulkFullImportUseCase } from './pm/use-cases/bulk-full-import.use-case'
import { InviteTeamMemberUseCase } from './pm/use-cases/team/invite-team-member.use-case';
import { GetTeamMembersUseCase } from './pm/use-cases/team/get-team-members.use-case';
import { UpdateTeamMemberPermissionsUseCase } from './pm/use-cases/team/update-team-member-permissions.use-case';
import { RevokeTeamMemberUseCase } from './pm/use-cases/team/revoke-team-member.use-case';
import { SendLandlordReportUseCase } from './pm/use-cases/send-landlord-report.use-case'
import { ActivityLogService } from '../shared/application/activity-log.service'
import { GetLandlordReportsUseCase } from './pm/use-cases/get-landlord-reports.use-case'
import { GetLandlordReportUseCase } from './pm/use-cases/get-landlord-report.use-case'
import { PmBulkRentReminderUseCase } from './pm/use-cases/pm-bulk-rent-reminder.use-case'
import { UpdateRentPaymentUseCase } from './pm/use-cases/update-rent-payment.use-case'
import { SubmitFeedbackUseCase } from './use-cases/feedback/submit-feedback.use-case'
import { BulkAddRentHistoryUseCase } from './pm/use-cases/bulk-add-rent-history.use-case'
import { MarkCredibilityRequestDoneUseCase } from './pm/use-cases/mark-credibility-request-done.use-case'
import { GetLandlordPortfolioUseCase } from './pm/use-cases/landlord/get-landlord-portfolio.use-case'
import { LandlordChangePasswordUseCase } from './pm/use-cases/landlord/landlord-change-password.use-case'
import { LandlordService } from './pm/services/landlord.service'
import { GetPmLandlordsUseCase } from './pm/use-cases/landlord/get-pm-landlords.use-case'
import { GetLandlordPropertyDetailsUseCase } from './pm/use-cases/landlord/get-landlord-property-details.use-case'
import {
  GetPmNotificationsUseCase,
  MarkPmNotificationReadUseCase,
  MarkAllPmNotificationsReadUseCase,
  GetUnreadPmPopupsUseCase,
} from './pm/use-cases/notifications/pm-notification.use-cases'

import { RejectCredibilityRequestUseCase } from './use-cases/external/reject-credibility-request.use-case'
import {
  CreateBlogPostUseCase,
  DeleteBlogPostUseCase,
  GetAdminBlogPostsUseCase,
  GetPublicBlogPostBySlugUseCase,
  GetPublicBlogPostsUseCase,
  PublishBlogPostUseCase,
  UnpublishBlogPostUseCase,
  UpdateBlogPostUseCase,
  UploadBlogImageUseCase,
} from './use-cases/blog/blog-post.use-cases'
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
import { VerifyPmEmailUseCase } from './use-cases/tenant-pm-connection/verify-pm.use-case'
import { ConfirmPmConnectionUseCase } from './use-cases/tenant-pm-connection/confirm-pm-connection.use-case'
import { InvitePmUseCase } from './use-cases/tenant-pm-connection/invite-pm.use-case'
import { SubmitUnitRequestUseCase } from './use-cases/tenant-pm-connection/submit-unit-request.use-case'
import { DiscoverLinkedPropertiesUseCase } from './use-cases/tenant-pm-connection/discover-linked-properties.use-case'

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
  CreateManualPaymentRequestUseCase,
  CancelManualPaymentRequestUseCase,
  InitializePaymentUseCase,
  ProcessPaymentWebhookUseCase,
  ResolveDedicatedAccountUseCase,
  SimulateTransferUseCase,
  GetLandlordPayoutsUseCase,
  GetPayoutBreakdownUseCase,
  GetPmPayoutsUseCase,
  GetBankDetailsUseCase,
  SaveBankDetailsUseCase,
  GetPmUnresolvedTransactionsUseCase,
} from './use-cases/payments/payment.use-cases'
import { VerifyGatewayTransactionUseCase } from './use-cases/payments/verify-transaction.use-case'
import { DistributePaymentAllocationsUseCase } from './use-cases/payments/distribute-allocations.use-case'
import { SyncPmPaymentStatusUseCase } from './use-cases/payments/sync-pm-status.use-case'
import { SettlePropertyBalanceUseCase } from './use-cases/payments/settle-property.use-case'
import { HandlePaymentOverpaymentUseCase } from './use-cases/payments/handle-overpayment.use-case'
import { ProcessHourlySettlementsUseCase } from './use-cases/payments/settlement-cron.use-case'
import { AddManualAccountUseCase, UploadProofOfPaymentUseCase, ReviewManualPaymentUseCase, GetPaymentProofUploadUrlUseCase, GetPaymentProofUseCase, DeletePaymentProofUseCase } from './use-cases/payments/manual-payment.use-cases'
import { GetPendingManualPaymentsUseCase } from './use-cases/payments/get-pending-manual-payments.use-case'

import { UploadContractUseCase } from './use-cases/contracts/upload-contract.use-case'
import { GetContractUploadUrlUseCase } from './use-cases/contracts/get-contract-upload-url.use-case'
import { GetContractsUseCase } from './use-cases/contracts/get-contracts.use-case'
import { DeleteContractUseCase } from './use-cases/contracts/delete-contract.use-case'
import { DownloadContractUseCase } from './use-cases/contracts/download-contract.use-case'

import { CreateSupportTicketUseCase } from './use-cases/support/create-support-ticket.use-case'
import { GetUserTicketsUseCase } from './use-cases/support/get-user-tickets.use-case'
import { GetAllTicketsUseCase } from './use-cases/support/get-all-tickets.use-case'
import { ResolveTicketUseCase } from './use-cases/support/resolve-ticket.use-case'
import { RegisterDeviceTokenUseCase, UnregisterDeviceTokenUseCase, SendPushToUserUseCase } from './use-cases/push/push.use-cases'
import { PushNotificationService } from '../shared/infrastructure/common/push-notification.service'
import { PmPaymentNotificationHandler } from './events/handlers/pm-payment-notification.handler'
import { TenantSyncHandler } from './events/handlers/tenant-sync.handler'
import { PrismaDeviceTokenRepository } from '../shared/infrastructure/prisma/repositories/prisma-device-token.repository'
import { NotificationService } from '../shared/infrastructure/common/notification.service'
import { GoogleAnalyticsService } from '../shared/infrastructure/common/google-analytics.service'

const UseCases = [
  DeleteAdminUseCase,
  GetAdminsUseCase,
  CreateAdminUseCase,
  DemoteAdminUseCase,
  PromoteAdminUseCase,
  ChangeAdminPasswordUseCase,
  SearchUsersUseCase,
  GetAdminUserDetailUseCase,
  GetAdminPmDetailUseCase,
  GetAppActivityLogsUseCase,
  GetInternalAccountsUseCase,
  ToggleInternalAccountUseCase,
  SyncTenantUseCase,
  UpdateAdminUserUseCase,
  UpdateAdminPmUseCase,
  SendAdminNotificationUseCase,
  GetFeeOverridesUseCase,
  UpsertFeeOverrideUseCase,
  DeleteFeeOverrideUseCase,
  SearchFeeTargetsUseCase,
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
  GetPerformanceMetricsUseCase,
  GetRevenueMetricsUseCase,
  GetWaitlistMetricsUseCase,
  GetSignedUpMetricsUseCase,
  GetInvitedMetricsUseCase,
  GetPmMetricsUseCase,
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
  EmailBatchRetryManager,
  RetryBatchEmailsUseCase,
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
  VerifyBvnUseCase,
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
  ResolveExternalPendingRefundUseCase,
  AddPropertyUseCase,
  RenewPropertyUseCase,
  CancelExternalPaymentRequestUseCase,
  UpdateExternalPaymentRequestUseCase,
  ProcessScheduledExternalPaymentRequestsUseCase,
  GetCredibilityRequestDetailsUseCase,
  FulfillCredibilityRequestUseCase,
  GetPendingPaymentsUseCase,
  ResolveSubaccountUseCase,
  GetPropertyBalanceUseCase,
  RentReminderWorkflowUseCase,
  DeactivateAnnouncementsUseCase,
  InitializePaymentUseCase,
  ProcessPaymentWebhookUseCase,
  ResolveDedicatedAccountUseCase,
  SimulateTransferUseCase,
  GetPayoutBreakdownUseCase,
  GetPmPayoutsUseCase,
  GetPmUnresolvedTransactionsUseCase,
  ResolvePendingRefundUseCase,
  GetBankDetailsUseCase,
  SaveBankDetailsUseCase,

  UploadContractUseCase,
  GetContractUploadUrlUseCase,
  GetContractsUseCase,
  DeleteContractUseCase,
  DownloadContractUseCase,

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
  UploadPmAvatarUseCase,
  GetPmLetterheadUploadUrlUseCase,
  UploadPmLetterheadUseCase,
  CreatePropertyUseCase,
  UpdatePropertyUseCase,
  DeletePropertyUseCase,
  GetPmPropertiesUseCase,
  GetPmDashboardSummaryUseCase,
  GetPmPropertyUseCase,
  BulkCreateUnitsUseCase,
  GetPmUnitsUseCase,
  GetUnitUseCase,
  UpdateUnitUseCase,
  DeleteUnitUseCase,
  GetUnitPaymentsUseCase,
  AddUnitPaymentUseCase,
  GetPropertyImageUploadUrlUseCase,
  GetPmTenantsUseCase,
  InviteTenantUseCase,
  CreateTenantUseCase,
  GetTenantUseCase,
  AssignTenantToUnitUseCase,
  UpdateTenantUseCase,
  SyncUnitToUpwardUseCase,
  CreatePmPaymentRequestUseCase,
  GetPmPaymentRequestsUseCase,
  GetPmPaymentRequestUseCase,
  ResendPmPaymentRequestUseCase,
  UpdatePmPaymentRequestUseCase,
  CancelPmPaymentRequestUseCase,
  ProcessScheduledPmPaymentRequestsUseCase,
  GetPmDocumentsUseCase,
  GetTenantUploadedDocumentsUseCase,
  SaveDocumentTemplateUseCase,
  SendDocumentUseCase,
  GenerateDocumentPdfUseCase,
  SendToTenantVaultUseCase,
  GetPendingCredibilityRequestsUseCase,
  BulkCreateTenantRecordsUseCase,
  BulkInviteTenantsUseCase,
  GetPendingJoinRequestsUseCase,
  DismissJoinRequestUseCase,
  ResolveDuplicateJoinRequestUseCase,
  BulkFullImportUseCase,
  SendLandlordReportUseCase,
  GetLandlordReportsUseCase,
  GetLandlordReportUseCase,
  PmBulkRentReminderUseCase,
  UpdateRentPaymentUseCase,
  CreateManualPaymentRequestUseCase,
  CancelManualPaymentRequestUseCase,
  RequestDataDeletionUseCase,
  SubmitFeedbackUseCase,
  InviteTeamMemberUseCase,
  GetTeamMembersUseCase,
  UpdateTeamMemberPermissionsUseCase,
  RevokeTeamMemberUseCase,
  BulkAddRentHistoryUseCase,
  MarkCredibilityRequestDoneUseCase,
  GetLandlordPortfolioUseCase,
  LandlordChangePasswordUseCase,
  GetPmLandlordsUseCase,
  GetLandlordPropertyDetailsUseCase,
  LandlordService,
  ActivityLogService,
  UnifiedReminderService,
  VerifyGatewayTransactionUseCase,
  DistributePaymentAllocationsUseCase,
  SyncPmPaymentStatusUseCase,
  SettlePropertyBalanceUseCase,
  HandlePaymentOverpaymentUseCase,
  ProcessHourlySettlementsUseCase,
  AddManualAccountUseCase,
  UploadProofOfPaymentUseCase,
  ReviewManualPaymentUseCase,
  GetPaymentProofUploadUrlUseCase,
  GetPaymentProofUseCase,
  DeletePaymentProofUseCase,
  GetPendingManualPaymentsUseCase,
  ResolvePendingRefundUseCase,
  GetPmUnresolvedTransactionsUseCase,
  RejectCredibilityRequestUseCase,
  VerifyPmEmailUseCase,
  ConfirmPmConnectionUseCase,
  InvitePmUseCase,
  SubmitUnitRequestUseCase,
  DiscoverLinkedPropertiesUseCase,
  GetPmNotificationsUseCase,
  MarkPmNotificationReadUseCase,
  MarkAllPmNotificationsReadUseCase,
  GetUnreadPmPopupsUseCase,
  GetAdminBlogPostsUseCase,
  GetPublicBlogPostsUseCase,
  GetPublicBlogPostBySlugUseCase,
  CreateBlogPostUseCase,
  UpdateBlogPostUseCase,
  PublishBlogPostUseCase,
  UnpublishBlogPostUseCase,
  DeleteBlogPostUseCase,
  UploadBlogImageUseCase,
]

import { SmsModule } from '../shared/infrastructure/sms/sms.module'
import { WhatsappModule } from '../shared/infrastructure/whatsapp/whatsapp.module'

@Module({
  imports: [S3Module, ReceiptModule, KYCModule, AuthModule, SmsModule, WhatsappModule],
  providers: [
    AdminAuditEventHandler,
    EmailLogEventHandler,
    InteractionHandler,
    PaymentWebhookHandler,
    CredibilityWebhookHandler,
    WebhookService,
    BulkInviteService,
    PmPaymentNotificationHandler,
    TenantSyncHandler,
    PaymentPostActionsHandler,

    EncryptionService,
    PushNotificationService,
    NotificationService,
    GoogleAnalyticsService,
    PrismaDeviceTokenRepository,
    UnifiedReminderService,
    PaymentConfigurationService,
    ...UseCases,
  ],
  exports: [WebhookService, BulkInviteService, EncryptionService, PushNotificationService, NotificationService, GoogleAnalyticsService, PrismaDeviceTokenRepository, UnifiedReminderService, PaymentConfigurationService, ...UseCases],

})
export class ApplicationModule { }
