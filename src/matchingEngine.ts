export type CompatibilityDimensionKey =
  | 'social_lifestyle'
  | 'cleanliness'
  | 'noise_tolerance'
  | 'study_environment'
  | 'guests_hosting'
  | 'communication_style'
  | 'daily_routine'
  | 'shared_living'
  | 'cooking_food'
  | 'independence_communal';

export interface CompatibilityDimension {
  key: CompatibilityDimensionKey;
  label: string;
  weight: number;
}

export interface CompatibilityProfile {
  dimensions: Record<CompatibilityDimensionKey, number>;
  dealBreakers: Record<string, string | number>;
  housingPreferences: Record<string, string | number>;
}

export interface ListingLike {
  tags?: Record<string, number>;
  budget?: string | number;
  moveIn?: string;
  institution?: string;
  compatibilityProfile?: Partial<Record<CompatibilityDimensionKey, number>>;
  dealBreakers?: Record<string, string | number>;
  housingPreferences?: Record<string, string | number>;
  [key: string]: unknown;
}

export interface MatchingConfig {
  lifestyleWeight: number;
  housingWeight: number;
  dimensionScale: number;
  minScore: number;
  maxScore: number;
  dimensions: CompatibilityDimension[];
}

export interface MatchScore {
  score: number;
  lifestyleScore: number;
  housingScore: number;
  breakdown: {
    lifestyle: Record<CompatibilityDimensionKey, number>;
    housing: Record<string, number>;
  };
}

export const DEFAULT_DIMENSIONS: CompatibilityDimension[] = [
  { key: 'social_lifestyle', label: 'Social lifestyle', weight: 1.15 },
  { key: 'cleanliness', label: 'Cleanliness', weight: 1.2 },
  { key: 'noise_tolerance', label: 'Noise tolerance', weight: 1.1 },
  { key: 'study_environment', label: 'Study environment', weight: 1.1 },
  { key: 'guests_hosting', label: 'Guests & hosting', weight: 1.0 },
  { key: 'communication_style', label: 'Communication', weight: 1.05 },
  { key: 'daily_routine', label: 'Daily routine', weight: 1.0 },
  { key: 'shared_living', label: 'Shared living', weight: 1.05 },
  { key: 'cooking_food', label: 'Cooking & food', weight: 0.95 },
  { key: 'independence_communal', label: 'Independence', weight: 1.0 },
];

export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  lifestyleWeight: 0.7,
  housingWeight: 0.3,
  dimensionScale: 5,
  minScore: 15,
  maxScore: 98,
  dimensions: DEFAULT_DIMENSIONS,
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDimensionSimilarity(userValue: number, listingValue: number, scale: number) {
  const difference = Math.abs(userValue - listingValue);
  return clamp(1 - difference / scale);
}

function parseBudgetValue(value: unknown): number {
  if (typeof value === 'number') return value;
  if (!value) return 260;
  const matches = String(value).match(/\d+/g);
  if (!matches) return 260;
  const parsed = matches.map(Number);
  return Math.max(...parsed);
}

function parseMoveInWindow(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value === 'now' || value === 'Now') return 0;
  if (value === 'this month') return 1;
  if (value === 'next month') return 2;
  return 3;
}

function matchesDealBreakers(userProfile: CompatibilityProfile, listingProfile: CompatibilityProfile) {
  const smokingUser = String(userProfile.dealBreakers.smoking ?? 'neutral');
  const smokingListing = String(listingProfile.dealBreakers.smoking ?? 'neutral');
  const petsUser = String(userProfile.dealBreakers.pets ?? 'neutral');
  const petsListing = String(listingProfile.dealBreakers.pets ?? 'neutral');

  if (smokingUser === 'smoke_free' && ['smoking_ok', 'any'].includes(smokingListing)) {
    return false;
  }

  if (smokingUser === 'outside_only' && smokingListing === 'any') {
    return false;
  }

  if (petsUser === 'no_pets' && petsListing === 'pet_friendly') {
    return false;
  }

  return true;
}

export function evaluateLifestyleCompatibility(
  userProfile: CompatibilityProfile,
  listingProfile: CompatibilityProfile,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
) {
  const breakdown: Record<CompatibilityDimensionKey, number> = {} as Record<CompatibilityDimensionKey, number>;
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const dimension of config.dimensions) {
    const userValue = userProfile.dimensions[dimension.key] ?? 3;
    const listingValue = listingProfile.dimensions[dimension.key] ?? 3;
    const similarity = normalizeDimensionSimilarity(userValue, listingValue, config.dimensionScale);
    breakdown[dimension.key] = similarity;
    weightedTotal += similarity * dimension.weight;
    totalWeight += dimension.weight;
  }

  return {
    score: totalWeight ? weightedTotal / totalWeight : 0.5,
    breakdown,
  };
}

export function evaluateHousingCompatibility(
  userProfile: CompatibilityProfile,
  listingProfile: CompatibilityProfile,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
) {
  const userBudget = Number(userProfile.housingPreferences.budgetMax ?? 260);
  const listingBudget = Number(listingProfile.housingPreferences.budgetMax ?? 260);

  const budgetFit = listingBudget <= userBudget
    ? 1
    : clamp(1 - (listingBudget - userBudget) / 220);

  const userMoveIn = Number(userProfile.housingPreferences.moveInWindow ?? 2);
  const listingMoveIn = Number(listingProfile.housingPreferences.moveInWindow ?? 2);
  const moveFit = clamp(1 - Math.abs(userMoveIn - listingMoveIn) / 4);

  const locationFit = typeof userProfile.housingPreferences.location === 'string' && typeof listingProfile.housingPreferences.location === 'string'
    ? (userProfile.housingPreferences.location === listingProfile.housingPreferences.location ? 1 : 0.5)
    : 0.8;

  const score = (budgetFit * 0.6) + (moveFit * 0.25) + (locationFit * 0.15);

  return {
    score,
    breakdown: {
      budget: budgetFit,
      moveIn: moveFit,
      location: locationFit,
    },
  };
}

export function scoreCompatibility(
  userProfile: CompatibilityProfile,
  listingProfile: CompatibilityProfile,
  config: MatchingConfig = DEFAULT_MATCHING_CONFIG,
): MatchScore | null {
  if (!matchesDealBreakers(userProfile, listingProfile)) {
    return null;
  }

  const lifestyle = evaluateLifestyleCompatibility(userProfile, listingProfile, config);
  const housing = evaluateHousingCompatibility(userProfile, listingProfile, config);

  const score = Math.round(
    100 * ((lifestyle.score * config.lifestyleWeight) + (housing.score * config.housingWeight)),
  );

  return {
    score: clamp(score / 100, 0, 1) * 100,
    lifestyleScore: lifestyle.score,
    housingScore: housing.score,
    breakdown: {
      lifestyle: lifestyle.breakdown,
      housing: housing.breakdown,
    },
  };
}

export function deriveListingProfile(listing: ListingLike): CompatibilityProfile {
  const tags = listing.tags || {};
  const dimensionDefaults = {
    social_lifestyle: tags.social ? 4 : tags.chill ? 2 : 3,
    cleanliness: tags.tidy ? 4 : tags.chill ? 2 : 3,
    noise_tolerance: tags.quiet ? 4 : tags.social ? 2 : 3,
    study_environment: tags.quiet ? 4 : tags.social ? 2 : 3,
    guests_hosting: tags.social ? 4 : 2,
    communication_style: tags.tidy ? 4 : 3,
    daily_routine: tags.early ? 4 : tags.night ? 2 : 3,
    shared_living: tags.social ? 4 : tags.chill ? 2 : 3,
    cooking_food: 3,
    independence_communal: tags.chill ? 4 : tags.social ? 2 : 3,
  };

  const explicitDimensions = listing.compatibilityProfile || {};
  const dimensions = Object.fromEntries(
    Object.entries(dimensionDefaults).map(([key, value]) => [key, explicitDimensions[key as CompatibilityDimensionKey] ?? value]),
  ) as Record<CompatibilityDimensionKey, number>;

  return {
    dimensions,
    dealBreakers: {
      smoking: (listing.dealBreakers?.smoking as string) ?? 'neutral',
      pets: (listing.dealBreakers?.pets as string) ?? 'neutral',
    },
    housingPreferences: {
      budgetMax: (listing.housingPreferences?.budgetMax as string | number) ?? parseBudgetValue(listing.budget),
      moveInWindow: (listing.housingPreferences?.moveInWindow as string | number) ?? parseMoveInWindow(listing.moveIn),
      location: (listing.housingPreferences?.location as string) ?? (listing.institution as string) ?? '',
    },
  };
}
