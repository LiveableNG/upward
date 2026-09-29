import {
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  ALLIANCE_LISTING_REPOSITORY,
  IAllianceListingRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { ListAllianceListingsQueryDto } from '../dtos/alliance-listing.dto';

@Injectable()
export class ListPmAllianceListingsUseCase {
  constructor(
    @Inject(ALLIANCE_LISTING_REPOSITORY)
    private readonly listingRepo: IAllianceListingRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(query: ListAllianceListingsQueryDto, actor: PmActorContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const { items, total } = await this.listingRepo.findPmListings(actor.ownerPmId, {
      status: query.status,
      targetType: query.targetType,
      sourceType: query.sourceType,
      skip,
      take: limit,
    });

    const signedItems = await Promise.all(
      items.map(async (item) => {
        if (item.media && item.media.length > 0) {
          const signedMedia = await Promise.all(
            item.media.map(async (m) => ({
              ...m,
              publicUrl: await this.s3Service.getDownloadUrl(m.storageKey || m.publicUrl),
            })),
          );
          return { ...item, media: signedMedia };
        }
        return item;
      }),
    );

    return {
      items: signedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
