import React, { useState, useMemo, useEffect } from "react";
import { fetchListings, createListing, markListingFilled } from "./listingsService";
 
/* ---------------------------------------------
   LOCATION DATA
--------------------------------------------- */
 
// Approx distance from UC's Ilam campus, in km (rough driving/cycling distance)
const UC_SUBURBS = [
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
];
 
function suburbDistance(suburbName) {
  const match = UC_SUBURBS.find((s) => s.name === suburbName);
  return match ? match.distanceKm : null;
}
 
/* ---------------------------------------------
   QUESTIONNAIRE
--------------------------------------------- */
 
const QUESTIONS = [
  {
    id: "sleep",
    text: "It's 11pm on a Tuesday. Where are you?",
    options: [
      { label: "Asleep. Has been for an hour.", tags: { early: 2, quiet: 1 } },
      { label: "In bed, lights off, definitely on my phone", tags: { quiet: 2, night: 1 } },
      { label: "On the couch with whoever's still up", tags: { social: 1, chill: 1 } },
      { label: "Out, or there's people over and it's getting loud", tags: { social: 2, night: 1 } },
    ],
  },
  {
    id: "weekend",
    text: "Friday, 6pm, zero plans. What's the move?",
    options: [
      { label: "Stay in, decompress, maybe one episode of something", tags: { quiet: 2, chill: 1 } },
      { label: "A couple of people over, nothing crazy", tags: { social: 1, chill: 1 } },
      { label: "Pres start at ours, see where the night goes", tags: { social: 2, night: 1 } },
      { label: "Early night — training or something tomorrow", tags: { early: 2, quiet: 1 } },
    ],
  },
  {
    id: "cleanliness",
    text: "The dishes from dinner are sitting in the sink. How long until that bothers you?",
    options: [
      { label: "Immediately. Wash as you go is a personality trait.", tags: { tidy: 2 } },
      { label: "By the end of the day, definitely", tags: { tidy: 1, chill: 1 } },
      { label: "A day or two is fine, it's not a crime scene", tags: { chill: 2 } },
      { label: "Honestly I might not even notice", tags: { chill: 1, quiet: 1 } },
    ],
  },
  {
    id: "guests",
    text: "Your flatmate's having people over. Again. How do you feel?",
    options: [
      { label: "Love it, more people = better flat", tags: { social: 2 } },
      { label: "Fine, as long as I got a heads up", tags: { social: 1, tidy: 1 } },
      { label: "Internally screaming a little — I just want quiet", tags: { quiet: 2 } },
      { label: "Depends entirely on who's coming", tags: { tidy: 1, quiet: 1 } },
    ],
  },
  {
    id: "noise",
    text: "Music/calls/gaming during the day — your honest reaction?",
    options: [
      { label: "Crank it, a quiet flat feels dead to me", tags: { social: 2 } },
      { label: "All good, just maybe headphones after dark", tags: { chill: 1, tidy: 1 } },
      { label: "I will hear you through two walls and a closed door, please don't", tags: { quiet: 2 } },
      { label: "I'm never home to notice anyway", tags: { chill: 1 } },
    ],
  },
  {
    id: "morning",
    text: "Your alarm goes off. What actually happens?",
    options: [
      { label: "Up immediately, gym or run before anything else", tags: { early: 2 } },
      { label: "Up at a normal time, no drama", tags: { early: 1, chill: 1 } },
      { label: "Several snoozes, mornings aren't really my thing", tags: { night: 1, chill: 1 } },
      { label: "What alarm. I wake up when I wake up.", tags: { chill: 1 } },
    ],
  },
  {
    id: "budget_priority",
    text: "Choosing a flat — what's the actual deciding factor?",
    options: [
      { label: "Rent. If it's not cheap, it's not happening.", tags: { budget: 2 } },
      { label: "Good value — not the cheapest, but not getting ripped off", tags: { budget: 1, tidy: 1 } },
      { label: "Location. I'm not walking 40 minutes to a 9am.", tags: { social: 1 } },
      { label: "The people, honestly. I'll live anywhere with the right crew.", tags: { social: 1, chill: 1 } },
    ],
  },
  {
    id: "chores",
    text: "Flat chores — pick your fighter.",
    options: [
      { label: "Roster on the fridge, everyone sticks to it, no exceptions", tags: { tidy: 2 } },
      { label: "Loose roster, flexible when life gets busy", tags: { tidy: 1, chill: 1 } },
      { label: "No roster, people just sort it out organically", tags: { chill: 2 } },
      { label: "We have a roster? News to me.", tags: { chill: 1 } },
    ],
  },
  {
    id: "pets",
    text: "A flatmate wants to get a pet. Reaction?",
    options: [
      { label: "Yes please, I'll basically co-parent it", tags: { social: 1, chill: 1 } },
      { label: "Fine, as long as I'm not the one cleaning up after it", tags: { chill: 1 } },
      { label: "Hard no — allergies, or just not my thing", tags: { tidy: 1 } },
      { label: "Don't really care either way", tags: { chill: 1 } },
    ],
  },
  {
    id: "study_environment",
    text: "It's exam week. The flat's vibe should be...",
    options: [
      { label: "Library mode — everyone's quiet, no exceptions", tags: { quiet: 2 } },
      { label: "Calmer than usual, but not a vow of silence", tags: { quiet: 1, chill: 1 } },
      { label: "Same as always — I do my studying elsewhere", tags: { social: 1, chill: 1 } },
      { label: "Honestly the flat doesn't really change for anything", tags: { chill: 2 } },
    ],
  },
  {
    id: "communication",
    text: "Something's mildly annoying you about a flatmate. What do you do?",
    options: [
      { label: "Bring it up early, before it becomes a thing", tags: { tidy: 1 } },
      { label: "Mention it casually next time it comes up", tags: { chill: 1 } },
      { label: "Let it go unless it gets actually bad", tags: { chill: 2 } },
      { label: "Send it to the group chat (lovingly)", tags: { social: 1, tidy: 1 } },
    ],
  },
  {
    id: "shared_meals",
    text: "Food and cooking in the flat — dream scenario?",
    options: [
      { label: "We cook and eat together most of the week", tags: { social: 2 } },
      { label: "Mostly own thing, but a shared meal now and then is nice", tags: { chill: 1 } },
      { label: "Fully separate — my food, my fridge shelf, my business", tags: { quiet: 1, tidy: 1 } },
      { label: "Whatever happens, happens — I'm easy", tags: { chill: 1 } },
    ],
  },
  {
    id: "alcohol",
    text: "Drinking culture at the flat — where do you sit?",
    options: [
      { label: "Pres regularly, it's part of the flat identity", tags: { social: 2, night: 1 } },
      { label: "Drink sometimes, nothing too messy", tags: { social: 1, chill: 1 } },
      { label: "Mostly sober flat and honestly I prefer that", tags: { quiet: 1, early: 1 } },
      { label: "Don't mind, just not a school night thing every week", tags: { chill: 1 } },
    ],
  },
  {
    id: "decor",
    text: "The living room. What's the dream?",
    options: [
      { label: "Properly done up — plants, fairy lights, looks like a home", tags: { tidy: 1, social: 1 } },
      { label: "Clean and functional, doesn't need to be Pinterest", tags: { tidy: 1 } },
      { label: "Don't really care, my room is where I actually live", tags: { quiet: 1, chill: 1 } },
      { label: "A bit chaotic and lived-in is honestly the vibe", tags: { social: 1, chill: 1 } },
    ],
  },
  {
    id: "commitment",
    text: "How are you feeling about next year's flat situation?",
    options: [
      { label: "Want a proper crew I'm locking in with long-term", tags: { tidy: 1 } },
      { label: "Keen to meet new people, expand the circle a bit", tags: { social: 2 } },
      { label: "Just need it sorted — not too precious about who", tags: { budget: 1, chill: 1 } },
      { label: "Want people on a similar schedule so it's easy", tags: { early: 1, tidy: 1 } },
    ],
  },
  {
    id: "smoking",
    text: "Smoking or vaping at the flat — what's the policy?",
    options: [
      { label: "Totally normal here, no issue at all", tags: { social: 1, chill: 1 } },
      { label: "Outside only, that's the unwritten rule", tags: { tidy: 1, chill: 1 } },
      { label: "Would rather the flat was smoke-free entirely", tags: { quiet: 1, tidy: 1 } },
      { label: "No strong opinion either way", tags: { chill: 1 } },
    ],
  },
  {
    id: "schedule_overlap",
    text: "Your ideal flatmates' daily routines, compared to yours?",
    options: [
      { label: "Pretty similar — overlapping schedules just make life easier", tags: { early: 1, tidy: 1 } },
      { label: "Different is fine, means less queueing for the bathroom", tags: { chill: 1, quiet: 1 } },
      { label: "Doesn't matter, everyone's out doing their own thing anyway", tags: { social: 1, chill: 1 } },
      { label: "Never really thought about it", tags: { chill: 1 } },
    ],
  },
];
 
/* ---------------------------------------------
   ARCHETYPES
--------------------------------------------- */
 
const ARCHETYPES = [
  {
    id: "homebody_circle",
    emoji: "🏡",
    name: "The Homebody Circle",
    tagline: "Cosy nights in, good food, and a flat that feels like home.",
    description:
      "Your ideal flat has a warm, lived-in living room, regular shared dinners, and people who actually hang out together rather than just passing in the hallway. Nights in with a show or a board game beat going out most of the time.",
    dominant: ["chill", "tidy"],
  },
  {
    id: "social_hub",
    emoji: "🎉",
    name: "The Social Hub",
    tagline: "The flat where people end up, most nights.",
    description:
      "Your ideal flat has an open door — people drift in and out, pres happen at yours sometimes, and there's always someone around. You don't mind a bit of noise if it means the place feels alive.",
    dominant: ["social", "night"],
  },
  {
    id: "study_first",
    emoji: "📚",
    name: "Study First",
    tagline: "Calm flat, respected quiet hours, good for getting things done.",
    description:
      "You like a flat that takes study seriously — quiet during the week, considerate about noise, and people who get that exam season changes the vibe. Doesn't mean boring, just calm when it counts.",
    dominant: ["quiet", "early"],
  },
  {
    id: "wellness_routine",
    emoji: "🌅",
    name: "Wellness & Routine",
    tagline: "Early starts, healthy habits, and a flat that supports them.",
    description:
      "Gym, runs, good sleep, maybe a shared meal-prep Sunday — routine matters to you, and you'd love flatmates on a similar wavelength. A flat that makes healthy habits easier, not harder.",
    dominant: ["early", "tidy"],
  },
  {
    id: "easy_going",
    emoji: "😌",
    name: "Easy Going Crew",
    tagline: "No rosters, no drama, just vibes.",
    description:
      "You're low-maintenance and prefer flats that don't overthink things. Chores get done eventually, plans are loose, and as long as everyone's reasonable, the small stuff doesn't matter.",
    dominant: ["chill"],
  },
  {
    id: "house_proud",
    emoji: "✨",
    name: "House Proud",
    tagline: "A flat that feels decorated, organised, and cared for.",
    description:
      "Shared spaces matter to you — a nice living room, a kitchen that works, maybe some plants or fairy lights. You like a flat with a clear chore system and flatmates who care about how the place looks and feels.",
    dominant: ["tidy", "social"],
  },
  {
    id: "budget_first",
    emoji: "💸",
    name: "Budget First",
    tagline: "Rent's the priority — everything else is negotiable.",
    description:
      "You're practical about flatting. Keeping costs down matters more than having a perfectly matched social scene, and you're flexible on most other things to make that happen.",
    dominant: ["budget"],
  },
];
 
function scoreToTags(answers) {
  const tagTotals = {};
  for (const qId in answers) {
    const q = QUESTIONS.find((x) => x.id === qId);
    const opt = q.options[answers[qId]];
    for (const [tag, val] of Object.entries(opt.tags)) {
      tagTotals[tag] = (tagTotals[tag] || 0) + val;
    }
  }
  return tagTotals;
}
 
function determineArchetype(tagTotals) {
  let best = ARCHETYPES[0];
  let bestScore = -Infinity;
  for (const archetype of ARCHETYPES) {
    let score = 0;
    for (const tag of archetype.dominant) {
      score += tagTotals[tag] || 0;
    }
    score = score / archetype.dominant.length;
    if (score > bestScore) {
      bestScore = score;
      best = archetype;
    }
  }
  return best;
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
 
function compatibilityScore(userTags, listingTags) {
  const allTags = new Set([...Object.keys(userTags), ...Object.keys(listingTags)]);
  let dot = 0;
  let userMag = 0;
  let listingMag = 0;
  for (const tag of allTags) {
    const u = userTags[tag] || 0;
    const l = listingTags[tag] || 0;
    dot += u * l;
    userMag += u * u;
    listingMag += l * l;
  }
  if (userMag === 0 || listingMag === 0) return 50;
  const cosine = dot / (Math.sqrt(userMag) * Math.sqrt(listingMag));
  return Math.round(40 + cosine * 59);
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
 
function FindAFlatDropdown({ onSeek, onBrowse }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
 
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);
 
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button style={styles.navDropdownBtn} onClick={() => setOpen(o => !o)}>
        Find a flat {open ? "▴" : "▾"}
      </button>
      {open && (
        <div style={styles.navDropdown}>
          <button style={styles.navDropdownItem} onClick={() => { setOpen(false); onSeek(); }}>
            <div style={styles.navDropdownLabel}>Take the quiz</div>
            <div style={styles.navDropdownSub}>Get matched by compatibility</div>
          </button>
          <div style={styles.navDropdownDivider} />
          <button style={styles.navDropdownItem} onClick={() => { setOpen(false); onBrowse(); }}>
            <div style={styles.navDropdownLabel}>Browse listings</div>
            <div style={styles.navDropdownSub}>See everything without the quiz</div>
          </button>
        </div>
      )}
    </div>
  );
}
 
function NavBar({ onHome, onPost, onSeek, onSaved, onBrowse }) {
  return (
    <nav style={styles.navbar}>
      <div style={styles.navInner}>
        <button style={styles.navLogo} onClick={onHome} aria-label="Go to home">
          <Logo size={28} />
          <span style={styles.navLogoText}>FlatMatch</span>
        </button>
        <div style={styles.navLinks}>
          <button className="fm-nav-link" style={styles.navSaved} onClick={onSaved}>Saved</button>
          <FindAFlatDropdown onSeek={onSeek} onBrowse={onBrowse} />
          <button className="fm-nav-cta" style={styles.navCta} onClick={onPost}>Post a spot</button>
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
  const [savedListings, setSavedListings] = useState([]);
 
  const tagTotals = useMemo(() => scoreToTags(answers), [answers]);
  const archetype = useMemo(() => determineArchetype(tagTotals), [tagTotals]);
 
  const allListings = useMemo(
    () => [...userListings, ...SAMPLE_LISTINGS],
    [userListings]
  );
 
  const ranked = useMemo(() => {
    return allListings
      .map((listing) => ({
        ...listing,
        score: compatibilityScore(tagTotals, listing.tags),
      }))
      .sort((a, b) => b.score - a.score);
  }, [tagTotals, allListings]);
 
  async function loadListings() {
    setLoadingListings(true);
    try {
      const listings = await fetchListings();
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
  }, []);
 
  async function submitListing(listing) {
    setPostError(null);
    setSessionContact(listing.contact);
    try {
      const record = await createListing(listing);
      setUserListings((prev) => [record, ...prev]);
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
    setSavedListings((prev) =>
      prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId]
    );
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
        onSeek={() => { setAnswers({}); setCurrentQ(0); setStage("quiz"); }}
        onSaved={() => setStage("saved")}
        onBrowse={() => setStage("result")}
      />
 
      {stage === "intro" && (
        <Intro
          onStart={() => setStage("quiz")}
          onPost={() => setStage("post")}
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
          archetype={archetype}
          ranked={ranked.filter((l) => savedListings.includes(l.id))}
          onRestart={restart}
          onPost={() => setStage("post")}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
          tagTotals={tagTotals}
          onSave={onSave}
          savedListings={savedListings}
          isSavedView={true}
          hasQuizzed={hasQuizzed}
        />
      )}
 
      {stage === "result" && (
        <Results
          archetype={archetype}
          ranked={ranked}
          onRestart={restart}
          onPost={() => setStage("post")}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
          tagTotals={tagTotals}
          onSave={onSave}
          savedListings={savedListings}
          hasQuizzed={hasQuizzed}
        />
      )}
 
      {stage === "post" && (
        <PostForm
          onSubmit={submitListing}
          onCancel={() => setStage("intro")}
          error={postError}
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
    padding: "28px 20px",
    textAlign: "center",
    borderRight: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  num: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 38,
    fontWeight: 700,
    color: "#2d3f7c",
    lineHeight: 1,
  },
  label: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    color: "#718096",
    lineHeight: 1.4,
  },
};

/* ---------------------------------------------
   INTRO
--------------------------------------------- */
 
function Intro({ onStart, onPost }) {
  const [activeArchetype, setActiveArchetype] = useState(null);

  return (
    <div style={introStyles.page}>

      {/* ── 1. HERO ── */}
      <section style={introStyles.heroSection}>
        <div style={introStyles.ucBadge}>🎓 UC Canterbury students only · Christchurch</div>
        <h1 style={introStyles.heroHeadline}>
          Find flatmates who actually<br />
          <span style={introStyles.heroHighlight}>live like you do.</span>
        </h1>
        <p style={introStyles.heroSubline}>
          Not just who has a room. Not just who's nearby. FlatMatch ranks every
          listing by how well your habits, schedule, and vibe line up — before
          you message anyone.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, width: "100%", maxWidth: 580, margin: "8px 0 24px" }}>
          <button style={introStyles.ctaPrimary} onClick={onStart}>
            🔍 Find my people — take the quiz
          </button>
          <button style={introStyles.ctaSecondary} onClick={onPost}>
            🏠 Post our listing
          </button>
        </div>
        <p style={introStyles.heroMeta}>
          Free · No account · Takes 3 minutes · See your match % before you message
        </p>
      </section>

      {/* ── METRICS STRIP ── */}
      <MetricsStrip />

      {/* ── 2. THE PROBLEM ── */}
      <section style={introStyles.problemSection}>
        <div style={introStyles.problemGrid}>
          <div style={introStyles.problemLeft}>
            <div style={introStyles.sectionEyebrow}>THE OLD WAY</div>
            <h2 style={introStyles.problemHeading}>Finding a flat is a mess.</h2>
            <div style={introStyles.problemList}>
              {[
                "Posting in 5 different Facebook groups and getting ghosted",
                "TradeMe listings with no info about who actually lives there",
                "Messaging 10 people and realising you're totally different vibes",
                "Groups formed in halls with no way to find one more person",
                "No way to know if you'll actually get along until it's too late",
              ].map((item, i) => (
                <div key={i} style={introStyles.problemItem}>
                  <span style={introStyles.problemX}>✕</span>
                  <span style={introStyles.problemText}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={introStyles.problemRight}>
            <div style={introStyles.sectionEyebrow}>THE FLATMATCH WAY</div>
            <h2 style={introStyles.problemHeadingLight}>One place. Right people.</h2>
            <div style={introStyles.problemList}>
              {[
                "One listing reaches everyone looking — no reposting",
                "Profiles show who lives there and what the vibe actually is",
                "Quiz matching means you filter by compatibility before messaging",
                "Groups and solo searchers both post in the same place",
                "Know your match % before you even reach out",
              ].map((item, i) => (
                <div key={i} style={introStyles.solutionItem}>
                  <span style={introStyles.solutionCheck}>✓</span>
                  <span style={introStyles.solutionText}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section style={introStyles.howSection}>
        <div style={introStyles.sectionEyebrow}>HOW IT WORKS</div>
        <h2 style={introStyles.sectionHeading}>Simple. Fast. Actually useful.</h2>
        <div style={introStyles.stepsRow}>
          {[
            {
              num: "1",
              title: "Post or take the quiz",
              body: "Have a room? Post your listing in 2 minutes. Looking to join a flat? Take a 3-minute quiz about how you actually live.",
            },
            {
              num: "2",
              title: "Everything's in one feed",
              body: "Groups with rooms, solo searchers, people forming new flats — all in one place, no tab switching.",
            },
            {
              num: "3",
              title: "Match % tells you who's worth messaging",
              body: "Your quiz answers get scored against every listing. Higher match = closer habits. Message the ones that make sense.",
            },
          ].map((step) => (
            <div key={step.num} style={introStyles.stepCard}>
              <div style={introStyles.stepNum}>{step.num}</div>
              <h3 style={introStyles.stepTitle}>{step.title}</h3>
              <p style={introStyles.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. TWO PATHS ── */}
      <section style={introStyles.pathsSection}>
        <div style={introStyles.sectionEyebrow}>GET STARTED</div>
        <h2 style={introStyles.sectionHeading}>Where do you sit right now?</h2>
        <div style={introStyles.pathsRow}>
          <div style={introStyles.pathCardLeft}>
            <span style={introStyles.pathEmoji}>🔍</span>
            <h3 style={introStyles.pathTitle}>I'm looking to join a flat</h3>
            <p style={introStyles.pathBody}>
              Take the quiz, get your flatting archetype, and see every
              listing in Christchurch ranked by how well your habits line up.
              No more cold messaging randoms.
            </p>
            <ul style={introStyles.pathChecklist}>
              <li>✓ Takes 3 minutes</li>
              <li>✓ See match % before you message</li>
              <li>✓ Groups and rooms all in one place</li>
            </ul>
            <button style={introStyles.pathBtnPrimary} onClick={onStart}>
              Match me with a flat
            </button>
          </div>

          <div style={introStyles.pathCardRight}>
            <span style={introStyles.pathEmoji}>🏠</span>
            <h3 style={introStyles.pathTitleDark}>We have a room or we're forming a group</h3>
            <p style={introStyles.pathBodyDark}>
              Post once and reach every UC student looking right now —
              solo searchers, groups forming, people moving to Christchurch.
              Set your vibe tags and the right people find you.
            </p>
            <ul style={introStyles.pathChecklistDark}>
              <li>✓ Free to post</li>
              <li>✓ One listing, all searchers</li>
              <li>✓ Contact only shared when someone requests</li>
            </ul>
            <button style={introStyles.pathBtnSecondary} onClick={onPost}>
              Post our listing
            </button>
          </div>
        </div>
      </section>

      {/* ── 5. ARCHETYPE TEASER ── */}
      <section style={introStyles.archetypeSection}>
        <div style={introStyles.sectionEyebrow}>YOUR FLATTING ARCHETYPE</div>
        <h2 style={introStyles.sectionHeading}>The quiz figures out your flatting style.</h2>
        <p style={introStyles.archetypeSubline}>
          Hover each archetype — one of these is probably you.
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

      {/* ── 6. FINAL CTA ── */}
      <section style={introStyles.finalCtaSection}>
        <h2 style={introStyles.finalCtaHeading}>
          Flatting season moves fast.<br />Don't leave it to chance.
        </h2>
        <p style={introStyles.finalCtaBody}>
          Most flats near UC fill up by mid-January. Post your listing or
          take the quiz now — everything's in one place, and it takes minutes.
        </p>
        <div style={introStyles.finalCtaBtns}>
          <button style={introStyles.finalCtaBtnPrimary} onClick={onStart}>
            Take the quiz
          </button>
          <button style={introStyles.finalCtaBtnSecondary} onClick={onPost}>
            Post a listing
          </button>
        </div>
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
    alignItems: "center",
    gap: 0,
  },
  heroSection: {
    width: "100%",
    textAlign: "center",
    padding: "60px 24px 80px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  ucBadge: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#4B6BB7",
    background: "rgba(75,107,183,0.10)",
    borderRadius: 999,
    padding: "6px 16px",
    marginBottom: 28,
    display: "inline-block",
  },
  heroHeadline: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: "clamp(36px, 6vw, 56px)",
    fontWeight: 600,
    lineHeight: 1.15,
    color: "#1a2540",
    marginBottom: 20,
  },
  heroHighlight: {
    color: "#7C5CBF",
  },
  heroSubline: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 17,
    lineHeight: 1.75,
    color: "#4a5568",
    maxWidth: 580,
    marginBottom: 36,
  },
  heroCtas: {
    display: "flex",
    gap: 14,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaPrimary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    padding: "16px 36px",
    background: "#2d3f7c",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  ctaSecondary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    padding: "16px 32px",
    background: "transparent",
    color: "#2d3f7c",
    border: "2px solid #2d3f7c",
    borderRadius: 10,
    cursor: "pointer",
  },
  heroMeta: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 12.5,
    color: "#718096",
    letterSpacing: "0.04em",
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
    padding: "72px 24px",
    borderTop: "1px solid #dde3f0",
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
  howSection: {
    width: "100%",
    padding: "72px 24px",
    borderTop: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  stepsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    width: "100%",
  },
  stepCard: {
    background: "#fff",
    border: "1.5px solid #dde3f0",
    borderRadius: 20,
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  stepNum: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 40,
    fontWeight: 700,
    color: "#7C5CBF",
    lineHeight: 1,
  },
  stepTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    fontWeight: 700,
    color: "#1a2540",
    lineHeight: 1.35,
  },
  stepBody: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#4a5568",
  },
  pathsSection: {
    width: "100%",
    padding: "72px 24px",
    borderTop: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  pathsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    width: "100%",
  },
  pathCardLeft: {
    background: "#2d3f7c",
    borderRadius: 24,
    padding: "40px 36px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  pathCardRight: {
    background: "#fff",
    border: "1.5px solid #dde3f0",
    borderRadius: 24,
    padding: "40px 36px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  pathEmoji: {
    fontSize: 36,
  },
  pathTitle: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#fff",
    lineHeight: 1.3,
  },
  pathTitleDark: {
    fontFamily: "'DM Serif Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#1a2540",
    lineHeight: 1.3,
  },
  pathBody: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14.5,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.75)",
  },
  pathBodyDark: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14.5,
    lineHeight: 1.7,
    color: "#4a5568",
  },
  pathChecklist: {
    listStyle: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
  },
  pathChecklistDark: {
    listStyle: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: 13.5,
    color: "#718096",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
  },
  pathBtnPrimary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    padding: "15px 0",
    background: "#7C5CBF",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 8,
    width: "100%",
  },
  pathBtnSecondary: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 15,
    fontWeight: 700,
    padding: "15px 0",
    background: "transparent",
    color: "#2d3f7c",
    border: "2px solid #2d3f7c",
    borderRadius: 10,
    cursor: "pointer",
    marginTop: 8,
    width: "100%",
  },
  archetypeSection: {
    width: "100%",
    padding: "72px 24px",
    borderTop: "1px solid #dde3f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
    width: "100%",
    padding: "72px 40px",
    background: "#2d3f7c",
    borderRadius: 24,
    marginBottom: 40,
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
 
const QUESTION_CATEGORIES = {
  year: "About you",
  degree: "About you",
  sleep: "Daily rhythm",
  morning: "Daily rhythm",
  scheduleoverlap: "Daily rhythm",
  weekend: "Social life",
  guests: "Social life",
  alcohol: "Social life",
  noise: "Flat vibe",
  cleanliness: "Flat vibe",
  chores: "Flat vibe",
  decor: "Flat vibe",
  pets: "Flat vibe",
  communication: "Flat vibe",
  smoking: "Flat vibe",
  studyenvironment: "Study habits",
  budgetpriority: "Priorities",
  commitment: "Priorities",
  sharedmeals: "Food & cooking",
};
 
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
        {QUESTION_CATEGORIES[question.id] && (
          <div style={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: COLORS.teal,
            marginBottom: 10,
          }}>
            {QUESTION_CATEGORIES[question.id]}
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
        <div style={{ position: "absolute", right: 0, top: 28, background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", width: 260, zIndex: 10, boxShadow: "0 4px 16px rgba(35,54,58,0.10)", fontSize: 13, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          Your quiz answers are turned into a vibe profile. Each listing has its own tags. We compare the two using cosine similarity — the closer the match, the higher the % score.
          <button onClick={() => setOpen(false)} style={{ display: "block", marginTop: 8, fontSize: 12, color: COLORS.teal, background: "none", border: "none", cursor: "pointer" }}>Close</button>
        </div>
      )}
    </div>
  );
}
 
function Results({ archetype, ranked, onRestart, onPost, loadingListings, onMarkFilled, sessionContact, tagTotals, onSave, savedListings, isSavedView, hasQuizzed }) {
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
 
  const availableSuburbs = useMemo(() => {
    const set = new Set();
    for (const l of ranked) {
      if (l.suburb) set.add(l.suburb);
    }
    return UC_SUBURBS.filter((s) => set.has(s.name));
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
          <div style={styles.archetypeEyebrow}>YOUR FLATTING ARCHETYPE</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>{archetype.emoji}</div>
            <div style={{ flex: 1 }}>
              <h1 style={styles.archetypeName}>{archetype.name}</h1>
              <p style={styles.archetypeTagline}>{archetype.tagline}</p>
              <p style={styles.archetypeDescription}>{archetype.description}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
                {Object.entries(tagTotals).sort((a,b) => b[1]-a[1]).slice(0,3).map(([tag]) => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.12)", color: COLORS.paper, borderRadius: 8, padding: "4px 12px" }}>
                    {tag}
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
            <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.ink, marginBottom: 4 }}>Take the quiz to see your archetype</div>
            <div style={{ fontSize: 13, color: COLORS.inkSoft }}>Get personalised match scores based on how you actually live</div>
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
                  {s.distanceKm != null ? ` (~${s.distanceKm}km from UC)` : ""}
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
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} onSave={onSave} savedListings={savedListings} hasQuizzed={hasQuizzed} onTakeQuiz={onRestart} />
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
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} onSave={onSave} savedListings={savedListings} hasQuizzed={hasQuizzed} onTakeQuiz={onRestart} />
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
 
function getInitials(title) {
  if (!title) return "?";
  const words = title.trim().split(/\s+/);
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
 
function getAvatarColor(title) {
  const colors = ["#1A9090", "#1A9090", "#E8746A", "#6B9E78", "#8B7BB5", "#C4884A"];
  let hash = 0;
  for (let i = 0; i < (title || "").length; i++) hash += title.charCodeAt(i);
  return colors[hash % colors.length];
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

function ListingCard({ listing, onMarkFilled, sessionContact, onSave, savedListings, hasQuizzed, onTakeQuiz }) {
  const [revealed, setRevealed] = useState(false);
  const tokens = JSON.parse(localStorage.getItem('fm_tokens') || '{}');
  const isOwner = !!tokens[listing.id];
  const isSaved = savedListings && savedListings.includes(listing.id);
  const daysLeft = listing.expiresAt
    ? Math.max(0, Math.ceil((listing.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const spotsLeft = listing.spotsNeeded ?? null;
  return (
    <div className="fm-card" style={styles.card}>
      <div style={styles.cardTopRow}>
        <div style={{ ...styles.avatar, background: getAvatarColor(listing.title) }}>
          {getInitials(listing.title)}
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
            {listing.distanceKm != null ? ` · ~${listing.distanceKm}km from UC` : ""}
          </div>
          <div style={styles.cardPostedDate}>{timeAgo(listing.renewedAt || listing.createdAt)}<ViewCount listingId={listing.id} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {hasQuizzed
            ? <div style={styles.matchBadge}>{listing.score}% match</div>
            : <button style={styles.matchPrompt} onClick={onTakeQuiz}>Quiz me for compatibility ✦</button>
          }
          {onSave && (
            <button
              style={styles.bookmarkBtn}
              onClick={() => onSave(listing.id)}
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
        <button style={styles.markFilledBtn} onClick={() => onMarkFilled && onMarkFilled(listing.id)}>
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
  return {
    listingType: "room",
    postType: "group",
    title: "",
    people: "1",
    spotsNeeded: "1",
    groupSize: "2",
    groupSeeking: "1",
    suburb: "",
    budget: "",
    moveIn: "",
    bio: "",
    contact: "",
    selectedTags: [],
  };
}
 
const STATUS_OPTIONS = [
  { key: "looking", label: "Actively looking", color: "#1A9090", dot: "#1A9090" },
  { key: "almost", label: "Almost full — 1 spot left", color: "#E8A030", dot: "#E8A030" },
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
 
  function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result);
      setPhotoPreview(reader.result);
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
 
  async function handleSubmit(e) {
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
 
    const tags = {};
    for (const key of form.selectedTags) {
      tags[key] = 2;
    }
 
    let title = "";
    let people = 1;
    let spotsNeeded = 1;
 
    if (form.listingType === "room") {
      people = parseInt(form.people, 10) || 1;
      spotsNeeded = parseInt(form.spotsNeeded, 10) || 1;
      title = form.title.trim() || `${people} looking for ${spotsNeeded} more`;
    } else {
      people = parseInt(form.groupSize, 10) || 2;
      spotsNeeded = parseInt(form.groupSeeking, 10) || 1;
      title = `${people} looking for ${spotsNeeded} more`;
    }
 
    setSubmitting(true);
    await onSubmit({
      listingType: form.listingType,
      type: form.postType || "group",
      title,
      people,
      spotsNeeded,
      suburb: form.suburb,
      area: form.suburb,
      distanceKm: suburbDistance(form.suburb),
      budget: form.budget.trim(),
      moveIn: form.moveIn.trim(),
      bio: form.bio.trim(),
      contact: form.contact.trim(),
      tags,
      photo: photo || null,
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
 
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>What are you posting?</label>
          <div style={styles.toggleRow}>
            <button
              type="button"
              style={form.listingType === "room" ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => update("listingType", "room")}
            >
              A room in our flat
            </button>
            <button
              type="button"
              style={form.listingType === "group" ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => update("listingType", "group")}
            >
              Our group is looking
            </button>
          </div>
        </div>
 
        {form.listingType === "room" && (
          <>
            <div style={styles.fieldRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>How many people are you currently?</label>
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
          </>
        )}
 
        {form.listingType === "group" && (
          <>
            <div style={styles.fieldRow}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>How many are in your group?</label>
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  max="5"
                  value={form.groupSize}
                  onChange={(e) => update("groupSize", e.target.value)}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>How many more are you looking for?</label>
                <div style={styles.toggleRow}>
                  <button
                    type="button"
                    style={form.groupSeeking === "1" ? styles.toggleBtnActive : styles.toggleBtn}
                    onClick={() => update("groupSeeking", "1")}
                  >
                    1 person
                  </button>
                  <button
                    type="button"
                    style={form.groupSeeking === "2" ? styles.toggleBtnActive : styles.toggleBtn}
                    onClick={() => update("groupSeeking", "2")}
                  >
                    2 people
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
 
        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Where are you looking?</label>
            <select
              style={styles.input}
              value={form.suburb}
              onChange={(e) => update("suburb", e.target.value)}
            >
              <option value="" disabled>
                Select a suburb
              </option>
              {UC_SUBURBS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {s.distanceKm != null ? ` (~${s.distanceKm}km from UC)` : ""}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Budget (per week)</label>
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
            placeholder="Keep it real — this is what people match on"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
          />
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
                <input id="photo-input" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
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
          <button type="submit" style={styles.primaryBtn} disabled={submitting}>
            {submitting ? "Posting…" : "Post listing"}
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={onCancel}>
            Cancel
          </button>
        </div>
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
              This is a free tool built by UC students, for UC students. We're just getting started — the more people who post and take the quiz, the more useful it becomes for everyone. If this helped you, please share it.
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
        <span>© 2026 FlatMatch · Made for UC students in Ōtautahi · Free forever</span>
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
    maxWidth: 860,
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
    maxWidth: 860,
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
  body { -webkit-font-smoothing: antialiased; }
 
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
    background: #E8746A;
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
    alignItems: "center",
    padding: "100px 0 60px",
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
    maxWidth: 900,
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
    background: COLORS.coral,
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
    maxWidth: 680,
    width: "100%",
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
    background: COLORS.coral,
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
    maxWidth: 860,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
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
    color: COLORS.coral,
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
  },
  requestBtn: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 22px",
    background: "transparent",
    color: COLORS.coral,
    border: `1.5px solid ${COLORS.coral}`,
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
    maxWidth: 720,
    width: "100%",
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
    border: `1.5px solid ${COLORS.coral}`,
    background: COLORS.coral,
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
