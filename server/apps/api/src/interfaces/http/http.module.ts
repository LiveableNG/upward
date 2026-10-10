import { Module } from '@nestjs/common'
import { ApplicationModule } from '../../application/application.module'
import { AuthModule } from '../../application/auth/auth.module'
import { AdminLogModule } from '../../shared/infrastructure/admin-log/admin-log.module'
import { S3Module } from '../../shared/infrastructure/common/s3/s3.module'
import { SchedulingModule } from '../../scheduling/scheduling.module'
import { AdminAuthController } from './admin/admin-auth.controller'
import { AdminFeesController } from './admin/admin-fees.controller'
import { AdminLogController } from './admin/admin-log.controller'
import { AdminController } from './admin/admin.controller'
import { CampaignController } from './admin/campaign.controller'
import { FairnessStoryController } from './public/fairness-story.controller'
import { WaitlistController } from './public/waitlist.controller'
import { EarlyAccessController } from './public/early-access.controller'
import { EarlyAccessAdminController } from './admin/early-access-admin.controller'
import { UniversityApplicationController } from './public/university-application.controller'
import { UniversityApplicationAdminController } from './admin/university-application-admin.controller'
import { UniversityTrafficController } from './public/university-traffic.controller'
import { UniversityTrafficAdminController } from './admin/university-traffic-admin.controller'
import { UniversityReferralController } from './public/university-referral.controller'
import { UniversityReferralAdminController } from './admin/university-referral-admin.controller'
import { UniversityHireController } from './public/university-hire.controller'
import { UniversityHireAdminController } from './admin/university-hire-admin.controller'
import { LocationsController } from './public/locations.controller'
import { UserController } from './user/user.controller'
import { WalletController } from './user/wallet.controller'
import { PaymentsController } from './public/payments.controller'
import { AdminAnnouncementsController } from './admin/announcements.controller'
import { AdminSettlementsController } from './admin/admin-settlements.controller'
import { UserNotificationsController } from './user/notifications.controller'
import { ContractController } from './user/contract.controller'
import { PublicProfileController } from './public/public-profile.controller'
import { UserSupportController } from './user/support.controller'
import { AdminSupportController } from './admin/support.controller'
import { ExternalInviteController } from './external/external-invite.controller'
import { InviteController } from './public/invite.controller'
import { PlatformAdminController } from './external/platform-invite.controller'
import { ExternalPaymentController } from './external/external-payment.controller'
import { PlatformPaymentProofController } from './external/platform-payment-proof.controller'
import { PlatformPropertyController } from './external/platform-property.controller'
import { PublicCredibilityController } from './public/credibility.controller'
import { ExternalCredibilityController } from './external/external-credibility.controller'
import { WellKnownController } from './public/well-known.controller'
import { PublicUserController } from './public/user-data.controller'
import { FeedbackController } from './public/feedback.controller'
import { HomeRequestController } from './public/home-request.controller'
import { PmHomeRequestController } from './controllers/pm-home-request.controller'
import { WebhookAdminController } from './admin/webhook-admin.controller'
import { PmVerificationAdminController } from './admin/pm-verification-admin.controller'
import { PmAuthController } from './pm/pm-auth.controller'
import { PmEmployeeAuthController } from './pm/pm-employee-auth.controller'
import { PmProfileController } from './pm/pm-profile.controller'
import { PmEmailSettingController } from './pm/pm-email-setting.controller'
import { PmReceiptSettingController } from './pm/pm-receipt-setting.controller'
import { PmLetterheadController } from './pm/pm-letterhead.controller'
import { PmSignatureController } from './pm/pm-signature.controller'
import { PmSettlementAccountController } from './pm/pm-settlement-account.controller'
import { PmSplitProfileController } from './pm/pm-split-profile.controller'
import { PmPropertyController } from './controllers/pm-property.controller'
import { PmActivityController } from './controllers/pm-activity.controller'
import { PmTenantController } from './controllers/pm-tenant.controller'
import { PmCredibilityController } from './controllers/pm-credibility.controller'
import { InternalScoreController } from './internal/internal-score.controller'
import { InternalPaymentsController } from './internal/internal-payments.controller'
import { PmDocumentController } from './controllers/pm-document.controller'
import { PmNotificationController } from './controllers/pm-notification.controller'
import { LandlordAuthController } from './landlord/landlord-auth.controller'
import { LandlordPortfolioController } from './landlord/landlord-portfolio.controller'
import { LandlordManagementController } from './landlord/landlord-management.controller'
import { CronController } from './public/cron.controller'
import { TenantPmConnectionController } from './user/tenant-pm-connection.controller'
import { TenantAppController } from './user/tenant-app.controller'
import { PublicTrackingController } from './public/public-tracking.controller'
import { EmailTrackingController } from './public/email-tracking.controller'
import { EmailClickTrackingController } from './public/email-click-tracking.controller'
import { AdminEmailTrackingController } from './admin/admin-email-tracking.controller'
import { WhatsappWebhookController } from './public/whatsapp-webhook.controller'
import { AppActivityLogController } from './admin/app-activity-log.controller'
import { FeedbackAdminController } from './admin/feedback-admin.controller'
import { DevEmailAdminController } from './admin/dev-email-admin.controller'
import { AdminLoginSessionsController } from './admin/admin-login-sessions.controller'
import { AdminBlogPostsController } from './admin/blog-posts.controller'
import { AdminAreaPriceGuideController } from './admin/area-price-guide.controller'
import { PublicBlogController } from './public/blog.controller'
import { ManualPaymentsController } from './controllers/manual-payments.controller'
import { AdminWhatsappSequenceController } from './admin/whatsapp-sequence.controller'
import { AdminEmailSequenceController } from './admin/email-sequence.controller'
import { PublicDocumentController } from './public/public-document.controller'
import { SubscriptionController } from './controllers/subscription.controller'
import {
  PmBulkImportController,
  AdminBulkImportController,
} from './controllers/bulk-import.controller'
import { PmAiDocumentController } from './controllers/pm-ai-document.controller'
import { DemoRequestController } from './public/demo-request.controller'
import { DemoRequestAdminController } from './admin/demo-request-admin.controller'
import { HomeRequestAdminController } from './admin/home-request-admin.controller'
import { AdminAllianceController } from './admin/admin-alliance.controller'
import { PmAllianceProfileController } from './pm/pm-alliance-profile.controller'
import { PmAllianceListingController } from './pm/pm-alliance-listing.controller'
import { PmAllianceDiscoverController } from './pm/pm-alliance-discover.controller'
import { PmAllianceReferralController } from './pm/pm-alliance-referral.controller'
import { PmAllianceCommissionController } from './pm/pm-alliance-commission.controller'
import { PmAllianceRatingController } from './pm/pm-alliance-rating.controller'
import { PublicAllianceMarketplaceController } from './public/public-alliance.controller'
import { UserAllianceController } from './user/user-alliance.controller'

import { SubscriptionModule } from '../../domains/subscription/subscription.module'
import { NotificationsGateway } from '../websockets/notifications.gateway'

@Module({
  imports: [
    ApplicationModule,
    AuthModule,
    AdminLogModule,
    S3Module,
    SchedulingModule,
    SubscriptionModule,
  ],
  providers: [NotificationsGateway],
  controllers: [
    PmAiDocumentController,
    SubscriptionController,
    ManualPaymentsController,
    AdminAuthController,
    AdminFeesController,
    AdminLogController,
    AdminController,
    CampaignController,
    FairnessStoryController,
    WaitlistController,
    EarlyAccessController,
    EarlyAccessAdminController,
    UniversityApplicationController,
    UniversityApplicationAdminController,
    UniversityTrafficController,
    UniversityTrafficAdminController,
    UniversityReferralController,
    UniversityReferralAdminController,
    UniversityHireController,
    UniversityHireAdminController,
    LocationsController,
    UserController,
    WalletController,
    PaymentsController,
    AdminAnnouncementsController,
    AdminSettlementsController,
    UserNotificationsController,
    ContractController,
    PublicProfileController,
    ExternalInviteController,
    InviteController,
    PlatformAdminController,
    ExternalPaymentController,
    PlatformPaymentProofController,
    PlatformPropertyController,
    UserSupportController,
    AdminSupportController,
    PublicCredibilityController,
    ExternalCredibilityController,
    WellKnownController,
    WebhookAdminController,
    PmVerificationAdminController,
    PmAuthController,
    PmEmployeeAuthController,
    PmProfileController,
    PmEmailSettingController,
    PmReceiptSettingController,
    PmLetterheadController,
    PmSignatureController,
    PmSettlementAccountController,
    PmSplitProfileController,
    PmPropertyController,
    PmActivityController,
    PmTenantController,
    PmCredibilityController,
    InternalScoreController,
    InternalPaymentsController,
    PmDocumentController,
    PmNotificationController,
    PublicUserController,
    FeedbackController,
    HomeRequestController,
    PmHomeRequestController,
    LandlordAuthController,
    LandlordPortfolioController,
    LandlordManagementController,
    CronController,
    TenantPmConnectionController,
    TenantAppController,
    PublicTrackingController,
    EmailTrackingController,
    EmailClickTrackingController,
    AdminEmailTrackingController,
    WhatsappWebhookController,
    AppActivityLogController,
    FeedbackAdminController,
    DevEmailAdminController,
    AdminLoginSessionsController,
    AdminBlogPostsController,
    AdminAreaPriceGuideController,
    PublicBlogController,
    AdminWhatsappSequenceController,
    AdminEmailSequenceController,
    PublicDocumentController,
    PmBulkImportController,
    AdminBulkImportController,
    DemoRequestController,
    DemoRequestAdminController,
    HomeRequestAdminController,
    AdminAllianceController,
    PmAllianceProfileController,
    PmAllianceListingController,
    PmAllianceDiscoverController,
    PmAllianceReferralController,
    PmAllianceCommissionController,
    PmAllianceRatingController,
    PublicAllianceMarketplaceController,
    UserAllianceController,
  ],
})
export class HttpModule {}
