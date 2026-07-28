import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../../../domains/subscription/subscription.service';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: FeatureKey) => SetMetadata(FEATURE_KEY, feature);
