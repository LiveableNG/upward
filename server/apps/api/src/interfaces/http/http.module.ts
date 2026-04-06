import { Module } from '@nestjs/common'
import { ApplicationModule } from '@application/application.module'
import { AuthModule } from '@application/auth/auth.module'
import { AdminLogModule } from '@shared/infrastructure/admin-log/admin-log.module'
import { AdminAuthController } from './admin/admin-auth.controller'
import { AdminLogController } from './admin/admin-log.controller'
import { AdminController } from './admin/admin.controller'
import { CampaignController } from './admin/campaign.controller'
import { FairnessStoryController } from './public/fairness-story.controller'
import { WaitlistController } from './public/waitlist.controller'
import { LocationsController } from './public/locations.controller'
import { TenantController } from './tenant/tenant.controller'
import { PaymentsController } from './public/payments.controller'
import { AdminAnnouncementsController } from './admin/announcements.controller'
import { TenantNotificationsController } from './tenant/notifications.controller'
import { PublicProfileController } from './public/public-profile.controller'
import { SavingsController } from './tenant/savings.controller'
import { WalletController } from './tenant/wallet.controller'

@Module({
  imports: [ApplicationModule, AuthModule, AdminLogModule],
  controllers: [
    AdminAuthController,
    AdminLogController,
    AdminController,
    CampaignController,
    FairnessStoryController,
    WaitlistController,
    LocationsController,
    TenantController,
    PaymentsController,
    AdminAnnouncementsController,
    TenantNotificationsController,
    PublicProfileController,
    SavingsController,
    WalletController,
  ],
})
export class HttpModule {}
