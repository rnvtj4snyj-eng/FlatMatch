export const DEFAULT_DIMENSIONS = [
  { key: 'life_stage', label: 'Age / life stage', weight: 1.3 },
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

export const DEFAULT_MATCHING_CONFIG = {
  lifestyleWeight: 0.7,
  housingWeight: 0.3,
  dimensionScale: 5,
  minScore: 15,
  maxScore: 98,
  dimensions: DEFAULT_DIMENSIONS,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDimensionSimilarity(userValue, listingValue, scale) {
  const difference = Math.abs(userValue - listingValue);
  return clamp(1 - difference / scale);
}

function parseBudgetValue(value) {
  if (typeof value === 'number') return value;
  if (!value) return 260;
  const matches = String(value).match(/\d+/g);
  if (!matches) return 260;
  const parsed = matches.map(Number);
  return Math.max(...parsed);
}

function parseMoveInWindow(value) {
  if (typeof value === 'number') return value;
  if (value === 'now' || value === 'Now') return 0;
  if (value === 'this month') return 1;
  if (value === 'next month') return 2;
  return 3;
}

function matchesDealBreakers(userProfile, listingProfile) {
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

export function evaluateLifestyleCompatibility(userProfile, listingProfile, config = DEFAULT_MATCHING_CONFIG) {
  const breakdown = {};
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

export function evaluateHousingCompatibility(userProfile, listingProfile, config = DEFAULT_MATCHING_CONFIG) {
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

export function scoreCompatibility(userProfile, listingProfile, config = DEFAULT_MATCHING_CONFIG) {
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

export function deriveListingProfile(listing) {
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

  const fullQuizProfile = listing.fullQuizProfile?.dimensions
    ? listing.fullQuizProfile
    : listing.fullQuizProfile || null;
  const miniQuizProfile = listing.miniQuizProfile?.dimensions
    ? listing.miniQuizProfile
    : null;
  const explicitDimensions = listing.compatibilityProfile || {};

  const dimensions = { ...dimensionDefaults };

  if (fullQuizProfile?.dimensions) {
    Object.assign(dimensions, fullQuizProfile.dimensions);
  } else if (miniQuizProfile?.dimensions) {
    // blend ALL dimension keys that the mini quiz produced a value for,
    // at 80% mini-quiz / 20% tag-inferred. Any dimension the mini quiz
    // didn't cover falls back to pure tag-inference automatically.
    Object.entries(dimensionDefaults).forEach(([key, tagValue]) => {
      const miniValue = miniQuizProfile.dimensions[key];
      if (typeof miniValue === 'number') {
        dimensions[key] = Number(((miniValue * 0.8) + (tagValue * 0.2)).toFixed(1));
      }
    });
  } else if (explicitDimensions) {
    Object.entries(explicitDimensions).forEach(([key, value]) => {
      if (value != null) dimensions[key] = value;
    });
  }

  return {
    dimensions,
    dealBreakers: {
      smoking: (listing.dealBreakers?.smoking) ?? 'neutral',
      pets: (listing.dealBreakers?.pets) ?? 'neutral',
    },
    housingPreferences: {
      budgetMax: (listing.housingPreferences?.budgetMax) ?? parseBudgetValue(listing.budget),
      moveInWindow: (listing.housingPreferences?.moveInWindow) ?? parseMoveInWindow(listing.moveIn),
      location: (listing.housingPreferences?.location) ?? (listing.institution) ?? '',
    },
  };
}
