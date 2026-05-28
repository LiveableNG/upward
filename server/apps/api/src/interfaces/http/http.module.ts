import { Module } from '@nestjs/common'
import { ApplicationModule } from '../../application/application.module'
import { AuthModule } from '../../application/auth/auth.module'
import { AdminLogModule } from '../../shared/infrastructure/admin-log/admin-log.module'
import { S3Module } from '../../shared/infrastructure/common/s3/s3.module'
import { AdminAuthController } from './admin/admin-auth.controller'
import { AdminFeesController } from './admin/admin-fees.controller'
import { AdminLogController } from './admin/admin-log.controller'
import { AdminController } from './admin/admin.controller'
import { CampaignController } from './admin/campaign.controller'
import { FairnessStoryController } from './public/fairness-story.controller'
import { WaitlistController } from './public/waitlist.controller'
import { LocationsController } from './public/locations.controller'
import { UserController } from './user/user.controller'
import { PaymentsController } from './public/payments.controller'
import { AdminAnnouncementsController } from './admin/announcements.controller'
import { UserNotificationsController } from './user/notifications.controller'
import { ContractController } from './user/contract.controller'
import { PublicProfileController } from './public/public-profile.controller'
import { UserSupportController } from './user/support.controller'
import { AdminSupportController } from './admin/support.controller'
import { ExternalInviteController } from './external/external-invite.controller'
import { InviteController } from './public/invite.controller'
import { PlatformAdminController } from './external/platform-invite.controller'
import { ExternalPaymentController } from './external/external-payment.controller'
import { PublicCredibilityController } from './public/credibility.controller'
import { ExternalCredibilityController } from './external/external-credibility.controller'
import { WellKnownController } from './public/well-known.controller'
import { PublicUserController } from './public/user-data.controller'
import { FeedbackController } from './public/feedback.controller'
import { WebhookAdminController } from './admin/webhook-admin.controller'
import { PmVerificationAdminController } from './admin/pm-verification-admin.controller'
import { PmAuthController } from './pm/pm-auth.controller'
import { PmProfileController } from './pm/pm-profile.controller'
import { PmEmailSettingController } from './pm/pm-email-setting.controller'
import { PmLetterheadController } from './pm/pm-letterhead.controller'
import { PmPropertyController } from './controllers/pm-property.controller'
import { PmActivityController } from './controllers/pm-activity.controller'
import { PmTenantController } from './controllers/pm-tenant.controller'
import { PmCredibilityController } from './controllers/pm-credibility.controller'
import { InternalScoreController } from './internal/internal-score.controller'
import { InternalPaymentsController } from './internal/internal-payments.controller'
import { PmDocumentController } from './controllers/pm-document.controller'
import { LandlordAuthController } from './landlord/landlord-auth.controller'
import { LandlordPortfolioController } from './landlord/landlord-portfolio.controller'
import { LandlordManagementController } from './landlord/landlord-management.controller'
import { CronController } from './public/cron.controller'
import { TenantPmConnectionController } from './user/tenant-pm-connection.controller'
import { PublicTrackingController } from './public/public-tracking.controller'
import { AppActivityLogController } from './admin/app-activity-log.controller'
import { FeedbackAdminController } from './admin/feedback-admin.controller'
import { DevEmailAdminController } from './admin/dev-email-admin.controller'

@Module({
  imports: [ApplicationModule, AuthModule, AdminLogModule, S3Module],
  controllers: [
    AdminAuthController,
    AdminFeesController,
    AdminLogController,
    AdminController,
    CampaignController,
    FairnessStoryController,
    WaitlistController,
    LocationsController,
    UserController,
    PaymentsController,
    AdminAnnouncementsController,
    UserNotificationsController,
    ContractController,
    PublicProfileController,
    ExternalInviteController,
    InviteController,
    PlatformAdminController,
    ExternalPaymentController,
    UserSupportController,
    AdminSupportController,
    PublicCredibilityController,
    ExternalCredibilityController,
    WellKnownController,
    WebhookAdminController,
    PmVerificationAdminController,
    PmAuthController,
    PmProfileController,
    PmEmailSettingController,
    PmLetterheadController,
    PmPropertyController,
    PmActivityController,
    PmTenantController,
    PmCredibilityController,
    InternalScoreController,
    InternalPaymentsController,
    PmDocumentController,
    PublicUserController,
    FeedbackController,
    LandlordAuthController,
    LandlordPortfolioController,
    LandlordManagementController,
    CronController,
    TenantPmConnectionController,
    PublicTrackingController,
    AppActivityLogController,
    FeedbackAdminController,
    DevEmailAdminController,
  ],
})
export class HttpModule {}
