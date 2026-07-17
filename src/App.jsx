import React, { useState, useMemo, useEffect } from "react";
import { fetchListings, createListing, markListingFilled } from "./listingsService";
import { scoreCompatibility, deriveListingProfile, DEFAULT_MATCHING_CONFIG } from "./matchingEngine.js";
 
/* ---------------------------------------------
   LOCATION DATA
--------------------------------------------- */
 
const NZ_CITIES = {
  christchurch: {
    label: "Christchurch",
    suburbs: [
      { name: "Ilam", distanceKm: 0.5 },
      { name: "Upper Riccarton", distanceKm: 2 },
      { name: "Riccarton", distanceKm: 3 },
      { name: "Fendalton", distanceKm: 3.5 },
      { name: "Bishopdale", distanceKm: 4 },
      { name: "Avonhead", distanceKm: 4 },
      { name: "Merivale", distanceKm: 5 },
      { name: "Addington", distanceKm: 5.5 },
      { name: "Sydenham", distanceKm: 6 },
      { name: "Hornby", distanceKm: 8 },
      { name: "Halswell", distanceKm: 8 },
      { name: "Central City", distanceKm: 6.5 },
      { name: "Sumner", distanceKm: 12 },
      { name: "New Brighton", distanceKm: 12 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
  dunedin: {
    label: "Dunedin",
    suburbs: [
      { name: "North Dunedin", distanceKm: 0.5 },
      { name: "Roslyn", distanceKm: 1.5 },
      { name: "Mornington", distanceKm: 2 },
      { name: "South Dunedin", distanceKm: 2.5 },
      { name: "Caversham", distanceKm: 3 },
      { name: "Wakari", distanceKm: 3 },
      { name: "Maori Hill", distanceKm: 2 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
  wellington: {
    label: "Wellington",
    suburbs: [
      { name: "Kelburn", distanceKm: 0.5 },
      { name: "Aro Valley", distanceKm: 1 },
      { name: "Newtown", distanceKm: 2 },
      { name: "Mount Cook", distanceKm: 1.5 },
      { name: "Island Bay", distanceKm: 4 },
      { name: "Karori", distanceKm: 3 },
      { name: "Johnsonville", distanceKm: 7 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
  auckland: {
    label: "Auckland",
    suburbs: [
      { name: "City Centre", distanceKm: 0.5 },
      { name: "Grafton", distanceKm: 1 },
      { name: "Parnell", distanceKm: 2 },
      { name: "Newmarket", distanceKm: 2.5 },
      { name: "Ponsonby", distanceKm: 2 },
      { name: "Mount Eden", distanceKm: 3 },
      { name: "Epsom", distanceKm: 4 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
  palmerston_north: {
    label: "Palmerston North",
    suburbs: [
      { name: "Fitzherbert", distanceKm: 0.5 },
      { name: "Hokowhitu", distanceKm: 1.5 },
      { name: "Roslyn", distanceKm: 2 },
      { name: "Awapuni", distanceKm: 3 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
  hamilton: {
    label: "Hamilton",
    suburbs: [
      { name: "Hillcrest", distanceKm: 0.5 },
      { name: "Dinsdale", distanceKm: 2 },
      { name: "Chartwell", distanceKm: 3 },
      { name: "Frankton", distanceKm: 4 },
      { name: "Other / not sure yet", distanceKm: null },
    ],
  },
};

const UC_SUBURBS = NZ_CITIES.christchurch.suburbs;

function cityFromInstitution(institutionId) {
  const map = {
    uc: "christchurch",
    lincoln: "christchurch",
    otago: "dunedin",
    vuw: "wellington",
    auckland: "auckland",
    aut: "auckland",
    massey: "palmerston_north",
    waikato: "hamilton",
  };
  return map[institutionId] || "christchurch";
}

function suburbDistance(suburbName, city = "christchurch") {
  const cityData = NZ_CITIES[city];
  if (!cityData) return null;
  const match = cityData.suburbs.find((s) => s.name === suburbName);
  return match ? match.distanceKm : null;
}
 
/* ---------------------------------------------
   QUESTIONNAIRE
--------------------------------------------- */

const COMPATIBILITY_DIMENSIONS = [
  { key: "life_stage", label: "Age / life stage", weight: 1.3 },
  { key: "social_lifestyle", label: "Social lifestyle", weight: 1.15 },
  { key: "cleanliness", label: "Cleanliness", weight: 1.2 },
  { key: "noise_tolerance", label: "Noise tolerance", weight: 1.1 },
  { key: "study_environment", label: "Study environment", weight: 1.1 },
  { key: "guests_hosting", label: "Guests & hosting", weight: 1.0 },
  { key: "communication_style", label: "Communication", weight: 1.05 },
  { key: "daily_routine", label: "Daily routine", weight: 1.0 },
  { key: "shared_living", label: "Shared living", weight: 1.05 },
  { key: "cooking_food", label: "Cooking & food", weight: 0.95 },
  { key: "independence_communal", label: "Independence", weight: 1.0 },
];

const QUESTION_CATEGORIES = {
  social_lifestyle: "Lifestyle",
  cleanliness: "Home habits",
  noise_tolerance: "Home habits",
  study_environment: "Study habits",
  guests_hosting: "Living with others",
  communication_style: "Communication",
  daily_routine: "Routine",
  shared_living: "Shared living",
  cooking_food: "Food & cooking",
  independence_communal: "Independence",
  smoking: "Deal-breakers",
  pets: "Deal-breakers",
  budget: "Housing",
  move_in: "Housing",
};

const QUESTION_TO_CATEGORY = {
  age: "About you",
  dishes: "Home habits",
  noise: "Home habits",
  guests: "Living with others",
  food: "Food & cooking",
  study_week: "Study habits",
  routine: "Routine",
  bills: "Communication",
  privacy: "Independence",
  hosting: "Living with others",
  bathroom: "Home habits",
  smoking: "Deal-breakers",
  pets: "Deal-breakers",
  budget: "Housing",
  move_in: "Housing",
};

const QUESTIONS = [
  {
    id: "dishes",
    text: "How particular are you about a clean kitchen?",
    kind: "dimension",
    dimensions: [
      { key: "cleanliness", weight: 1.2 },
      { key: "communication_style", weight: 0.95 },
    ],
    options: [
      { label: "Very, I like it spotless", scores: { cleanliness: 4, communication_style: 3 } },
      { label: "Fairly, but I'm not fussy about it", scores: { cleanliness: 3, communication_style: 3 } },
      { label: "Not overly, a bit of mess doesn't bother me", scores: { cleanliness: 2, communication_style: 2 } },
      { label: "Not at all, mess doesn't really register", scores: { cleanliness: 1, communication_style: 2 } },
    ],
  },
  {
    id: "noise",
    text: "You have an early start and your flatmates have friends over. How do you feel?",
    kind: "dimension",
    dimensions: [
      { key: "noise_tolerance", weight: 1.15 },
      { key: "study_environment", weight: 1.1 },
      { key: "daily_routine", weight: 1.0 },
    ],
    options: [
      { label: "Please keep it down, I need sleep", scores: { noise_tolerance: 1, study_environment: 4, daily_routine: 4 } },
      { label: "A bit of noise is fine, but not all night", scores: { noise_tolerance: 2, study_environment: 3, daily_routine: 3 } },
      { label: "I’m okay with a lively flat most of the time", scores: { noise_tolerance: 3, study_environment: 2, daily_routine: 2 } },
      { label: "I’m not bothered by noise at all", scores: { noise_tolerance: 4, study_environment: 1, daily_routine: 1 } },
    ],
  },
  {
  id: "guests",
  text: "How do you feel about flatmates having a partner over regularly?",
  kind: "dimension",
  dimensions: [
    { key: "guests_hosting", weight: 1.1 },
    { key: "social_lifestyle", weight: 1.0 },
    { key: "noise_tolerance", weight: 0.95 },
  ],
  options: [
    { label: "Not keen, I'd want a conversation about boundaries", scores: { guests_hosting: 1, social_lifestyle: 1, noise_tolerance: 1 } },
    { label: "Fine occasionally, but not as a regular thing", scores: { guests_hosting: 2, social_lifestyle: 2, noise_tolerance: 2 } },
    { label: "Doesn't bother me if they're easy to have around", scores: { guests_hosting: 3, social_lifestyle: 3, noise_tolerance: 3 } },
    { label: "All good, more the merrier, honestly", scores: { guests_hosting: 4, social_lifestyle: 4, noise_tolerance: 4 } },
  ],
  },
  {
    id: "food",
    text: "How do you want the flat to be setup for cooking meals?",
    kind: "dimension",
    dimensions: [
      { key: "cooking_food", weight: 1.1 },
      { key: "shared_living", weight: 1.0 },
      { key: "communication_style", weight: 0.9 },
    ],
    options: [
      { label: "Everyone cooks together and we eat as a flat", scores: { cooking_food: 4, shared_living: 4, communication_style: 4 } },
      { label: "Shared dinners sometimes, but no pressure either way", scores: { cooking_food: 3, shared_living: 3, communication_style: 3 } },
      { label: "Mostly everyone does their own thing", scores: { cooking_food: 2, shared_living: 2, communication_style: 2 } },
      { label: "I only want my own food and my own kitchen time", scores: { cooking_food: 1, shared_living: 1, communication_style: 2 } },
    ],
  },
  {
    id: "study_week",
    text: "It’s exam week, how should the house feel?",
    kind: "dimension",
    dimensions: [
      { key: "study_environment", weight: 1.2 },
      { key: "noise_tolerance", weight: 1.05 },
    ],
    options: [
      { label: "Quiet hours should be respected", scores: { study_environment: 4, noise_tolerance: 1 } },
      { label: "A calmer vibe would be nice", scores: { study_environment: 3, noise_tolerance: 2 } },
      { label: "I can deal with some noise if people are still normal", scores: { study_environment: 2, noise_tolerance: 3 } },
      { label: "The flat can stay as it is", scores: { study_environment: 1, noise_tolerance: 4 } },
    ],
  },
  {
    id: "routine",
    text: "Your flatmate's alarm goes off three times before they actually get up. Does that kind of thing bug you?",
    kind: "dimension",
    dimensions: [
      { key: "daily_routine", weight: 1.15 },
      { key: "noise_tolerance", weight: 1.0 },
      { key: "communication_style", weight: 0.9 },
    ],
    options: [
      { label: "Yeah, I'd want people mindful of that kind of thing", scores: { daily_routine: 4, noise_tolerance: 1, communication_style: 3 } },
      { label: "A little annoying, but not a big deal", scores: { daily_routine: 3, noise_tolerance: 2, communication_style: 3 } },
      { label: "Doesn't really register for me", scores: { daily_routine: 2, noise_tolerance: 3, communication_style: 2 } },
      { label: "Honestly wouldn't even notice", scores: { daily_routine: 1, noise_tolerance: 4, communication_style: 1 } },
    ],
  },
  {
    id: "bills",
    text: "How do you want bills and shared costs handled in the flat?",
    kind: "dimension",
    dimensions: [
      { key: "communication_style", weight: 1.1 },
      { key: "shared_living", weight: 1.0 },
    ],
    options: [
      { label: "A clear system that's split evenly and sorted each month", scores: { communication_style: 4, shared_living: 4 } },
      { label: "Just talk it out if something feels off", scores: { communication_style: 3, shared_living: 3 } },
      { label: "Keep it relaxed, doesn't need to be exact", scores: { communication_style: 2, shared_living: 2 } },
      { label: "I'd rather not get into money conversations much", scores: { communication_style: 1, shared_living: 1 } },
    ],
  },
  {
    id: "privacy",
    text: "How often do you need some quiet time to yourself at home?",
    kind: "dimension",
    dimensions: [
      { key: "independence_communal", weight: 1.2 },
      { key: "shared_living", weight: 1.05 },
      { key: "social_lifestyle", weight: 0.9 },
    ],
    options: [
      { label: "Most days, I really value my own space", scores: { independence_communal: 4, shared_living: 1, social_lifestyle: 1 } },
      { label: "Sometimes, I like having space but enjoy company too", scores: { independence_communal: 3, shared_living: 2, social_lifestyle: 2 } },
      { label: "Not often, I like being around people at home", scores: { independence_communal: 2, shared_living: 3, social_lifestyle: 3 } },
      { label: "Rarely, I want to be around my flatmates most of the time", scores: { independence_communal: 1, shared_living: 4, social_lifestyle: 4 } },
    ],
  },
  {
    id: "hosting",
    text: "How do you feel about hosting people at the flat?",
    kind: "dimension",
    dimensions: [
      { key: "guests_hosting", weight: 1.2 },
      { key: "social_lifestyle", weight: 1.0 },
      { key: "communication_style", weight: 0.9 },
    ],
    options: [
      { label: "I'd rather not host, ever", scores: { guests_hosting: 1, social_lifestyle: 1, communication_style: 2 } },
      { label: "Fine, as long as it's not during exam time", scores: { guests_hosting: 2, social_lifestyle: 2, communication_style: 3 } },
      { label: "Fine, as long as I get a heads-up first", scores: { guests_hosting: 3, social_lifestyle: 3, communication_style: 4 } },
      { label: "Happy to host any time, no notice needed", scores: { guests_hosting: 4, social_lifestyle: 4, communication_style: 3 } },
    ],
  },
  {
    id: "bathroom",
    text: "Be honest — how often do you clean the bathroom without someone asking you to?",
    kind: "dimension",
    dimensions: [
      { key: "cleanliness", weight: 1.15 },
      { key: "communication_style", weight: 0.95 },
    ],
    options: [
      { label: "Once a week or more", scores: { cleanliness: 4, communication_style: 3 } },
      { label: "Every couple of weeks or so", scores: { cleanliness: 3, communication_style: 3 } },
      { label: "Only when it's actually gotten pretty bad", scores: { cleanliness: 2, communication_style: 2 } },
      { label: "Almost never, if I'm honest", scores: { cleanliness: 1, communication_style: 1 } },
    ],
  },
  {
    id: "age",
    text: "What age bracket are you in?",
    kind: "dimension",
    dimensions: [
      { key: "life_stage", weight: 1.3 },
    ],
    options: [
      { label: "18–19", scores: { life_stage: 1 } },
      { label: "20–21", scores: { life_stage: 2 } },
      { label: "22–23", scores: { life_stage: 3 } },
      { label: "24+", scores: { life_stage: 4 } },
    ],
  },
  {
    id: "smoking",
    text: "What’s your comfort level with smoking or vaping in the flat?",
    kind: "dealbreaker",
    field: "smoking",
    options: [
      { label: "No smoking at all", value: "smoke_free" },
      { label: "Outside only is fine", value: "outside_only" },
      { label: "Smoking is acceptable", value: "smoking_ok" },
      { label: "Any smoking is fine", value: "any" },
    ],
  },
  {
    id: "pets",
    text: "How do you feel about pets?",
    kind: "dealbreaker",
    field: "pets",
    options: [
      { label: "Absolutely no pets", value: "no_pets" },
      { label: "Small pets are okay", value: "small_pets" },
      { label: "Pets are generally fine", value: "pets_ok" },
      { label: "I’d love pets", value: "pet_friendly" },
    ],
  },
  {
    id: "budget",
    text: "What rent are you most comfortable with?",
    kind: "housing",
    field: "budgetMax",
    options: [
      { label: "Under $180pw", score: 180 },
      { label: "$180–210pw", score: 200 },
      { label: "$210–240pw", score: 260 },
      { label: "$240pw or more", score: 320 },
    ],
  },
  {
    id: "move_in",
    text: "When are you looking to move in?",
    kind: "housing",
    field: "moveInWindow",
    options: [
      { label: "Right now / ASAP", score: 0 },
      { label: "Nov–Jan (new academic year)", score: 1 },
      { label: "Jun–Jul (mid-year)", score: 2 },
      { label: "Not sure yet / flexible", score: 3 },
    ],
  },
];

const MINI_QUIZ_QUESTIONS = [
  {
    id: "age",
    kind: "dimension",
    text: "What age bracket is most of the flat?",
    dimensions: [
      { key: "life_stage", weight: 1.3 },
    ],
    options: [
      { label: "18–19", scores: { life_stage: 1 } },
      { label: "20–21", scores: { life_stage: 2 } },
      { label: "22–23", scores: { life_stage: 3 } },
      { label: "24+", scores: { life_stage: 4 } },
    ],
  },
  {
    id: "smoking",
    kind: "dealbreaker",
    field: "smoking",
    text: "What's the smoking or vaping situation at the flat?",
    options: [
      { label: "Smoke-free", value: "smoke_free" },
      { label: "Fine outside only", value: "outside_only" },
      { label: "Fine inside sometimes", value: "smoking_ok" },
      { label: "No restrictions", value: "any" },
    ],
  },
  {
    id: "pets",
    kind: "dealbreaker",
    field: "pets",
    text: "How does the flat feel about pets?",
    options: [
      { label: "No pets", value: "no_pets" },
      { label: "Small pets are fine", value: "small_pets" },
      { label: "Pets are welcome", value: "pets_ok" },
      { label: "Very pet-friendly, we love pets here", value: "pet_friendly" },
    ],
  },
  {
    id: "cleanliness",
    kind: "dimension",
    text: "How would you describe the flat day to day?",
    dimensions: [
      { key: "cleanliness", weight: 1.2 },
      { key: "communication_style", weight: 0.9 },
      { key: "independence_communal", weight: 0.8 },
    ],
    options: [
      { label: "Tidy most of the time", scores: { cleanliness: 4, communication_style: 3, independence_communal: 2 } },
      { label: "Clean, but lived-in", scores: { cleanliness: 3, communication_style: 3, independence_communal: 3 } },
      { label: "A bit messy sometimes", scores: { cleanliness: 2, communication_style: 2, independence_communal: 3 } },
      { label: "Pretty relaxed about mess", scores: { cleanliness: 1, communication_style: 2, independence_communal: 4 } },
    ],
  },
  {
    id: "noise",
    kind: "dimension",
    text: "What's the flat usually like, noise-wise?",
    dimensions: [
      { key: "noise_tolerance", weight: 1.15 },
      { key: "study_environment", weight: 1.0 },
      { key: "daily_routine", weight: 0.9 },
    ],
    options: [
      { label: "Quiet most days", scores: { noise_tolerance: 1, study_environment: 4, daily_routine: 4 } },
      { label: "Quiet on weeknights, louder on weekends", scores: { noise_tolerance: 2, study_environment: 3, daily_routine: 3 } },
      { label: "Fairly lively", scores: { noise_tolerance: 3, study_environment: 2, daily_routine: 2 } },
      { label: "Loud and social most of the time", scores: { noise_tolerance: 4, study_environment: 1, daily_routine: 1 } },
    ],
  },
  {
    id: "guests",
    kind: "dimension",
    text: "How often do people have guests over?",
    dimensions: [
      { key: "guests_hosting", weight: 1.1 },
      { key: "social_lifestyle", weight: 1.0 },
      { key: "shared_living", weight: 0.9 },
      { key: "cooking_food", weight: 0.7 },
    ],
    options: [
      { label: "Rarely", scores: { guests_hosting: 1, social_lifestyle: 1, shared_living: 1, cooking_food: 2 } },
      { label: "Occasionally, with a heads-up", scores: { guests_hosting: 2, social_lifestyle: 2, shared_living: 2, cooking_food: 3 } },
      { label: "Fairly often", scores: { guests_hosting: 3, social_lifestyle: 3, shared_living: 3, cooking_food: 3 } },
      { label: "All the time, very social flat", scores: { guests_hosting: 4, social_lifestyle: 4, shared_living: 4, cooking_food: 4 } },
    ],
  },
];

function buildMiniQuizProfile(answers = {}) {
  const dimensionTotals = {};
  const dimensionWeights = {};
  const dealBreakers = {};

  for (const question of MINI_QUIZ_QUESTIONS) {
    const selectedIndex = answers[question.id];
    if (selectedIndex == null) continue;
    const option = question.options[selectedIndex];
    if (!option) continue;

    if (question.kind === "dimension") {
      for (const dim of question.dimensions) {
        const score = option.scores?.[dim.key] ?? 3;
        dimensionTotals[dim.key] = (dimensionTotals[dim.key] || 0) + score * dim.weight;
        dimensionWeights[dim.key] = (dimensionWeights[dim.key] || 0) + dim.weight;
      }
    } else if (question.kind === "dealbreaker") {
      dealBreakers[question.field] = option.value;
    }
  }

  const dimensions = {};
  Object.keys(dimensionTotals).forEach((key) => {
    dimensions[key] = Math.round((dimensionTotals[key] / dimensionWeights[key]) * 10) / 10;
  });

  return { dimensions, dealBreakers };
}

function buildCompatibilityProfile(answers = {}) {
  try {
    const dimensions = {};
    const dealBreakers = {};
    const housingPreferences = {};

    const dimensionTotals = {};
    const dimensionWeights = {};

    for (const question of QUESTIONS) {
      const selectedIndex = answers[question.id];
      const option = question.options?.[selectedIndex] || question.options?.[0];

      if (question.kind === "dimension") {
        for (const dimension of question.dimensions || []) {
          const dimensionScore = option?.scores?.[dimension.key] ?? 2;
          const weight = dimension.weight || 1;
          dimensionTotals[dimension.key] = (dimensionTotals[dimension.key] || 0) + (dimensionScore * weight);
          dimensionWeights[dimension.key] = (dimensionWeights[dimension.key] || 0) + weight;
        }
      } else if (question.kind === "dealbreaker") {
        const value = option?.value ?? option?.score ?? 3;
        dealBreakers[question.field] = value;
      } else if (question.kind === "housing") {
        const value = option?.value ?? option?.score ?? 3;
        housingPreferences[question.field] = value;
      }
    }

    for (const dimension of COMPATIBILITY_DIMENSIONS) {
      dimensions[dimension.key] = dimensionWeights[dimension.key]
        ? Math.round((dimensionTotals[dimension.key] / dimensionWeights[dimension.key]) * 10) / 10
        : 3;
    }

    return {
      dimensions,
      dealBreakers,
      housingPreferences,
    };
  } catch (err) {
    console.error("Error building compatibility profile:", err);
    return {
      dimensions: Object.fromEntries(COMPATIBILITY_DIMENSIONS.map(d => [d.key, 3])),
      dealBreakers: { smoking: 'neutral', pets: 'neutral' },
      housingPreferences: { budgetMax: 260, moveInWindow: 2, location: '' },
    };
  }
}

function parseBudgetValue(value) {
  if (typeof value === "number") return value;
  if (!value) return 260;
  const matches = String(value).match(/\d+/g);
  if (!matches) return 260;
  const nums = matches.map(Number);
  return Math.max(...nums);
}

function getListingProfile(listing) {
  return deriveListingProfile(listing);
}

function calculateMatchScore(userProfile, listing) {
  try {
    const listingProfile = getListingProfile(listing);
    const scored = scoreCompatibility(userProfile, listingProfile, DEFAULT_MATCHING_CONFIG);
    return scored ? scored.score : 15;
  } catch (err) {
    console.error("Error calculating match score:", err);
    return 50;
  }
}
 
/* ---------------------------------------------
   SAMPLE LISTINGS (groups + solos)
--------------------------------------------- */
 
const SAMPLE_LISTINGS = [
 {
    id: "g1",
    type: "group",
    title: "2 looking for 2 more", 
    people: 2,
    spotsNeeded: 2,
    suburb: "Riccarton",
    distanceKm: 3,
    area: "Ilam / Riccarton",
    budget: "$200-230pw",
    moveIn: "Feb 2027",
    bio: "Second-years, both pretty chill. We study a lot during the week but always down for a movie night or a casual Friday drink. Looking for similarly easy-going people who don't mind a quiet weeknight.",
    tags: { chill: 3, quiet: 1, tidy: 1 },
  },
  {
    id: "g2",
    type: "group",
    title: "3 looking for 1 more",
    people: 3,
    spotsNeeded: 1,
    suburb: "Sumner",
    distanceKm: 12,
    area: "Sumner",
    budget: "$240-260pw",
    moveIn: "Jan 2027",
    bio: "We're a social bunch — beach walks, regular flat dinners, occasional Saturday pres. Looking for someone who's keen to be part of that, not just pay rent and disappear.",
    tags: { social: 3, night: 1, chill: 1 },
  },
  {
    id: "g3",
    type: "group",
    title: "1 looking to form a group of 4",
    people: 1,
    spotsNeeded: 3,
    suburb: "Ilam",
    distanceKm: 0.5,
    area: "Ilam",
    budget: "$190-210pw",
    moveIn: "Feb 2027",
    bio: "First-year in halls, early riser, into gym and structured routines. Want a flat where mornings are respected and the place stays tidy without a fight.",
    tags: { early: 3, tidy: 2, quiet: 1 },
  },
  {
    id: "g4",
    type: "group",
    title: "2 looking for 1-2 more",
    people: 2,
    spotsNeeded: 2,
    suburb: "Riccarton",
    distanceKm: 3,
    area: "Riccarton",
    budget: "$180-200pw",
    moveIn: "Now",
    bio: "Keeping costs as low as possible is our priority. We're flexible on most things — just need people who'll split bills fairly and aren't going to be difficult about money.",
    tags: { budget: 3, chill: 1 },
  },
  {
    id: "g5",
    type: "group",
    title: "3 looking for 1 more",
    people: 3,
    spotsNeeded: 1,
    suburb: "Ilam",
    distanceKm: 0.5,
    area: "Ilam",
    budget: "$210-230pw",
    moveIn: "Feb 2027",
    bio: "We run a shared chore roster and have a house group chat that actually works. Quiet on weeknights, social on weekends. Looking for someone who's organised and communicates well.",
    tags: { tidy: 3, social: 1 },
  },
  {
    id: "s1",
    type: "solo",
    title: "Solo looking to join a group",
    people: 1,
    spotsNeeded: 0,
    suburb: "Ilam",
    distanceKm: 0.5,
    area: "Open to most areas near campus",
    budget: "Up to $220pw",
    moveIn: "Feb 2027",
    bio: "Second-year, quiet during the week (lots of study), but happy to socialise on weekends. Tidy, don't mind a chore roster, no pets. Easy to live with.",
    tags: { quiet: 2, tidy: 1, chill: 1 },
  },
  {
    id: "s2",
    type: "solo",
    title: "Solo looking to join a group",
    people: 1,
    spotsNeeded: 0,
    suburb: "Central City",
    distanceKm: 6.5,
    area: "Central / Riccarton",
    budget: "Up to $250pw",
    moveIn: "Now",
    bio: "Love a social flat — into hosting, music, the whole vibe. Up late most nights but considerate about it. Looking for a flat where people actually hang out together.",
    tags: { social: 2, night: 2 },
  },
  {
    id: "s3",
    type: "solo",
    title: "Solo looking to join a group",
    people: 1,
    spotsNeeded: 0,
    suburb: "Ilam",
    distanceKm: 0.5,
    area: "Ilam preferred",
    budget: "Up to $200pw",
    moveIn: "Feb 2027",
    bio: "Training most mornings so early nights are important to me. Pretty low-maintenance otherwise — just need flatmates who get that mornings matter.",
    tags: { early: 2, quiet: 1 },
  },
];
 
function compatibilityScore(userProfile, listing) {
  const listingProfile = deriveListingProfile(listing);
  const scored = scoreCompatibility(userProfile, listingProfile, DEFAULT_MATCHING_CONFIG);
  return scored ? scored.score : 15;
}
 
/* ---------------------------------------------
   LOGO
--------------------------------------------- */
 
function Logo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 400 480"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FlatMatch logo"
      style={{ borderRadius: size * 0.15, display: "block" }}
    >
      <rect width="400" height="480" rx="60" fill="#F7F6F2"/>
      <circle cx="160" cy="210" r="120" fill="#2d3f7c"/>
      <circle cx="250" cy="210" r="120" fill="#7C5CBF" opacity="0.75"/>
      <g transform="translate(205, 175)">
        <polygon points="0,-36 38,8 -38,8" fill="white"/>
        <rect x="-26" y="8" width="52" height="36" fill="white"/>
        <rect x="-10" y="20" width="20" height="24" fill="#5a3fa0"/>
      </g>
      <text
        x="200"
        y="400"
        textAnchor="middle"
        fontFamily="'Inter', 'Arial Black', sans-serif"
        fontWeight="800"
        fontSize="48"
        fill="#7C5CBF"
        letterSpacing="-1"
      >FlatMatch</text>
    </svg>
  );
}
 
function LogoLockup({ size = 40, align = "center" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : "flex-start",
        gap: 10,
        marginBottom: 18,
      }}
    >
      <Logo size={size} />
      <span
        style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: size * 0.55,
          fontWeight: 600,
          color: "#1E2B2E",
        }}
      >
        FlatMatch
      </span>
    </div>
  );
}
 
/* ---------------------------------------------
   APP
--------------------------------------------- */
 
/* ---------------------------------------------
   NAV BAR
--------------------------------------------- */
 

 
function NavBar({ onHome, onPost, onSaved }) {
  return (
    <nav style={styles.navbar}>
      <div style={styles.navInner}>
        <button style={styles.navLogo} onClick={onHome} aria-label="Go to home">
          <Logo size={28} />
          <span style={styles.navLogoText}>FlatMatch</span>
        </button>
        <div style={styles.navLinks}>
          <button className="fm-nav-link" style={styles.navSaved} onClick={onSaved}>Saved</button>
          
          <button className="fm-nav-cta" style={styles.navCta} onClick={onPost}>Post a listing</button>
        </div>
      </div>
    </nav>
  );
}
 
export default function App() {
  const [stage, setStage] = useState("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem("fm_answers");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [hasQuizzed, setHasQuizzed] = useState(() => {
    return localStorage.getItem("fm_has_quizzed") === "true";
  });
  const [userListings, setUserListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [postError, setPostError] = useState(null);
  const [sessionContact, setSessionContact] = useState(null);
  const [savedListings, setSavedListings] = useState(() => {
    try {
      const saved = localStorage.getItem("fm_saved");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [institution, setInstitution] = useState(() => {
    return localStorage.getItem("fm_institution") || "uc";
  });
  const [selectedListing, setSelectedListing] = useState(null);
  const [previousStage, setPreviousStage] = useState("intro");

  function viewListing(listing) {
    setPreviousStage(stage);
    setSelectedListing(listing);
    setStage("detail");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function closeListing() {
    setSelectedListing(null);
    setStage(previousStage);
  }

  function handleInstitutionChange(id) {
    setInstitution(id);
    localStorage.setItem("fm_institution", id);
  }
 
  const profile = useMemo(() => buildCompatibilityProfile(answers), [answers]);
 
  const allListings = useMemo(
    () => [...userListings, ...SAMPLE_LISTINGS],
    [userListings]
  );
 
  const ranked = useMemo(() => {
    return allListings
      .filter((listing) => !listing.institution || listing.institution === institution)
      .map((listing) => ({
        ...listing,
        score: calculateMatchScore(profile, listing),
      }))
      .sort((a, b) => b.score - a.score);
  }, [profile, allListings, institution]);
 
  async function loadListings() {
    setLoadingListings(true);
    try {
      const listings = await fetchListings(institution);
      setUserListings(listings);
    } catch (err) {
      console.error("Failed to load listings:", err);
      setUserListings([]);
    } finally {
      setLoadingListings(false);
    }
  }
 
  useEffect(() => {
    loadListings();
  }, [institution]);
 
  async function submitListing(listing) {
    setPostError(null);
    setSessionContact(listing.contact);
    try {
      const record = await createListing(listing);
      setUserListings((prev) => [record, ...prev]);
      const tokens = JSON.parse(localStorage.getItem('fm_tokens') || '{}');
      tokens[record.id] = record.deleteToken;
      localStorage.setItem('fm_tokens', JSON.stringify(tokens));
      setStage("posted");
      try {
        const current = await window.storage.get("metric:total_listings", true);
        const count = current ? parseInt(current.value) : 0;
        await window.storage.set("metric:total_listings", String(count + 1), true);
      } catch {}
    } catch (err) {
      console.error("Error saving listing:", err);
      setPostError("Couldn't save your listing — try again in a moment.");
      setStage("post");
    }
  }
 
  function onSave(listingId) {
    setSavedListings((prev) => {
      const next = prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId];
      localStorage.setItem("fm_saved", JSON.stringify(next));
      return next;
    });
  }
 
  async function markFilled(listingId) {
    try {
      await markListingFilled(listingId);
      setUserListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch (err) {
      console.error("Error marking listing filled:", err);
    }
  }
 
  async function selectAnswer(qIndex, optIndex) {
    const q = QUESTIONS[qIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: optIndex }));
    if (qIndex < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(qIndex + 1), 180);
    } else {
      setHasQuizzed(true);
      localStorage.setItem("fm_has_quizzed", "true");
      localStorage.setItem("fm_answers", JSON.stringify({
        ...answers,
        [QUESTIONS[qIndex].id]: optIndex,
      }));
      setTimeout(() => setStage("result"), 180);
      try {
        const current = await window.storage.get("metric:quiz_completions", true);
        const count = current ? parseInt(current.value) : 0;
        await window.storage.set("metric:quiz_completions", String(count + 1), true);
      } catch {}
    }
  }
 
  function restart() {
    setAnswers({});
    setCurrentQ(0);
    setStage("intro");
  }
 
  return (
    <div style={styles.page}>
      <style>{globalCSS}</style>
      <NavBar
        onHome={restart}
        onPost={() => setStage("post")}
        onSaved={() => setStage("saved")}
      />
 
      {stage === "intro" && (
        <Intro
          onStart={() => setStage("quiz")}
          onPost={() => setStage("post")}
          institution={institution}
          onInstitutionChange={handleInstitutionChange}
          userListings={userListings}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          onView={viewListing}
        />
      )}
 
      {stage === "quiz" && (
        <Quiz
          question={QUESTIONS[currentQ]}
          questionIndex={currentQ}
          total={QUESTIONS.length}
          onSelect={(optIndex) => selectAnswer(currentQ, optIndex)}
          onBack={
            currentQ > 0 ? () => setCurrentQ((i) => i - 1) : null
          }
        />
      )}
 
      {stage === "saved" && (
        <Results
          profile={profile}
          ranked={ranked.filter((l) => savedListings.includes(l.id))}
          onRestart={restart}
          onPost={() => setStage("post")}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
          onSave={onSave}
          savedListings={savedListings}
          isSavedView={true}
          hasQuizzed={hasQuizzed}
          onView={viewListing}
        />
      )}
 
      {stage === "result" && (
        <Results
          profile={profile}
          ranked={ranked}
          onRestart={restart}
          onPost={() => setStage("post")}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
          onSave={onSave}
          savedListings={savedListings}
          hasQuizzed={hasQuizzed}
          onView={viewListing}
        />
      )}
 
      {stage === "post" && (
        <PostForm
          onSubmit={submitListing}
          onCancel={() => setStage("intro")}
          error={postError}
        />
      )}

      {stage === "detail" && selectedListing && (
        <ListingDetail
          listing={selectedListing}
          onBack={closeListing}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
          onSave={onSave}
          savedListings={savedListings}
        />
      )}
 
      {stage === "posted" && (
        <PostedConfirmation
          onBrowse={() => setStage("intro")}
          onTakeQuiz={() => {
            setAnswers({});
            setCurrentQ(0);
            setStage("quiz");
          }}
        />
      )}
      <Footer />
    </div>
  );
}
 
/* ---------------------------------------------
   METRICS STRIP
--------------------------------------------- */

function MetricsStrip() {
  const [metrics, setMetrics] = useState({
    totalListings: null,
    quizCompletions: null,
    connectionRequests: null,
    stories: null,
  });

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [listingsKey, quizKey, requestsKey, storiesKey] = await Promise.all([
          window.storage.get("metric:total_listings", true),
          window.storage.get("metric:quiz_completions", true),
          window.storage.get("metric:connection_requests", true),
          window.storage.list("story:", true),
        ]);
        setMetrics({
          totalListings: listingsKey ? parseInt(listingsKey.value) : 0,
          quizCompletions: quizKey ? parseInt(quizKey.value) : 0,
          connectionRequests: requestsKey ? parseInt(requestsKey.value) : 0,
          stories: storiesKey ? storiesKey.keys.length : 0,
        });
      } catch {
        setMetrics({ totalListings: 0, quizCompletions: 0, connectionRequests: 0, stories: 0 });
      }
    }
    loadMetrics();
  }, []);

  const stats = [
    {
      num: metrics.totalListings === null ? "—" : metrics.totalListings,
      label: "Listings posted",
    },
    {
      num: metrics.quizCompletions === null ? "—" : metrics.quizCompletions,
      label: "Quizzes completed",
    },
    {
      num: metrics.connectionRequests === null ? "—" : metrics.connectionRequests,
      label: "Connection requests made",
    },
    {
      num: metrics.stories === null ? "—" : metrics.stories,
      label: "FlatMatches found",
    },
  ];

  return (
    <div style={metricsStyles.strip}>
      {stats.map((s, i) => (
        <div key={i} style={metricsStyles.stat}>
          <div style={metricsStyles.num}>{s.num}</div>
          <div style={metricsStyles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

const metricsStyles = {
  strip: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    background: "#fff",
    border: "1.5px solid #dde3f0",
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 72,
  },
  stat: {
    padding: "52px 32px",
    textAlign: "center",
    borderRight: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  num: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 64,
    fontWeight: 700,
    color: "#2d3f7c",
    lineHeight: 1,
  },
  label: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "#718096",
    lineHeight: 1.4,
  },
};

/* ---------------------------------------------
   INTRO
--------------------------------------------- */
 const NZ_INSTITUTIONS = [
  { id: "uc", name: "University of Canterbury", short: "UC", city: "Christchurch" },
  { id: "otago", name: "University of Otago", short: "Otago", city: "Dunedin" },
  { id: "vuw", name: "Victoria — Te Herenga Waka", short: "Victoria", city: "Wellington" },
  { id: "auckland", name: "University of Auckland", short: "Auckland", city: "Auckland" },
  { id: "aut", name: "AUT", short: "AUT", city: "Auckland" },
  { id: "massey", name: "Massey University", short: "Massey", city: "Palmerston North" },
  { id: "lincoln", name: "Lincoln University", short: "Lincoln", city: "Christchurch" },
  { id: "waikato", name: "University of Waikato", short: "Waikato", city: "Hamilton" },
];

function InstitutionSelector({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const current = NZ_INSTITUTIONS.find(i => i.id === selected) || NZ_INSTITUTIONS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#4B6BB7",
          background: "rgba(75,107,183,0.08)",
          border: "1.5px solid rgba(75,107,183,0.25)",
          borderRadius: 8,
          padding: "6px 12px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {current.short} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          border: "1.5px solid #dde3f0",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(35,54,58,0.12)",
          zIndex: 200,
          minWidth: 240,
          overflow: "hidden",
        }}>
          {NZ_INSTITUTIONS.map(inst => (
            <button
              key={inst.id}
              onClick={() => { onChange(inst.id); setOpen(false); }}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: inst.id === selected ? "rgba(75,107,183,0.06)" : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: inst.id === selected ? 700 : 500,
                color: inst.id === selected ? "#2d3f7c" : "#1a2540",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{inst.name}</span>
              <span style={{ fontSize: 11, color: "#718096" }}>{inst.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
const ARCHETYPES = [
  { id: "early_bird", emoji: "🌅", name: "Early Bird", tagline: "Up at dawn, in bed early" },
  { id: "night_owl", emoji: "🌙", name: "Night Owl", tagline: "Best ideas after midnight" },
  { id: "social_butterfly", emoji: "🎉", name: "Social Butterfly", tagline: "Flat is the hangout spot" },
  { id: "quiet_achiever", emoji: "📚", name: "Quiet Achiever", tagline: "Headphones in, focused" },
  { id: "clean_freak", emoji: "✨", name: "Clean Freak", tagline: "Chore roster, colour-coded" },
  { id: "chill_flatmate", emoji: "😌", name: "Chill Flatmate", tagline: "Low-key, easy-going" },
];

function Intro({ onStart, onPost, institution, onInstitutionChange, userListings, loadingListings, onMarkFilled, onView }) {
  const [activeArchetype, setActiveArchetype] = useState(null);
  const currentInst = NZ_INSTITUTIONS.find(i => i.id === institution) || NZ_INSTITUTIONS[0];
  const realListings = (userListings || []).filter(l => !l.institution || l.institution === institution);

  return (
    <div style={introStyles.page}>

      {/* ── 1. HOOK HEADER ── */}
      <section style={introStyles.hookSection}>
        <div style={introStyles.badgeRow}>
          <span style={introStyles.nzBadge}>🎓 NZ Students</span>
          <InstitutionSelector selected={institution} onChange={onInstitutionChange} />
        </div>
        <h1 style={introStyles.hookHeadline}>
          Student Flatting,<br />
          <span style={introStyles.hookHighlight}>Done Better.</span>
        </h1>
        <p style={introStyles.hookSubline}>
          Whether you're searching for a room or filling one, FlatMatch helps New Zealand
          university students connect with others from the same university who share a
          similar budget, lifestyle, and expectations for flatting.
        </p>
      </section>

      {/* ── VALUE PROP SECTION ── */}
      <section style={introStyles.problemSection}>
        <div style={introStyles.problemGrid}>
          <div style={introStyles.problemLeft}>
            <h2 style={introStyles.problemHeading}>Looking for a Flat?</h2>
            <p style={{ ...introStyles.problemText, fontSize: 14.5, lineHeight: 1.7 }}>
              Finding a flat shouldn't mean scrolling through hundreds of Facebook posts
              hoping something feels right. FlatMatch helps you discover rooms that suit
              your budget, preferred location, move-in date, and the kind of flat you're
              looking for — all in one place. Take the optional compatibility quiz to see
              which flats are the best fit for you before you reach out.
            </p>
          </div>
          <div style={introStyles.problemRight}>
            <h2 style={introStyles.problemHeadingLight}>Filling a Room?</h2>
            <p style={{ ...introStyles.solutionText, fontSize: 14.5, lineHeight: 1.7 }}>
              Finding someone who needs a room is easy — finding someone who fits your
              flat is harder. Create a listing and reach students from your university
              who are looking for the same kind of flat, making it easier to find someone
              who's a good fit for your household before they move in.
            </p>
          </div>
        </div>
      </section>

      {/* ── QUIZ NUDGE BANNER ── */}
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto", padding: "0 24px 20px", alignSelf: "center", boxSizing: "border-box" }}>
        <section style={introStyles.quizBanner}>
          <div style={introStyles.quizBannerLeft}>
            <div style={introStyles.quizBannerEmoji}>✦</div>
            <div>
              <div style={introStyles.quizBannerTitle}>
                The wrong flatmate can ruin your year. Join the {currentInst.short} students who look before they lease.
              </div>
              <div style={introStyles.quizBannerSub}>
                Take the quiz to find the perfect student flat for you.
              </div>
            </div>
          </div>
          <button style={introStyles.quizBannerBtn} onClick={onStart}>
            Take the quiz →
          </button>
        </section>
      </div>

      {/* ── 2. LISTINGS PREVIEW ── */}
      <section style={introStyles.listingsSection}>
        <div style={introStyles.listingsHeader}>
          <h2 style={introStyles.listingsHeading}>
            Browse listings
            <span style={introStyles.listingsCity}> · {currentInst.city}</span>
          </h2>
          <p style={introStyles.listingsSub}>
            Groups with rooms, solo searchers, people forming new flats — all in one place.
          </p>
        </div>

        {/* REAL LISTINGS */}
        <div style={introStyles.listingsPreview}>
          {loadingListings ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#718096" }}>Loading listings…</p>
          ) : realListings.length === 0 ? (
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#718096" }}>No listings yet for {currentInst.short} — be the first to post one.</p>
          ) : (
            realListings.slice(0, 3).map((listing) => {
              const tokens = JSON.parse(localStorage.getItem('fm_tokens') || '{}');
              const isOwner = !!tokens[listing.id];
              return (
              <div key={listing.id} style={{ ...introStyles.previewCard, cursor: onView ? "pointer" : "default" }} onClick={() => onView && onView(listing)}>
                <div style={introStyles.previewCardTop}>
                  {listing.photo ? (
                    <img
                      src={listing.photo}
                      alt="Flat"
                      style={{
                        width: 52, height: 52, borderRadius: 10,
                        objectFit: "cover", flexShrink: 0,
                        border: "1.5px solid #dde3f0",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 52, height: 52, borderRadius: 10,
                      background: "#F7F6F2",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, padding: 4,
                      border: "1.5px solid #dde3f0",
                    }}>
                      <Logo size={38} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={introStyles.previewCardTitle}>{listing.title}</div>
                    <div style={introStyles.previewCardMeta}>
                      {listing.area} · {listing.budget} · Move in {listing.moveIn}
                    </div>
                  </div>
                </div>
                <p style={introStyles.previewCardBio}>{listing.bio}</p>
                {isOwner && (
                  <button
                    style={styles.markFilledBtn}
                    onClick={(e) => { e.stopPropagation(); onMarkFilled && onMarkFilled(listing.id); }}
                  >
                    ✓ Mark as filled — remove listing
                  </button>
                )}
              </div>
              );
            })
          )}
        </div>

        {/* POST A LISTING CARD */}
        <div style={{ marginTop: 20 }}>
          <div style={introStyles.postCard}>
            <div style={introStyles.postCardLeft}>
              <span style={introStyles.postCardEmoji}>🏠</span>
              <div>
                <div style={introStyles.postCardTitle}>Have a room or forming a group?</div>
                <div style={introStyles.postCardSub}>
                  Post your listing — reach every {currentInst.short} student searching right now. Free, takes 2 minutes.
                </div>
              </div>
            </div>
            <button style={introStyles.postCardBtn} onClick={onPost}>
              Post a listing →
            </button>
          </div>
        </div>
      </section>

      {/* ── 4. METRICS STRIP ── */}
      <div style={{ width: "100%", maxWidth: 860, padding: "0 24px 72px", alignSelf: "center", margin: "0 auto" }}>
        <MetricsStrip />
      </div>

      

      {/* ── 6. ARCHETYPE TEASER ── */}
      <section style={introStyles.archetypeSection}>
        <div style={introStyles.sectionEyebrow}>YOUR FLATTING ARCHETYPE</div>
        <h2 style={introStyles.sectionHeading}>The quiz figures out your flatting style.</h2>
        <p style={introStyles.archetypeSubline}>
          Hover each one — one of these is probably you.
        </p>
        <div style={introStyles.archetypeGrid}>
          {ARCHETYPES.map((a) => (
            <div
              key={a.id}
              style={{
                ...introStyles.archetypeChip,
                ...(activeArchetype === a.id ? introStyles.archetypeChipActive : {}),
              }}
              onMouseEnter={() => setActiveArchetype(a.id)}
              onMouseLeave={() => setActiveArchetype(null)}
            >
              <span style={introStyles.archetypeChipEmoji}>{a.emoji}</span>
              <div>
                <div style={introStyles.archetypeChipName}>{a.name}</div>
                {activeArchetype === a.id && (
                  <div style={introStyles.archetypeChipTagline}>{a.tagline}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <button style={introStyles.archetypeCta} onClick={onStart}>
          Take the quiz to find yours →
        </button>
      </section>

    </div>
  );
}

const introStyles = {
page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 0,
  },  
  hookSection: {
    width: "100%",
    textAlign: "center",
    padding: "60px 24px 48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 860,
    margin: "0 auto",
    alignSelf: "center",
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  nzBadge: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#4B6BB7",
    background: "rgba(75,107,183,0.10)",
    borderRadius: 999,
    padding: "6px 16px",
    display: "inline-block",
  },
  hookHeadline: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(38px, 6vw, 60px)",
    fontWeight: 600,
    lineHeight: 1.1,
    color: "#1a2540",
    marginBottom: 20,
  },
  hookHighlight: {
    color: "#7C5CBF",
  },
  hookSubline: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 17,
    lineHeight: 1.75,
    color: "#4a5568",
    maxWidth: 720,
    marginBottom: 0,
  },
  quizBanner: {
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    background: "#2d3f7c",
    borderRadius: 20,
    margin: "0 auto 0",
    padding: "24px 32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 24,
    flexWrap: "wrap",
  },
  quizBannerLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    flex: 1,
    minWidth: 260,
  },
  quizBannerEmoji: {
    fontSize: 22,
    color: "#FFD66B",
    flexShrink: 0,
    marginTop: 2,
  },
  quizBannerTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  quizBannerSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 1.6,
  },
  quizBannerBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    padding: "13px 28px",
    background: "#7C5CBF",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  listingsSection: {
    width: "100%",
    padding: "48px 24px",
    borderTop: "1px solid #dde3f0",
    maxWidth: 860,
    margin: "0 auto",
    alignSelf: "center",
    boxSizing: "border-box",
  },
  listingsHeader: {
    marginBottom: 24,
  },
  listingsHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(22px, 3vw, 28px)",
    fontWeight: 600,
    color: "#1a2540",
    marginBottom: 6,
  },
  listingsCity: {
    color: "#7C5CBF",
  },
  listingsSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: "#718096",
  },
  postCard: {
    width: "100%",
    background: "#f8f7ff",
    border: "1.5px dashed #7C5CBF",
    borderRadius: 16,
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  postCardLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: 1,
    minWidth: 200,
  },
  postCardEmoji: {
    fontSize: 28,
    flexShrink: 0,
  },
  postCardTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: "#1a2540",
    marginBottom: 4,
  },
  postCardSub: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "#718096",
    lineHeight: 1.5,
  },
  postCardBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    padding: "11px 22px",
    background: "#7C5CBF",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  listingsPreview: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  previewCard: {
    background: "#fff",
    border: "1.5px solid #dde3f0",
    borderRadius: 16,
    padding: "20px 22px",
  },
  previewCardTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  previewCardTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    color: "#1a2540",
    marginBottom: 3,
  },
  previewCardMeta: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12.5,
    color: "#718096",
  },
  previewMatchBlur: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  previewMatchInner: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#1A6B2E",
    background: "#D4EDD4",
    borderRadius: 8,
    padding: "6px 14px",
    filter: "blur(4px)",
    userSelect: "none",
  },
  previewMatchLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 10,
    color: "#718096",
    textAlign: "center",
    maxWidth: 80,
    lineHeight: 1.3,
  },
  previewCardBio: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13.5,
    lineHeight: 1.65,
    color: "#4a5568",
    marginBottom: 12,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  previewTakeQuiz: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#7C5CBF",
    background: "rgba(124,92,191,0.07)",
    border: "1.5px solid #7C5CBF",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
  },
  seeAllBtn: {
    width: "100%",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    padding: "16px",
    background: "#1a2540",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    marginTop: 4,
  },
  sectionEyebrow: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.18em",
    color: "#7C5CBF",
    marginBottom: 12,
    textAlign: "center",
  },
  sectionHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(24px, 4vw, 34px)",
    fontWeight: 600,
    color: "#1a2540",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 1.25,
  },
  problemSection: {
    width: "100%",
    padding: "48px 24px 72px",
    maxWidth: 860,
    margin: "0 auto",
    alignSelf: "center",
    boxSizing: "border-box",
  },
  problemGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
    width: "100%",
  },
  problemLeft: {
    background: "#f8f7ff",
    border: "1.5px solid #dde3f0",
    borderRadius: 20,
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  problemRight: {
    background: "#2d3f7c",
    borderRadius: 20,
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  problemHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#1a2540",
    lineHeight: 1.3,
    marginTop: -4,
  },
  problemHeadingLight: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.3,
    marginTop: -4,
  },
  problemList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  problemItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  problemX: {
    fontSize: 13,
    fontWeight: 700,
    color: "#a0aec0",
    flexShrink: 0,
    marginTop: 2,
  },
  problemText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#4a5568",
  },
  solutionItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  solutionCheck: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1A9090",
    flexShrink: 0,
    marginTop: 2,
  },
  solutionText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    lineHeight: 1.6,
    color: "rgba(255,255,255,0.85)",
  },
  archetypeSection: {
    width: "100%",
    padding: "72px 24px",
    borderTop: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 860,
    margin: "0 auto",
    alignSelf: "center",
    boxSizing: "border-box",
  },
  archetypeSubline: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    color: "#718096",
    marginBottom: 36,
    marginTop: -24,
    textAlign: "center",
  },
  archetypeGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginBottom: 36,
    width: "100%",
  },
  archetypeChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1.5px solid #dde3f0",
    borderRadius: 14,
    padding: "14px 20px",
    cursor: "pointer",
    minWidth: 180,
    flex: "0 1 auto",
  },
  archetypeChipActive: {
    borderColor: "#7C5CBF",
    boxShadow: "0 0 0 3px rgba(124,92,191,0.12)",
    background: "rgba(124,92,191,0.04)",
  },
  archetypeChipEmoji: {
    fontSize: 26,
    flexShrink: 0,
  },
  archetypeChipName: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#1a2540",
    lineHeight: 1.3,
  },
  archetypeChipTagline: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11.5,
    color: "#7C5CBF",
    lineHeight: 1.4,
    marginTop: 3,
    fontWeight: 500,
  },
  archetypeCta: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    color: "#7C5CBF",
    background: "rgba(124,92,191,0.08)",
    border: "1.5px solid #7C5CBF",
    borderRadius: 10,
    padding: "14px 32px",
    cursor: "pointer",
  },
  finalCtaSection: {
    width: "calc(100% - 48px)",
    maxWidth: 860,
    margin: "0 auto 72px",
    padding: "64px 40px",
    background: "#2d3f7c",
    borderRadius: 24,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 20,
  },
  finalCtaHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(26px, 4vw, 38px)",
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.25,
  },
  finalCtaBody: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15.5,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.70)",
    maxWidth: 480,
  },
  finalCtaBtns: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  finalCtaBtnPrimary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    padding: "16px 36px",
    background: "#7C5CBF",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  finalCtaBtnSecondary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    padding: "16px 32px",
    background: "transparent",
    color: "#fff",
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: 10,
    cursor: "pointer",
  },
};
 
/* ---------------------------------------------
   QUIZ
--------------------------------------------- */
 
function Quiz({ question, questionIndex, total, onSelect, onBack }) {
  return (
    <div style={styles.quizWrap}>
      <div style={{ marginBottom: 16 }}>
        <Logo size={32} />
      </div>
      <div style={styles.progressRow}>
        {onBack ? (
          <button style={styles.backBtn} onClick={onBack} aria-label="Previous question">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div style={styles.progressText}>
          {questionIndex + 1} / {total} · {Math.round((questionIndex + 1) / total * 100)}%
        </div>
      </div>
 
      <div style={styles.progressBarOuter}>
        <div
          style={{
            ...styles.progressBarInner,
            width: `${((questionIndex + 1) / total) * 100}%`,
          }}
        />
      </div>
 
      <div key={question.id} className="question-anim">
        {QUESTION_TO_CATEGORY[question.id] && (
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: COLORS.teal,
            marginBottom: 10,
          }}>
            {QUESTION_TO_CATEGORY[question.id]}
          </div>
        )}
        <h2 style={styles.question}>{question.text}</h2>
      </div>
 
      <div style={styles.optionsCol}>
        {question.options.map((opt, i) => (
          <button
            key={i}
            style={styles.optionBtn}
            onClick={() => onSelect(i)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
 
/* ---------------------------------------------
   RESULTS
--------------------------------------------- */
 
function ActivityPulse({ listings }) {
  const now = Date.now();
  const oneDayAgo = now - 1000 * 60 * 60 * 24;
  const oneWeekAgo = now - 1000 * 60 * 60 * 24 * 7;
  const newThisWeek = listings.filter(l => l.createdAt > oneWeekAgo).length;
  const activelyLooking = listings.filter(l => l.status === "looking" || !l.status).length;
  const newToday = listings.filter(l => l.createdAt > oneDayAgo).length;
  if (newThisWeek === 0 && activelyLooking === 0) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
      {newToday > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.inkSoft }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.teal, display: "inline-block", animation: "pulse 2s infinite" }} />
          {newToday} new listing{newToday !== 1 ? "s" : ""} today
        </div>
      )}
      {activelyLooking > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.inkSoft }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.coral, display: "inline-block", animation: "pulse 2s infinite" }} />
          {activelyLooking} actively looking
        </div>
      )}
      {newThisWeek > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.inkSoft }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B7BB5", display: "inline-block" }} />
          {newThisWeek} posted this week
        </div>
      )}
    </div>
  );
}
 
function SeasonCountdown() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const peakStart = new Date(currentYear, 10, 1);
  const oWeek = new Date(currentYear + 1, 1, 3);
  const inPeakSeason = now >= peakStart;
  const daysToOWeek = Math.ceil((oWeek - now) / (1000 * 60 * 60 * 24));
  if (!inPeakSeason) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.yellow, border: `1.5px solid #FFD66B`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, width: "100%" }}>
      <span style={{ fontSize: 18 }}>⏳</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.ink }}>Peak flatting season is open</div>
        <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{daysToOWeek} days until O-Week 2027 — most flats fill up by mid-January</div>
      </div>
    </div>
  );
}
 
function HowMatchingWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        style={{ fontSize: 12, color: COLORS.teal, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontWeight: 500 }}
        onClick={() => setOpen(o => !o)}
      >
        How does matching work? ↗
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 28, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", width: 280, zIndex: 10, boxShadow: "0 4px 16px rgba(35,54,58,0.10)", fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          FlatMatch now scores real living fit across deal-breakers, practical compatibility dimensions, and housing fit. The result is a more useful match score than a personality label.
          <button onClick={() => setOpen(false)} style={{ display: "block", marginTop: 8, fontSize: 12, color: COLORS.teal, background: "none", border: "none", cursor: "pointer" }}>Close</button>
        </div>
      )}
    </div>
  );
}
 
function Results({ profile, ranked, onRestart, onPost, loadingListings, onMarkFilled, sessionContact, onSave, savedListings, isSavedView, hasQuizzed, onView }) {
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
 
  const availableSuburbs = useMemo(() => {
    const set = new Set();
    for (const l of ranked) {
      if (l.suburb) set.add(l.suburb);
    }
    const allSuburbs = Object.values(NZ_CITIES).flatMap((c) => c.suburbs);
    const seen = new Set();
    return allSuburbs.filter((s) => {
      if (!set.has(s.name) || seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });
  }, [ranked]);
 
  const filtered = useMemo(() => {
    let list = ranked;
    if (suburbFilter !== "all") {
      list = list.filter((l) => l.suburb === suburbFilter);
    }
    if (sortBy === "distance") {
      list = [...list].sort((a, b) => {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        if (da !== db) return da - db;
        return b.score - a.score;
      });
    }
    return list;
  }, [ranked, suburbFilter, sortBy]);
 
  const groups = filtered.filter((l) => l.type === "group");
  const solos = filtered.filter((l) => l.type === "solo");
 
  return (
    <div style={styles.resultsWrap}>
      <div style={{ marginBottom: 16, width: "100%" }}>
        <Logo size={32} />
      </div>
      {!isSavedView && hasQuizzed && (
        <div className="stamp-anim" style={styles.archetypeCard}>
          <div style={styles.archetypeEyebrow}>YOUR LIVING PROFILE</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>🏠</div>
            <div style={{ flex: 1 }}>
              <h1 style={styles.archetypeName}>Practical compatibility profile</h1>
              <p style={styles.archetypeTagline}>Your answers are now being compared across real living habits instead of personality labels.</p>
              <p style={styles.archetypeDescription}>We rank homes by deal-breakers, compatibility dimensions, and housing fit so you can see how likely a flat is to work in real life.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {Object.entries(profile?.dimensions || {}).sort((a,b) => b[1]-a[1]).slice(0,4).map(([key, value]) => (
                  <span key={key} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.12)", color: COLORS.paper, borderRadius: 8, padding: "4px 12px" }}>
                    {key.replace(/_/g, " ")} · {value}/4
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {!isSavedView && !hasQuizzed && (
        <div style={styles.noQuizPrompt}>
          <span style={{ fontSize: 28 }}>🏡</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.ink, marginBottom: 4 }}>Take the quiz to see your living profile</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Get personalised match scores based on real flatmate habits and practical fit</div>
          </div>
          <button style={styles.primaryBtn} onClick={onRestart}>Take the quiz</button>
        </div>
      )}
      {isSavedView && (
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ ...styles.h2, marginBottom: 8 }}>Saved listings</h1>
          <p style={{ fontSize: 14.5, color: COLORS.inkSoft, marginBottom: 0 }}>Your bookmarked flats — pick up where you left off</p>
        </div>
      )}
 
      <SeasonCountdown />
      <ActivityPulse listings={ranked} />
 
      {!loadingListings && (
        <div style={{ width: "100%", background: "rgba(26, 144, 144, 0.08)", border: `1px solid rgba(26, 144, 144, 0.2)`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13.5, color: COLORS.teal, fontWeight: 500 }}>
          ✓ Showing listings ranked by your compatibility score
        </div>
      )}
 
      {!loadingListings && !isSavedView && (
        <div style={styles.filterBar}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Suburb</label>
            <select
              style={styles.input}
              value={suburbFilter}
              onChange={(e) => setSuburbFilter(e.target.value)}
            >
              <option value="all">All suburbs</option>
              {availableSuburbs.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.distanceKm != null ? ` (~${s.distanceKm}km from campus)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Sort by</label>
            <div style={styles.toggleRow}>
              <button
                type="button"
                style={sortBy === "match" ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setSortBy("match")}
              >
                Best match
              </button>
              <button
                type="button"
                style={sortBy === "distance" ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => setSortBy("distance")}
              >
                Closest to UC
              </button>
            </div>
          </div>
        </div>
      )}
 
      <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 0 8px" }}>
        <span style={{ fontSize: 13, color: COLORS.inkSoft, fontWeight: 500 }}>
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
        </span>
        <HowMatchingWorks />
      </div>
 
      {loadingListings ? (
        <div style={styles.loadingNote}>Loading listings…</div>
      ) : (
        <>
          <div style={styles.resultsSection}>
            <h3 style={styles.sectionLabel}>GROUPS LOOKING FOR PEOPLE</h3>
            {groups.length === 0 ? (
              <EmptyState text="No groups match this filter yet — try a different suburb." />
            ) : (
              <div style={styles.cardsCol}>
                {groups.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} onSave={onSave} savedListings={savedListings} hasQuizzed={hasQuizzed} onTakeQuiz={onRestart} onView={onView} />
                ))}
              </div>
            )}
          </div>
 
          <div style={styles.resultsSection}>
            <h3 style={styles.sectionLabel}>PEOPLE LOOKING TO JOIN A GROUP</h3>
            {solos.length === 0 ? (
              <EmptyState text="No solo profiles match this filter yet — try a different suburb." />
            ) : (
              <div style={styles.cardsCol}>
                {solos.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} onSave={onSave} savedListings={savedListings} hasQuizzed={hasQuizzed} onTakeQuiz={onRestart} onView={onView} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
 
      <div style={styles.resultsActions}>
        <button style={styles.primaryBtn} onClick={onPost}>
          Post your own listing
        </button>
        <button style={styles.secondaryBtn} onClick={onRestart}>
          Retake the questionnaire
        </button>
      </div>
    </div>
  );
}
 
function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}
 

 
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "Just posted" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
 
function ViewCount({ listingId }) {
  const [views, setViews] = useState(null);
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(`views:${listingId}`);
        if (result) setViews(parseInt(result.value));
      } catch {}
      try {
        const result = await window.storage.get(`views:${listingId}`);
        const current = result ? parseInt(result.value) : 0;
        await window.storage.set(`views:${listingId}`, String(current + 1));
      } catch {}
    }
    load();
  }, [listingId]);
  if (!views || views < 3) return null;
  return <span style={{ fontSize: 11, color: COLORS.inkSoft, marginLeft: 6 }}>{views} views</span>;
}

function FoundMyFlatBtn({ listingId }) {
  const [stage, setStage] = useState("idle");
  const [story, setStory] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (stage === "submitted") {
    return (
      <div style={foundStyles.successBox}>
        🎉 Thanks for sharing! Your story helps other students trust FlatMatch.
      </div>
    );
  }

  if (stage === "form") {
    return (
      <div style={foundStyles.formBox}>
        <div style={foundStyles.formHeading}>Tell us your story 🏠</div>
        <p style={foundStyles.formSubtext}>
          How did FlatMatch help? One or two sentences is perfect.
          It'll show on the homepage to help other students trust the app.
        </p>
        <textarea
          style={foundStyles.textarea}
          rows={3}
          placeholder='e.g. "Found my flat group in a week — everyone matched on the quiz and the vibe has been perfect."'
          value={story}
          onChange={e => setStory(e.target.value)}
        />
        <input
          style={foundStyles.input}
          type="text"
          placeholder="Your first name + year (e.g. Jamie, second-year)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <div style={foundStyles.formBtns}>
          <button
            style={foundStyles.submitBtn}
            disabled={!story.trim() || !name.trim() || submitting}
            onClick={async () => {
              if (!story.trim() || !name.trim()) return;
              setSubmitting(true);
              try {
                await window.storage.set(
                  `story:${listingId}:${Date.now()}`,
                  JSON.stringify({
                    story: story.trim(),
                    name: name.trim(),
                    listingId,
                    createdAt: Date.now(),
                  }),
                  true
                );
                setStage("submitted");
              } catch (err) {
                console.error("Failed to save story:", err);
                setStage("submitted");
              }
              setSubmitting(false);
            }}
          >
            {submitting ? "Sharing…" : "Share my story"}
          </button>
          <button
            style={foundStyles.cancelBtn}
            onClick={() => setStage("idle")}
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      style={foundStyles.nudgeBtn}
      onClick={() => setStage("form")}
    >
      🎉 Did FlatMatch help you find your flat? Share your story
    </button>
  );
}

const foundStyles = {
  nudgeBtn: {
    marginTop: 12,
    width: "100%",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#7C5CBF",
    background: "rgba(124,92,191,0.07)",
    border: "1.5px dashed #7C5CBF",
    borderRadius: 10,
    padding: "12px 16px",
    cursor: "pointer",
    textAlign: "center",
  },
  formBox: {
    marginTop: 14,
    background: "#f8f7ff",
    border: "1.5px solid #dde3f0",
    borderRadius: 14,
    padding: "20px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  formHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 17,
    fontWeight: 600,
    color: "#1a2540",
  },
  formSubtext: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    color: "#718096",
    lineHeight: 1.6,
  },
  textarea: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    padding: "12px 14px",
    border: "1.5px solid #dde3f0",
    borderRadius: 10,
    background: "#fff",
    color: "#1a2540",
    resize: "vertical",
    lineHeight: 1.6,
  },
  input: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    padding: "10px 14px",
    border: "1.5px solid #dde3f0",
    borderRadius: 10,
    background: "#fff",
    color: "#1a2540",
  },
  formBtns: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  submitBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    padding: "11px 24px",
    background: "#7C5CBF",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  cancelBtn: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    padding: "11px 18px",
    background: "transparent",
    color: "#718096",
    border: "1.5px solid #dde3f0",
    borderRadius: 10,
    cursor: "pointer",
  },
  successBox: {
    marginTop: 12,
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#2d3f7c",
    background: "rgba(45,63,124,0.07)",
    border: "1.5px solid rgba(45,63,124,0.2)",
    borderRadius: 10,
    padding: "12px 16px",
    textAlign: "center",
    lineHeight: 1.6,
  },
};

function ListingCard({ listing, onMarkFilled, sessionContact, onSave, savedListings, hasQuizzed, onTakeQuiz, onView }) {
  const [revealed, setRevealed] = useState(false);
  const tokens = JSON.parse(localStorage.getItem('fm_tokens') || '{}');
  const isOwner = !!tokens[listing.id];
  const isSaved = savedListings && savedListings.includes(listing.id);
  const daysLeft = listing.expiresAt
    ? Math.max(0, Math.ceil((listing.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const spotsLeft = listing.spotsNeeded ?? null;
  return (
    <div className="fm-card" style={{ ...styles.card, cursor: onView ? "pointer" : "default" }} onClick={() => onView && onView(listing)}>
      <div style={styles.cardTopRow}>
        <div style={{ ...styles.avatar, background: "#F7F6F2", padding: 4 }}>
          <Logo size={32} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            <div style={styles.cardTitle}>{listing.crew || listing.title}</div>
            {listing.seeking && (
              <div style={styles.cardSeeking}>{listing.seeking}</div>
            )}
            {spotsLeft !== null && (
              <span style={styles.spotsBadge}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} open</span>
            )}
          </div>
          <div style={styles.cardMeta}>
            {listing.area} · {listing.budget} · Move in {listing.moveIn}
            {listing.distanceKm != null ? ` · ~${listing.distanceKm}km from campus` : ""}
          </div>
          <div style={styles.cardPostedDate}>{timeAgo(listing.renewedAt || listing.createdAt)}<ViewCount listingId={listing.id} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {hasQuizzed
            ? <div style={styles.matchBadge}>{listing.score}% match</div>
            : <button style={styles.matchPrompt} onClick={(e) => { e.stopPropagation(); onTakeQuiz(); }}>Quiz me for compatibility ✦</button>
          }
          {onSave && (
            <button
              style={styles.bookmarkBtn}
              onClick={(e) => { e.stopPropagation(); onSave(listing.id); }}
              title={isSaved ? "Remove from saved" : "Save listing"}
              aria-label={isSaved ? "Remove from saved" : "Save listing"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill={isSaved ? COLORS.teal : "none"} stroke={COLORS.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
      {listing.photo && (
        <img
          src={listing.photo}
          alt="Flat"
          style={styles.listingPhoto}
        />
      )}
      {daysLeft !== null && daysLeft <= 7 && (
        <div style={styles.expiryWarning}>
          Listing expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""} — renew to stay visible
        </div>
      )}
      {isOwner && (
        <button style={styles.markFilledBtn} onClick={(e) => { e.stopPropagation(); onMarkFilled && onMarkFilled(listing.id); }}>
          ✓ Mark as filled — remove listing
        </button>
      )}
      {listing.listingType === "room" && (
        <div style={{ ...styles.typeBadge, background: "#1A909018", color: "#1A9090", borderColor: "#1A9090" }}>
          Room available
        </div>
      )}
      {listing.listingType === "group" && (
        <div style={{ ...styles.typeBadge, background: "#8B7BB518", color: "#8B7BB5", borderColor: "#8B7BB5" }}>
          Group looking for one more
        </div>
      )}
      <StatusBadge status={listing.status || "looking"} />
      <p style={styles.cardBio}>{listing.bio}</p>
      {revealed && listing.contact ? (
        <div>
          <div style={styles.contactReveal}>
            Get in touch: <strong>{listing.contact}</strong>
          </div>
          <FoundMyFlatBtn listingId={listing.id} />
        </div>
      ) : (
        <button
          style={styles.requestBtn}
          onClick={async (e) => {
            e.stopPropagation();
            setRevealed(true);
            try {
              const current = await window.storage.get("metric:connection_requests", true);
              const count = current ? parseInt(current.value) : 0;
              await window.storage.set("metric:connection_requests", String(count + 1), true);
            } catch {}
          }}
          disabled={!listing.contact}
        >
          {listing.contact ? "Request to join" : "Sample listing"}
        </button>
      )}
    </div>
  );
}
 const SMOKING_LABELS = {
  smoke_free: "Smoke-free — no smoking or vaping",
  outside_only: "Outside only",
  smoking_ok: "Fine inside sometimes",
  any: "No restrictions on smoking",
  neutral: "Not specified",
};

const PET_LABELS = {
  no_pets: "No pets",
  small_pets: "Small pets are fine",
  pets_ok: "Pets are welcome",
  pet_friendly: "Very pet-friendly",
  neutral: "Not specified",
};

const DIMENSION_DISPLAY_LABELS = {
  life_stage: "Age / life stage",
  social_lifestyle: "Social lifestyle",
  cleanliness: "Cleanliness",
  noise_tolerance: "Noise levels",
  study_environment: "Study environment",
  guests_hosting: "Guests & hosting",
  communication_style: "Communication",
  daily_routine: "Daily routine",
  shared_living: "Shared living",
  cooking_food: "Cooking & food",
  independence_communal: "Independence",
};

function describeDimension(key, value) {
  const rounded = Math.max(1, Math.min(4, Math.round(value)));
  const scales = {
    life_stage: ["Mostly 18–19", "Mostly 20–21", "Mostly 22–23", "Mostly 24+"],
    cleanliness: ["Pretty relaxed about mess", "A bit messy sometimes", "Clean, but lived-in", "Tidy most of the time"],
    noise_tolerance: ["Quiet most days", "Quiet weeknights, louder weekends", "Fairly lively", "Loud and social most of the time"],
    guests_hosting: ["Rarely has guests over", "Occasional guests, with a heads-up", "Fairly often has guests", "Very social, guests all the time"],
  };
  if (scales[key]) return scales[key][rounded - 1];
  const generic = ["Low", "Below average", "Above average", "High"];
  return `${generic[rounded - 1]} ${DIMENSION_DISPLAY_LABELS[key]?.toLowerCase() || key}`;
}

function ListingDetail({ listing, onBack, onMarkFilled, sessionContact, onSave, savedListings }) {
  const [revealed, setRevealed] = useState(false);
  const tokens = JSON.parse(localStorage.getItem('fm_tokens') || '{}');
  const isOwner = !!tokens[listing.id];
  const isSaved = savedListings && savedListings.includes(listing.id);
  const spotsLeft = listing.spotsNeeded ?? null;

  const dealBreakers = listing.dealBreakers || {};
  const dimensions = listing.fullQuizProfile?.dimensions || listing.miniQuizProfile?.dimensions || null;

  const vibeTagLabels = Object.keys(listing.tags || {})
    .map((key) => NZ_TAG_OPTIONS.find((t) => t.key === key)?.label)
    .filter(Boolean);

  return (
    <div style={styles.formWrap}>
      <div style={{ width: "100%", display: "flex", justifyContent: "flex-start", marginBottom: 20 }}>
        <button
          type="button"
          onClick={onBack}
          style={{ border: "none", background: "transparent", color: COLORS.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          ← Back
        </button>
      </div>

      {listing.photo ? (
        <img src={listing.photo} alt="Flat" style={{ width: "100%", maxHeight: 340, objectFit: "cover", borderRadius: 16, marginBottom: 20 }} />
      ) : (
        <div style={{
          width: "100%",
          height: 160,
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(45,63,124,0.06), rgba(124,92,191,0.10))",
          border: "1.5px solid #dde3f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 28 }}>🏠</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: COLORS.inkSoft }}>
            No photo provided
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, marginBottom: 6 }}>
        <h1 style={{ ...styles.h2, marginBottom: 0 }}>{listing.crew || listing.title}</h1>
        {spotsLeft !== null && (
          <span style={styles.spotsBadge}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} open</span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <StatusBadge status={listing.status || "looking"} />
      </div>
      <div style={{ fontSize: 14, color: COLORS.inkSoft, marginBottom: 20, textAlign: "center" }}>
        {listing.area} · {listing.budget} · Move in {listing.moveIn}
        {listing.distanceKm != null ? ` · ~${listing.distanceKm}km from campus` : ""}
      </div>

      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ ...styles.sectionLabel, marginBottom: 10 }}>ABOUT</div>
        <p style={{ fontSize: 15, lineHeight: 1.75, color: COLORS.ink, wordBreak: "break-word" }}>{listing.bio}</p>
      </div>

      {vibeTagLabels.length > 0 && (
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ ...styles.sectionLabel, marginBottom: 10 }}>VIBE TAGS</div>
          <div style={{ ...styles.tagGrid, justifyContent: "center" }}>
            {vibeTagLabels.map((label) => (
              <span key={label} style={styles.tagBtnActive}>{label}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <div style={{ ...styles.sectionLabel, marginBottom: 10 }}>FLAT CHARACTERISTICS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 14, color: COLORS.ink }}>
            🚬 <strong>Smoking:</strong> {SMOKING_LABELS[dealBreakers.smoking] || "Not specified"}
          </div>
          <div style={{ fontSize: 14, color: COLORS.ink }}>
            🐾 <strong>Pets:</strong> {PET_LABELS[dealBreakers.pets] || "Not specified"}
          </div>
        </div>
      </div>

      {dimensions && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ ...styles.sectionLabel, marginBottom: 10 }}>HOW THIS FLAT LIVES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(dimensions).map(([key, value]) => (
              <div key={key} style={{ fontSize: 14, color: COLORS.ink, display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0", paddingBottom: 6 }}>
                <span style={{ color: COLORS.inkSoft }}>{DIMENSION_DISPLAY_LABELS[key] || key}</span>
                <span style={{ fontWeight: 600 }}>{describeDimension(key, value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOwner && (
        <button style={styles.markFilledBtn} onClick={() => onMarkFilled && onMarkFilled(listing.id)}>
          ✓ Mark as filled — remove listing
        </button>
      )}

      <div style={{ marginTop: 12 }}>
        {revealed && listing.contact ? (
          <div style={styles.contactReveal}>
            Get in touch: <strong>{listing.contact}</strong>
          </div>
        ) : (
          <button
            style={{ ...styles.requestBtn, width: "100%", padding: "16px" }}
            onClick={async () => {
              setRevealed(true);
              try {
                const current = await window.storage.get("metric:connection_requests", true);
                const count = current ? parseInt(current.value) : 0;
                await window.storage.set("metric:connection_requests", String(count + 1), true);
              } catch {}
            }}
            disabled={!listing.contact}
          >
            {listing.contact ? "Request to join" : "Sample listing"}
          </button>
        )}
      </div>
    </div>
  );
}
/* ---------------------------------------------
   POST FORM
--------------------------------------------- */
 
const NZ_TAG_OPTIONS = [
  { key: "quiet", label: "Quiet / chill weeknights" },
  { key: "social", label: "Social, people often over" },
  { key: "early", label: "Early risers / routine-focused" },
  { key: "night", label: "Night owls" },
  { key: "tidy", label: "Tidy, chore roster" },
  { key: "chill", label: "Easy-going, low-key" },
  { key: "budget", label: "Budget-focused" },
];
 
function emptyForm() {
  const institution = localStorage.getItem("fm_institution") || "uc";
  return {
    title: "",
    people: "1",
    spotsNeeded: "1",
    city: cityFromInstitution(institution),
    suburb: "",
    budget: "",
    moveIn: "",
    bio: "",
    contact: "",
    selectedTags: [],
    institution,
  };
}
 
const STATUS_OPTIONS = [
  { key: "looking", label: "Actively looking", color: "#1A9090", dot: "#1A9090" },
  { key: "almost", label: "Almost full — 1 spot left", color: "#E8A030", dot: "#E8A030" },
  { key: "urgent", label: "Need someone ASAP", color: "#E8746A", dot: "#E8746A" },
  { key: "future", label: "Planning ahead — not urgent yet", color: "#7C5CBF", dot: "#7C5CBF" },
  { key: "paused", label: "Taking a break", color: "#9AAAB0", dot: "#9AAAB0" },
];
 
function StatusBadge({ status }) {
  const s = STATUS_OPTIONS.find(o => o.key === status) || STATUS_OPTIONS[0];
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 12, fontWeight: 600, color: s.color,
      background: `${s.color}18`, borderRadius: 999, padding: "4px 10px",
      marginBottom: 10,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: s.dot,
        display: "inline-block",
        animation: status === "looking" ? "pulse 2s infinite" : "none",
      }} />
      {s.label}
    </div>
  );
}
 
function PostForm({ onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [miniQuizOpen, setMiniQuizOpen] = useState(true);
  const [fullQuizOpen, setFullQuizOpen] = useState(false);
  const [miniQuizAnswers, setMiniQuizAnswers] = useState({});
  const [fullQuizAnswers, setFullQuizAnswers] = useState({});
  const [step, setStep] = useState(1);
 
  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setValidationError("Please upload a JPG, PNG, or WEBP image — other formats (like HEIC or GIF) aren't supported yet.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setValidationError("That image couldn't be loaded — try a different file.");
      e.target.value = "";
    };
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        setValidationError(null);
        setPhoto(reader.result);
        setPhotoPreview(reader.result);
      };
      img.onerror = () => {
        setValidationError("That image couldn't be loaded — try a different file.");
        e.target.value = "";
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
 
  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }
 
  function toggleTag(key) {
    setForm((prev) => {
      const has = prev.selectedTags.includes(key);
      return {
        ...prev,
        selectedTags: has
          ? prev.selectedTags.filter((t) => t !== key)
          : [...prev.selectedTags, key],
      };
    });
  }
 
  function updateMiniQuiz(questionId, value) {
    setMiniQuizAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function updateFullQuiz(questionId, value) {
    setFullQuizAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleNext(e) {
    e.preventDefault();
    setValidationError(null);

    if (!form.suburb || !form.budget.trim() || !form.moveIn.trim() || !form.bio.trim() || !form.contact.trim()) {
      setValidationError("Please fill in all fields so people know what they're looking at.");
      return;
    }
    if (form.selectedTags.length === 0) {
      setValidationError("Pick at least one vibe tag — it's how matching works.");
      return;
    }

    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError(null);

    const miniQuizComplete = MINI_QUIZ_QUESTIONS.every((q) => miniQuizAnswers[q.id] != null);
    if (!miniQuizComplete) {
      setValidationError("Please answer every question so people get an accurate match.");
      return;
    }

    const tags = {};
    for (const key of form.selectedTags) {
      tags[key] = 2;
    }

    const miniQuizResult = buildMiniQuizProfile(miniQuizAnswers);
    const miniQuizProfile = Object.keys(miniQuizResult.dimensions).length > 0
      ? { dimensions: miniQuizResult.dimensions }
      : null;

    const fullQuizProfileData = buildCompatibilityProfile(fullQuizAnswers);
    const fullQuizProfile = Object.keys(fullQuizAnswers).length > 0
      ? {
          dimensions: fullQuizProfileData.dimensions,
          dealBreakers: fullQuizProfileData.dealBreakers,
          housingPreferences: fullQuizProfileData.housingPreferences,
        }
      : null;

    // full quiz deal-breakers win if taken; otherwise use mini quiz's
    const dealBreakers = {
      smoking: fullQuizProfile?.dealBreakers?.smoking ?? miniQuizResult.dealBreakers.smoking ?? 'neutral',
      pets: fullQuizProfile?.dealBreakers?.pets ?? miniQuizResult.dealBreakers.pets ?? 'neutral',
    };
 
    const people = parseInt(form.people, 10) || 1;
    const spotsNeeded = parseInt(form.spotsNeeded, 10) || 1;
    const title = form.title.trim() || `${people} looking for ${spotsNeeded} more`;
 
    setSubmitting(true);
    await onSubmit({
      listingType: "room",
      type: "group",
      title,
      people,
      spotsNeeded,
      suburb: form.suburb,
      area: form.suburb,
      distanceKm: suburbDistance(form.suburb, form.city),
      city: form.city,
      budget: form.budget.trim(),
      moveIn: form.moveIn.trim(),
      bio: form.bio.trim(),
      contact: form.contact.trim(),
      tags,
      photo: photo || null,
      institution: form.institution,
      miniQuizProfile,
      fullQuizProfile,
      dealBreakers,
    });
    setSubmitting(false);
  }
 
  return (
    <div style={styles.formWrap}>
      <LogoLockup size={32} align="left" />
      <h1 style={styles.h2}>Post your listing</h1>
      <p style={styles.intro}>
        A couple of minutes now means people who'd actually fit can find you.
      </p>
 
      <form onSubmit={step === 1 ? handleNext : handleSubmit} style={styles.form}>
        {step === 1 && (
        <>
        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>How many people are in your flat?</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              max="10"
              value={form.people}
              onChange={(e) => update("people", e.target.value)}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>How many spots open?</label>
            <input
              style={styles.input}
              type="number"
              min="1"
              max="10"
              value={form.spotsNeeded}
              onChange={(e) => update("spotsNeeded", e.target.value)}
            />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Listing title (optional)</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. 2 looking for 2 chill flatmates"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>
 
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Which city?</label>
          <select
            style={styles.input}
            value={form.city}
            onChange={(e) => { update("city", e.target.value); update("suburb", ""); }}
          >
            {Object.entries(NZ_CITIES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Which suburb?</label>
            <select
              style={styles.input}
              value={form.suburb}
              onChange={(e) => update("suburb", e.target.value)}
            >
              <option value="" disabled>Select a suburb</option>
              {(NZ_CITIES[form.city]?.suburbs || []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.distanceKm != null ? ` (~${s.distanceKm}km from campus)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Rent cost (per week)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. $200-220pw"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
            />
          </div>
        </div>
 
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Move-in date</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Feb 2027, or Now"
            value={form.moveIn}
            onChange={(e) => update("moveIn", e.target.value)}
          />
        </div>
 
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tell people about your group — vibe, routines, what you're after</label>
          <textarea
            style={styles.textarea}
            rows={4}
            maxLength={500}
            placeholder="Keep it real — this is what people match on"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value.slice(0, 500))}
          />
          <div style={{ fontSize: 11.5, color: COLORS.inkSoft, textAlign: "right" }}>
            {form.bio.length}/500 characters
          </div>
        </div>
 
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Flat photo (optional but recommended)</label>
          <div style={styles.photoUploadBox}>
            {photoPreview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={photoPreview} alt="Flat preview" style={styles.photoPreview} />
                <button
                  type="button"
                  style={styles.removePhotoBtn}
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <label style={styles.photoUploadLabel} htmlFor="photo-input">
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ fontSize: 13, color: COLORS.inkSoft }}>Add a photo of your flat or crew</span>
                <span style={{ fontSize: 11, color: COLORS.inkSoft, opacity: 0.8 }}>Makes your listing stand out</span>
                <input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </div>
 
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Vibe tags — pick what fits (at least 1)</label>
          <div style={styles.tagGrid}>
            {NZ_TAG_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                style={
                  form.selectedTags.includes(opt.key)
                    ? styles.tagBtnActive
                    : styles.tagBtn
                }
                onClick={() => toggleTag(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Your university or polytechnic</label>
          <select
            style={styles.input}
            value={form.institution}
            onChange={(e) => update("institution", e.target.value)}
          >
            {NZ_INSTITUTIONS.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Contact (email, Instagram, phone — your call)</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. @yourhandle or email"
            value={form.contact}
            onChange={(e) => update("contact", e.target.value)}
          />
        </div>

        {(validationError || error) && (
          <div style={styles.formError}>{validationError || error}</div>
        )}

        <div style={styles.formActions}>
          <button type="submit" style={styles.primaryBtn}>
            Next: compatibility quiz →
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
        </>
        )}

        {step === 2 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => { setValidationError(null); setStep(1); }}
              style={{ border: "none", background: "transparent", color: COLORS.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              ← Back
            </button>
          </div>

          <div style={{ ...styles.fieldGroup, marginBottom: 22 }}>
            <button
              type="button"
              onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ width: "100%", textAlign: "left", border: "2px solid #2d3f7c", borderRadius: 16, padding: "16px 18px", background: "linear-gradient(135deg, rgba(45,63,124,0.06), rgba(124,92,191,0.08))", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2d3f7c", marginBottom: 4 }}>
                  Want even sharper matches? ✦
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.5 }}>
                  Take the full compatibility quiz — 2 extra minutes, better matches for everyone who finds your listing.
                </div>
              </div>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: "#fff", background: "#2d3f7c", borderRadius: 10, padding: "10px 18px", whiteSpace: "nowrap" }}>
                Take full quiz →
              </span>
            </button>
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ border: "1.5px solid rgba(26,144,144,0.35)", borderRadius: 16, padding: 16, background: "#f5fbfb" }}>
              <strong style={{ fontSize: 16, color: COLORS.ink, display: "block", marginBottom: 4 }}>Your flat's compatibility quiz</strong>
              <p style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 16, lineHeight: 1.6 }}>
                Every question here feeds straight into how well you're matched with searchers — answer honestly for the best matches.
              </p>
              <div style={{ display: "grid", gap: 12 }}>
                {MINI_QUIZ_QUESTIONS.map((q) => (
                  <div key={q.id} style={{ border: "1px solid #dde9e9", borderRadius: 12, padding: 10, background: "#fff" }}>
                    <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}>{q.text}</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {q.options.map((opt, idx) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => updateMiniQuiz(q.id, idx)}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderRadius: 10,
                            border: miniQuizAnswers[q.id] === idx ? "1px solid #2d3f7c" : "1px solid #e7ebf2",
                            background: miniQuizAnswers[q.id] === idx ? "#f4f7ff" : "#fff",
                            cursor: "pointer",
                            color: COLORS.ink,
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(validationError || error) && (
            <div style={styles.formError}>{validationError || error}</div>
          )}

          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryBtn} disabled={submitting}>
              {submitting ? "Posting…" : "Post listing"}
            </button>
            <button type="button" style={styles.secondaryBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
        )}

        {step === 3 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => { setValidationError(null); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ border: "none", background: "transparent", color: COLORS.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0 }}
            >
              ← Back
            </button>
          </div>

          <div style={styles.fieldGroup}>
            <strong style={{ fontSize: 16, color: COLORS.ink, display: "block", marginBottom: 4 }}>Full compatibility quiz</strong>
            <p style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 16, lineHeight: 1.6 }}>
              This is optional — but the more you answer, the sharper your matches will be for people browsing your listing.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {QUESTIONS.map((q) => (
                <div key={q.id} style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 10, background: "#fff" }}>
                  <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}>{q.text}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {q.options.map((opt, idx) => (
                      <button
                        key={`${q.id}-${idx}`}
                        type="button"
                        onClick={() => updateFullQuiz(q.id, idx)}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: fullQuizAnswers[q.id] === idx ? "1px solid #2d3f7c" : "1px solid #e7ebf2",
                          background: fullQuizAnswers[q.id] === idx ? "#f4f7ff" : "#fff",
                          cursor: "pointer",
                          color: COLORS.ink,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(validationError || error) && (
            <div style={styles.formError}>{validationError || error}</div>
          )}

          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryBtn} disabled={submitting}>
              {submitting ? "Posting…" : "Post listing"}
            </button>
            <button type="button" style={styles.secondaryBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
        )}
      </form>
 
      <p style={styles.shareNote}>
        Your listing is visible to anyone using FlatMatch — only share
        contact details you're comfortable being public.
      </p>
    </div>
  );
}
 
/* ---------------------------------------------
   POSTED CONFIRMATION
--------------------------------------------- */
 
function PostedConfirmation({ onBrowse, onTakeQuiz }) {
  return (
    <div style={styles.introWrap}>
      <LogoLockup size={40} align="center" />
      <h1 style={styles.h2}>You're on the board 🎉</h1>
      <p style={styles.intro}>
        Your listing is live and will show up in everyone's ranked matches
        based on compatibility. Share FlatMatch with your group chats so
        people can actually find it.
      </p>
      <div style={styles.formActions}>
        <button className="fm-primary-btn" style={styles.primaryBtn} onClick={onTakeQuiz}>
          Take the quiz yourself
        </button>
        <button className="fm-secondary-btn" style={styles.secondaryBtn} onClick={onBrowse}>
          Back to home
        </button>
      </div>
    </div>
  );
}
 
/* ---------------------------------------------
   FOOTER
--------------------------------------------- */

function Footer() {
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <footer style={footerStyles.footer}>

      {/* ── COMMUNITY STRIP ── */}
      <div style={footerStyles.communityStrip}>
        <div style={footerStyles.communityInner}>
          <div style={footerStyles.communityLeft}>
            <div style={footerStyles.betaBadge}>🚧 Early development</div>
            <h3 style={footerStyles.communityHeading}>
              FlatMatch only works if students use it.
            </h3>
            <p style={footerStyles.communityBody}>
              FlatMatch is a free tool built for NZ students. We're just getting started — the more people who post and take the quiz, the more useful it becomes for everyone. If this helped you, please share it.
            </p>
            <div style={footerStyles.shareNudge}>
              📲 Send it to your halls group chat
            </div>
          </div>
          <div style={footerStyles.communityRight}>
            <a
              href="https://instagram.com/flatmatch_nz"
              target="_blank"
              rel="noopener noreferrer"
              style={footerStyles.instaBtn}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
              </svg>
              @flatmatch_nz
            </a>
            <p style={footerStyles.communityNote}>
              Built by UC students · Not affiliated with the University of Canterbury
            </p>
          </div>
        </div>
      </div>

      {/* ── PRIVACY SECTION ── */}
      <div style={footerStyles.privacySection}>
        <button
          style={footerStyles.privacyToggle}
          onClick={() => setPrivacyOpen(o => !o)}
        >
          <span>Privacy &amp; data</span>
          <span>{privacyOpen ? "▴" : "▾"}</span>
        </button>
        {privacyOpen && (
          <div style={footerStyles.privacyContent}>
            <div style={footerStyles.privacyGrid}>
              <div style={footerStyles.privacyItem}>
                <div style={footerStyles.privacyItemTitle}>What we store</div>
                <div style={footerStyles.privacyItemBody}>
                  Only active listings. When a listing is marked as filled and deleted, it is gone permanently — we don't keep it anywhere.
                </div>
              </div>
              <div style={footerStyles.privacyItem}>
                <div style={footerStyles.privacyItemTitle}>Your quiz answers</div>
                <div style={footerStyles.privacyItemBody}>
                  Saved only on your own device. We never see them. Clear your browser data and they're gone.
                </div>
              </div>
              <div style={footerStyles.privacyItem}>
                <div style={footerStyles.privacyItemTitle}>Be careful what you share</div>
                <div style={footerStyles.privacyItemBody}>
                  Your listing is visible to anyone on FlatMatch. We recommend using an Instagram handle or a spare email in your contact field — not your personal phone number.
                </div>
              </div>
              <div style={footerStyles.privacyItem}>
                <div style={footerStyles.privacyItemTitle}>We don't sell your data</div>
                <div style={footerStyles.privacyItemBody}>
                  We don't share your information with third parties, run ads, or require an account. This is a student project — keeping it simple and honest is the whole point.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={footerStyles.bottomBar}>
        <span>© 2026 FlatMatch · Made for NZ students</span>
      </div>

    </footer>
  );
}

const footerStyles = {
  footer: {
    width: "100%",
    borderTop: "1px solid #dde3f0",
    marginTop: 60,
  },
  communityStrip: {
    background: "#2d3f7c",
    width: "100%",
  },
  communityInner: {
    maxWidth: "100%",
    margin: "0 auto",
    padding: "52px 24px",
    display: "flex",
    gap: 48,
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  communityLeft: {
    flex: 2,
    minWidth: 280,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  communityRight: {
    flex: 1,
    minWidth: 200,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    alignItems: "flex-start",
  },
  betaBadge: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#a78bfa",
    background: "rgba(167,139,250,0.15)",
    borderRadius: 999,
    padding: "4px 12px",
    display: "inline-block",
  },
  communityHeading: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(20px, 3vw, 26px)",
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.3,
  },
  communityBody: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    lineHeight: 1.75,
    color: "rgba(255,255,255,0.75)",
    maxWidth: 460,
  },
  shareNudge: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    background: "rgba(255,255,255,0.10)",
    border: "1.5px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "12px 20px",
    display: "inline-block",
  },
  instaBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    background: "#7C5CBF",
    border: "none",
    borderRadius: 10,
    padding: "12px 20px",
    textDecoration: "none",
    cursor: "pointer",
  },
  communityNote: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 1.6,
  },
  privacySection: {
    maxWidth: 1400,
    margin: "0 auto",
    padding: "0 24px",
    width: "100%",
    boxSizing: "border-box",
  },
  privacyToggle: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "#4a5568",
    background: "none",
    border: "none",
    borderBottom: "1px solid #dde3f0",
    padding: "18px 0",
    cursor: "pointer",
    textAlign: "left",
  },
  privacyContent: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  privacyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 24,
  },
  privacyItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  privacyItemTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: "#1a2540",
  },
  privacyItemBody: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    lineHeight: 1.65,
    color: "#718096",
  },
  bottomBar: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 24px",
    borderTop: "1px solid #dde3f0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: "#a0aec0",
    textAlign: "center",
  },
};
 
const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; margin: 0; padding: 0; width: 100%; overflow-x: hidden; }
  #root { width: 100%; }
 
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');
 
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.85); }
  }
  @keyframes cardSlam {
    0% { transform: scale(0.92) translateY(12px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .stamp-anim { animation: cardSlam 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  @media (prefers-reduced-motion: reduce) {
    .stamp-anim { animation: none !important; }
  }
 
  button:focus-visible, .stamp-anim:focus-visible {
    outline: 3px solid #5FA8A0;
    outline-offset: 2px;
  }
  .fm-card {
    transition: box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  }
  .fm-card:hover {
    box-shadow: 0 4px 16px rgba(35,54,58,0.10);
    transform: translateY(-2px);
    border-color: #b0c4c8;
  }
  .fm-option-btn {
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }
  .fm-option-btn:hover {
    border-color: #1A9090;
    background: #F7F6F2;
    transform: translateX(3px);
  }
  .fm-option-btn:active {
    transform: translateX(1px) scale(0.99);
  }
  .fm-primary-btn {
    transition: background 0.15s ease, transform 0.12s ease, opacity 0.15s ease;
  }
  .fm-primary-btn:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  .fm-primary-btn:active {
    transform: translateY(0) scale(0.98);
  }
  .fm-secondary-btn {
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }
  .fm-secondary-btn:hover {
    background: #1E2B2E;
    color: #fff;
    transform: translateY(-1px);
  }
  .fm-secondary-btn:active {
    transform: translateY(0) scale(0.98);
  }
  .fm-request-btn {
    transition: background 0.15s ease, color 0.15s ease, transform 0.12s ease;
  }
  .fm-request-btn:hover {
    background: #1A9090;
    color: #fff;
    transform: translateY(-1px);
  }
  .fm-nav-link:hover {
    color: #1E2B2E !important;
  }
  .fm-nav-cta:hover {
    opacity: 0.85;
  }
  .hero-card {
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }
  .hero-card:hover {
    border-color: #1A9090;
    box-shadow: 0 8px 24px rgba(26,144,144,0.15);
    transform: translateY(-4px);
  }
  .hero-btn {
    transition: background 0.15s ease, transform 0.12s ease;
  }
  .hero-btn:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  .hero-btn:active {
    transform: translateY(0) scale(0.98);
  }
`;
 
const FONT_DISPLAY = "'DM Serif Display', Georgia, serif";
const FONT_BODY = "'Inter', sans-serif";
 
const COLORS = {
  paper: "#F7F6F2",
  ink: "#1E2B2E",
  coral: "#E8746A",
  teal: "#1A9090",
  yellow: "#FFF3E0",
  inkSoft: "#5A6B6E",
  cardBg: "#FFFFFF",
  border: "#E2E5E4",
};
 
const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.paper,
    color: COLORS.ink,
    fontFamily: FONT_BODY,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: "64px 0 0",
  },
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    background: COLORS.paper,
    borderBottom: `1px solid ${COLORS.border}`,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
  },
  navInner: {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  navLogoText: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: 600,
    color: COLORS.ink,
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  navLink: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 500,
    color: COLORS.inkSoft,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 8,
    transition: "color 0.15s ease",
  },
  navCta: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    background: "#7C5CBF",
    border: "none",
    cursor: "pointer",
    padding: "8px 18px",
    borderRadius: 8,
  },
  navSaved: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.ink,
    background: "transparent",
    border: `1.5px solid ${COLORS.ink}`,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 8,
    transition: "background 0.15s ease, color 0.15s ease",
  },
  navQuiz: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.teal,
    background: `${COLORS.teal}12`,
    border: `1.5px solid ${COLORS.teal}`,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 8,
  },
  navDropdownBtn: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.teal,
    background: `${COLORS.teal}12`,
    border: `1.5px solid ${COLORS.teal}`,
    cursor: "pointer",
    padding: "8px 16px",
    borderRadius: 8,
    transition: "background 0.15s ease",
  },
  navDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "#fff",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 14,
    boxShadow: "0 8px 24px rgba(35,54,58,0.12)",
    minWidth: 220,
    zIndex: 200,
    overflow: "hidden",
  },
  navDropdownItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    width: "100%",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.15s ease",
  },
  navDropdownLabel: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    color: COLORS.ink,
  },
  navDropdownSub: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  navDropdownDivider: {
    height: 1,
    background: COLORS.border,
    margin: "0 16px",
  },
  footer: {
    width: "100%",
    borderTop: `1px solid ${COLORS.border}`,
    marginTop: 60,
    paddingTop: 40,
    paddingBottom: 32,
  },
  footerInner: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "0 24px",
    display: "flex",
    gap: 48,
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  footerLeft: { maxWidth: 220 },
  footerBrand: {
    fontFamily: FONT_DISPLAY,
    fontSize: 15,
    fontWeight: 600,
    color: COLORS.ink,
  },
  footerTagline: {
    fontSize: 13,
    color: COLORS.inkSoft,
    lineHeight: 1.6,
  },
  footerLinks: {
    display: "flex",
    gap: 40,
    flexWrap: "wrap",
  },
  footerCol: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 160,
  },
  footerColHead: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: COLORS.ink,
    marginBottom: 4,
  },
  footerColItem: {
    fontSize: 13,
    color: COLORS.inkSoft,
    lineHeight: 1.5,
  },
  footerBottom: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "16px 24px 0",
    borderTop: `1px solid ${COLORS.border}`,
    fontSize: 12,
    color: COLORS.inkSoft,
  },
  introWrap: {
    maxWidth: 760,
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "0 auto",
    padding: "60px 24px",
    alignSelf: "center",
  },
  eyebrow: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    letterSpacing: "0.2em",
    fontWeight: 600,
    color: COLORS.teal,
    marginBottom: 16,
  },
  h1: {
    fontFamily: FONT_DISPLAY,
    fontSize: "clamp(28px, 4vw, 40px)",
    fontWeight: 600,
    lineHeight: 1.2,
    marginBottom: 16,
    textAlign: "center",
  },
  highlight: { color: COLORS.coral },
  intro: {
    fontSize: 16,
    lineHeight: 1.7,
    color: COLORS.inkSoft,
    maxWidth: 560,
    margin: "0 auto 24px",
    textAlign: "center",
  },
  introMeta: {
    fontSize: 13,
    color: COLORS.inkSoft,
    marginBottom: 32,
    display: "flex",
    justifyContent: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  dot: { color: COLORS.border },
  primaryBtn: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: 600,
    padding: "16px 36px",
    background: COLORS.ink,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    boxShadow: "none",
  },
  secondaryBtn: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 28px",
    background: "transparent",
    color: COLORS.ink,
    border: `1.5px solid ${COLORS.ink}`,
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 24,
  },
  quizWrap: {
    maxWidth: 860,
    width: "100%",
    padding: "40px 24px",
    margin: "0 auto",
    alignSelf: "center",
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.inkSoft,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 0",
  },
  progressText: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.inkSoft,
  },
  progressBarOuter: {
    height: 6,
    background: COLORS.border,
    borderRadius: 100,
    overflow: "hidden",
    marginBottom: 32,
  },
  progressBarInner: {
    height: "100%",
    background: "#7C5CBF",
    borderRadius: 100,
    transition: "width 0.3s ease",
  },
  question: {
    fontFamily: FONT_DISPLAY,
    fontSize: "clamp(22px, 5vw, 30px)",
    fontWeight: 600,
    lineHeight: 1.3,
    marginBottom: 28,
  },
  optionsCol: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  optionBtn: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 500,
    textAlign: "left",
    padding: "16px 20px",
    background: COLORS.cardBg,
    color: COLORS.ink,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 14,
    cursor: "pointer",
    lineHeight: 1.5,
    transition: "border-color 0.15s ease, transform 0.1s ease",
  },
  resultsWrap: {
    maxWidth: 1400,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 24px",
    margin: "0 auto",
    alignSelf: "center",
  },
  archetypeCard: {
    width: "100%",
    background: COLORS.ink,
    color: COLORS.paper,
    borderRadius: 24,
    padding: "36px 32px",
    textAlign: "left",
    marginBottom: 40,
    position: "relative",
    overflow: "hidden",
  },
  archetypeEyebrow: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    letterSpacing: "0.2em",
    fontWeight: 600,
    color: COLORS.yellow,
    marginBottom: 12,
  },
  archetypeName: {
    fontFamily: FONT_DISPLAY,
    fontSize: "clamp(24px, 4vw, 36px)",
    fontWeight: 700,
    marginBottom: 10,
    color: "#A78BFA",
  },
  archetypeTagline: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
    color: COLORS.paper,
  },
  archetypeDescription: {
    fontSize: 14.5,
    lineHeight: 1.7,
    color: "#D8D2E8",
    maxWidth: 460,
    marginLeft: "auto",
    marginRight: "auto",
  },
  resultsSection: {
    width: "100%",
    marginBottom: 32,
  },
  sectionLabel: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    letterSpacing: "0.14em",
    fontWeight: 600,
    color: COLORS.teal,
    marginBottom: 14,
  },
  cardsCol: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: COLORS.teal,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: 600,
    flexShrink: 0,
  },
  cardTopRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  cardPostedDate: {
    fontSize: 11,
    color: COLORS.inkSoft,
    marginTop: 3,
  },
  card: {
    background: COLORS.cardBg,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "20px 22px",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  cardTitle: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  matchBadge: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    color: "#1A6B2E",
    background: "#D4EDD4",
    borderRadius: 8,
    padding: "6px 14px",
    whiteSpace: "nowrap",
  },
  matchPrompt: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.teal,
    background: `${COLORS.teal}12`,
    border: `1.5px solid ${COLORS.teal}`,
    borderRadius: 8,
    padding: "6px 10px",
    whiteSpace: "nowrap",
    cursor: "pointer",
    maxWidth: 120,
    textAlign: "center",
    lineHeight: 1.3,
  },
  cardSeeking: {
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.teal,
    marginTop: 2,
  },
  cardBio: {
    fontSize: 14,
    lineHeight: 1.65,
    color: COLORS.ink,
    marginBottom: 14,
    wordBreak: "break-word",
    overflowWrap: "break-word",
  },
  requestBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 22px",
    background: "transparent",
    color: COLORS.teal,
    border: `1.5px solid ${COLORS.teal}`,
    borderRadius: 8,
    cursor: "pointer",
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    border: "1.5px solid",
    padding: "6px 14px",
    marginBottom: 10,
  },
  bookmarkBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.2s ease",
  },
  spotsBadge: {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.teal,
    background: `${COLORS.teal}18`,
    borderRadius: 999,
    padding: "2px 8px",
  },
  introPostRow: {
    marginTop: 20,
    fontSize: 13.5,
    color: COLORS.inkSoft,
  },
  linkBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13.5,
    fontWeight: 600,
    color: COLORS.coral,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  heroCta: {
    display: "flex",
    gap: 24,
    marginTop: 40,
    width: "100%",
    flexWrap: "wrap",
  },
  heroCard: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "36px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    textAlign: "center",
    justifyContent: "space-between",
    flex: 1,
    minWidth: "280px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  heroIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  heroHeading: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1.3,
    color: COLORS.ink,
    textAlign: "center",
  },
  heroSubtext: {
    fontSize: 14.5,
    lineHeight: 1.6,
    color: COLORS.inkSoft,
    textAlign: "center",
  },
  heroBtn: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: 700,
    padding: "14px 0",
    background: COLORS.teal,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    width: "100%",
    transition: "opacity 0.15s ease, transform 0.12s ease",
  },
  pathsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    marginTop: 28,
    width: "100%",
    textAlign: "left",
  },
  pathCard: {
    background: COLORS.cardBg,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "24px 26px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  pathCardPrimary: {
    background: COLORS.ink,
    border: `1.5px solid ${COLORS.ink}`,
    borderRadius: 20,
    padding: "24px 26px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
    color: COLORS.paper,
  },
  pathLabel: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    letterSpacing: "0.18em",
    fontWeight: 600,
    color: COLORS.yellow,
  },
  pathLabelSecondary: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    letterSpacing: "0.18em",
    fontWeight: 600,
    color: COLORS.teal,
  },
  pathTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 20,
    fontWeight: 600,
  },
  pathDescription: {
    fontSize: 14,
    lineHeight: 1.6,
    opacity: 0.9,
  },
  loadingNote: {
    textAlign: "center",
    fontSize: 14,
    color: COLORS.inkSoft,
    padding: "24px 0",
  },
  emptyState: {
    fontSize: 14,
    color: COLORS.inkSoft,
    background: COLORS.cardBg,
    border: `1.5px dashed ${COLORS.border}`,
    borderRadius: 16,
    padding: "20px 22px",
    textAlign: "center",
  },
  resultsActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    width: "100%",
  },
  contactReveal: {
    fontSize: 13.5,
    color: COLORS.ink,
    background: COLORS.yellow,
    borderRadius: 8,
    padding: "10px 18px",
    display: "inline-block",
  },
 formWrap: {
    maxWidth: 960,
    width: "100%",
    padding: "40px 24px",
    margin: "0 auto",
    alignSelf: "center",
  },
  h2: {
    fontFamily: FONT_DISPLAY,
    fontSize: "clamp(28px, 6vw, 38px)",
    fontWeight: 600,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginTop: 8,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  fieldRow: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
  },
  ucBadge: {
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.teal,
    background: "rgba(26,144,144,0.08)",
    borderRadius: 8,
    padding: "6px 14px",
    display: "inline-block",
    marginBottom: 16,
  },
  filterBar: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    width: "100%",
    background: COLORS.cardBg,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "16px 18px",
    marginBottom: 24,
  },
  label: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.ink,
  },
  input: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    padding: "12px 16px",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    background: COLORS.cardBg,
    color: COLORS.ink,
  },
  textarea: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    padding: "12px 16px",
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 12,
    background: COLORS.cardBg,
    color: COLORS.ink,
    resize: "vertical",
    lineHeight: 1.6,
  },
  toggleRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  toggleBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13.5,
    fontWeight: 500,
    padding: "12px 18px",
    borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.ink,
    cursor: "pointer",
  },
  toggleBtnActive: {
    fontFamily: FONT_BODY,
    fontSize: 13.5,
    fontWeight: 600,
    padding: "12px 18px",
    borderRadius: 8,
    border: "1.5px solid #7C5CBF",
    background: "#7C5CBF",
    color: "#FFFFFF",
    cursor: "pointer",
  },
  tagGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  tagBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 500,
    padding: "10px 16px",
    borderRadius: 8,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.cardBg,
    color: COLORS.ink,
    cursor: "pointer",
  },
  tagBtnActive: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 16px",
    borderRadius: 8,
    border: `1.5px solid ${COLORS.teal}`,
    background: COLORS.teal,
    color: "#FFFFFF",
    cursor: "pointer",
  },
  expiryWarning: {
    background: "#FFF8E7",
    border: "1.5px solid #FFD66B",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 12.5,
    color: "#8A6800",
    marginBottom: 10,
    fontWeight: 500,
  },
  markFilledBtn: {
    display: "inline-block",
    marginBottom: 12,
    padding: "8px 16px",
    background: "transparent",
    border: "1.5px solid #5FA8A0",
    color: "#5FA8A0",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  feeCard: {
    background: "#fff",
    border: "1.5px solid #E2E5E4",
    borderRadius: 18,
    padding: "22px",
    marginBottom: 24,
    boxShadow: "0 8px 24px rgba(35,54,58,0.07)",
  },
  feeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  feeLabel: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#1E2B2E" },
  feeAmount: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#ff6b4a" },
  feeMeta: { fontSize: 12.5, color: "#6b7e82", marginBottom: 14 },
  feeDivider: { height: 1, background: "#E2E5E4", marginBottom: 14 },
  feePoints: { display: "flex", flexDirection: "column", gap: 8 },
  feePoint: { fontSize: 13.5, color: "#1E2B2E", lineHeight: 1.5 },
  formError: {
    fontSize: 13,
    color: "#C0455A",
    background: "#FCEAEC",
    borderRadius: 10,
    padding: "10px 14px",
  },
  formActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
  shareNote: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
    marginTop: 18,
    textAlign: "center",
    lineHeight: 1.6,
  },
  noQuizPrompt: {
    width: "100%",
    background: COLORS.cardBg,
    border: `1.5px solid ${COLORS.border}`,
    borderRadius: 24,
    padding: "28px 32px",
    marginBottom: 40,
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  photoUploadBox: {
    border: `2px dashed ${COLORS.border}`,
    borderRadius: 12,
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
  },
  photoUploadLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  },
  photoPreview: {
    maxWidth: "100%",
    maxHeight: 300,
    borderRadius: 12,
    objectFit: "cover",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "#000",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    fontSize: 16,
    cursor: "pointer",
  },
  listingPhoto: {
    width: "100%",
    maxHeight: 300,
    borderRadius: 12,
    objectFit: "cover",
    marginBottom: 12,
  },
};
