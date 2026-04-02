import { Module } from '@nestjs/common'
import { AdminAuditEventHandler } from './events/handlers/admin-audit.handler'

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

// Services (Manager Services that haven't been split into Use Cases yet)
import { CampaignService } from './services/campaign.service'
import { CampaignCronTask } from './services/campaign.cron'
import { FairnessStoryService } from './services/fairness-story.service'
import { WaitlistService } from './services/waitlist.service'

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
]

const Services = [CampaignService, CampaignCronTask, FairnessStoryService, WaitlistService]

@Module({
  providers: [AdminAuditEventHandler, ...UseCases, ...Services],
  exports: [...UseCases, ...Services],
})
export class ApplicationModule {}
