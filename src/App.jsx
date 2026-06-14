Last login: Sat Jun 13 21:32:27 on ttys001
linco@MacBook-Air-45 ~ % cat ~/flatmatch-app/src/App.jsx
import { useState, useMemo, useEffect } from "react";

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
    // slight normalization so single-tag archetypes aren't unfairly favoured
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
  // cosine-similarity-ish overlap, normalized to a percentage
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
  // map cosine [0,1] to a friendlier [40,99] range so nothing feels like a 0% match
  return Math.round(40 + cosine * 59);
}

/* ---------------------------------------------
   LOGO
--------------------------------------------- */

function Logo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="FlatMatch logo"
      style={{ borderRadius: size * 0.2, display: "block" }}
    >
      <rect x="0" y="0" width="200" height="200" rx="40" fill="#23363A" />
      <circle cx="82" cy="110" r="38" fill="#1FA9A0" opacity="0.9" />
      <circle cx="124" cy="110" r="38" fill="#3D7A8C" opacity="0.9" />
      <path d="M103 48 L152 92 H140 V132 H66 V92 H54 Z" fill="#F4FAF9" />
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
          color: "#23363A",
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

function NavBar({ onHome, onPost, onQuiz }) {
  return (
    <nav style={styles.navbar}>
      <div style={styles.navInner}>
        <button style={styles.navLogo} onClick={onHome} aria-label="Go to home">
          <Logo size={28} />
          <span style={styles.navLogoText}>FlatMatch</span>
        </button>
        <div style={styles.navLinks}>
          <button className="fm-nav-link" style={styles.navLink} onClick={onQuiz}>Take the quiz</button>
          <button className="fm-nav-cta" style={styles.navCta} onClick={onPost}>Post a listing</button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [stage, setStage] = useState("intro"); // intro | quiz | result | post | posted
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [userListings, setUserListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [postError, setPostError] = useState(null);
  const [sessionContact, setSessionContact] = useState(null);
  const [pendingListing, setPendingListing] = useState(null);

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
      if (!window.storage) {
        setUserListings([]);
        return;
      }
      const keysResult = await window.storage.list("listing:", true);
      const keys = keysResult?.keys || [];
      const loaded = [];
      for (const key of keys) {
        try {
          const result = await window.storage.get(key, true);
          if (result?.value) {
            loaded.push(JSON.parse(result.value));
          }
        } catch {
          // skip unreadable entries
        }
      }
      const now = Date.now();
      const active = loaded.filter(l => !l.filled && (!l.expiresAt || l.expiresAt > now));
      active.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setUserListings(active);
    } catch {
      setUserListings([]);
    } finally {
      setLoadingListings(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, []);

  async function submitListing(listing) {
    setPendingListing(listing);
    setStage("payment");
  }

  async function confirmPayment() {
    const listing = pendingListing;
    if (!listing) return;
    setPostError(null);
    const id = `listing:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const record = { ...listing, id, createdAt: Date.now(), expiresAt: Date.now() + THIRTY_DAYS, filled: false };
    setSessionContact(listing.contact);
    try {
      if (!window.storage) {
        setUserListings((prev) => [record, ...prev]);
        setPendingListing(null);
        setStage("posted");
        return;
      }
      const result = await window.storage.set(id, JSON.stringify(record), true);
      if (!result) throw new Error("Save failed");
      setUserListings((prev) => [record, ...prev]);
      setPendingListing(null);
      setStage("posted");
    } catch (err) {
      setPostError("Couldn't save your listing — try again in a moment.");
      setStage("post");
    }
  }

  async function markFilled(listingId) {
    if (!window.storage) {
      setUserListings((prev) => prev.filter((l) => l.id !== listingId));
      return;
    }
    try {
      const result = await window.storage.get(listingId, true);
      if (result?.value) {
        const record = JSON.parse(result.value);
        record.filled = true;
        await window.storage.set(listingId, JSON.stringify(record), true);
      }
      setUserListings((prev) => prev.filter((l) => l.id !== listingId));
    } catch { /* silent */ }
  }

  function selectAnswer(qIndex, optIndex) {
    const q = QUESTIONS[qIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: optIndex }));
    if (qIndex < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(qIndex + 1), 180);
    } else {
      setTimeout(() => setStage("result"), 180);
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
        onQuiz={() => { setAnswers({}); setCurrentQ(0); setStage("quiz"); }}
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

      {stage === "result" && (
        <Results
          archetype={archetype}
          ranked={ranked}
          onRestart={restart}
          onPost={() => setStage("post")}
          loadingListings={loadingListings}
          onMarkFilled={markFilled}
          sessionContact={sessionContact}
        />
      )}

      {stage === "post" && (
        <PostForm
          onSubmit={submitListing}
          onCancel={() => setStage("intro")}
          error={postError}
        />
      )}

      {stage === "payment" && (
        <PaymentStep
          onConfirm={confirmPayment}
          onCancel={() => { setPendingListing(null); setStage("post"); }}
          listing={pendingListing}
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
   INTRO
--------------------------------------------- */

function Intro({ onStart, onPost }) {
  return (
    <div style={styles.introWrap}>
      <LogoLockup size={48} align="center" />
      <div style={styles.ucBadge}>Built for University of Canterbury students</div>
      <h1 style={styles.h1}>
        Find your <span style={styles.highlight}>people</span>, not just a
        room.
      </h1>
      <p style={styles.intro}>
        FlatMatch ranks flats and flatmates by how well your day-to-day
        habits actually line up — sleep schedules, mess tolerance, how social
        you want the place to be — so you spend less time messaging randoms
        who turn out to be a totally different vibe.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 28, marginBottom: 0, flexWrap: "wrap" }}>
        {[
          { n: "1", label: "Post your listing", sub: "Under a minute" },
          { n: "2", label: "Take the quiz", sub: "~3 mins, 19 questions" },
          { n: "3", label: "See your matches", sub: "Ranked by compatibility" },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "10px 14px", flex: "1 1 160px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ink }}>{s.label}</div>
              <div style={{ fontSize: 11, color: COLORS.inkSoft }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.pathsGrid}>
        <div style={styles.pathCardPrimary}>
          <div style={styles.pathLabel}>STEP 1</div>
          <h3 style={styles.pathTitle}>Post your listing</h3>
          <p style={styles.pathDescription}>
            Got a flat with spots open, or need to join a group? Post it in
            under a minute — your listing instantly becomes visible to
            everyone taking the questionnaire.
          </p>
          <button style={styles.primaryBtn} onClick={onPost}>
            Post your listing
          </button>
        </div>

        <div style={styles.pathCard}>
          <div style={styles.pathLabelSecondary}>STEP 2</div>
          <h3 style={styles.pathTitle}>Take the questionnaire</h3>
          <p style={styles.pathDescription}>
            15 quick questions about how you actually live. You'll get your
            flatting archetype, then see every listing ranked by how
            compatible it is with you — highest match first.
          </p>
          <div style={styles.introMeta}>
            <span>~3 minutes</span>
            <span style={styles.dot}>·</span>
            <span>Get ranked matches</span>
          </div>
          <button style={styles.secondaryBtn} onClick={onStart}>
            Start the questionnaire
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------
   QUIZ
--------------------------------------------- */


const QUESTION_CATEGORIES = {
  year: "About you",
  degree: "About you",
  sleep: "Daily rhythm",
  morning: "Daily rhythm",
  weekend: "Social life",
  guests: "Social life",
  alcohol: "Social life",
  noise: "Flat vibe",
  cleanliness: "Flat vibe",
  chores: "Flat vibe",
  decor: "Flat vibe",
  study_environment: "Study habits",
  budget_priority: "Priorities",
  commitment: "Priorities",
  shared_meals: "Food & cooking",
  pets: "Flat vibe",
  communication: "Flat vibe",
  smoking: "Flat vibe",
  schedule_overlap: "Daily rhythm",
};

function Quiz({ question, questionIndex, total, onSelect, onBack }) {
  const category = QUESTION_CATEGORIES[question.id] || "";
  const pct = Math.round(((questionIndex + 1) / total) * 100);

  return (
    <div style={styles.quizWrap}>
      <div style={styles.progressRow}>
        {onBack ? (
          <button style={styles.backBtn} onClick={onBack} aria-label="Previous question">
            ← Back
          </button>
        ) : (
          <span />
        )}
        <div style={styles.progressText}>{questionIndex + 1} / {total} · {pct}%</div>
      </div>

      <div style={styles.progressBarOuter}>
        <div style={{ ...styles.progressBarInner, width: `${pct}%` }} />
      </div>

      <div key={question.id} className="question-anim">
        {category && (
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: COLORS.teal, marginBottom: 10 }}>
            {category}
          </div>
        )}
        <h2 style={styles.question}>{question.text}</h2>
        <div style={styles.optionsCol}>
          {question.options.map((opt, i) => (
            <button key={i} className="fm-option-btn" style={styles.optionBtn} onClick={() => onSelect(i)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------
   RESULTS
--------------------------------------------- */

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

function Results({ archetype, ranked, onRestart, onPost, loadingListings, onMarkFilled, sessionContact }) {
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match"); // match | distance

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
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.12)", color: COLORS.paper, borderRadius: 100, padding: "4px 12px" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!loadingListings && (
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
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} />
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
                  <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} sessionContact={sessionContact} />
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
  const colors = ["#1FA9A0", "#3D7A8C", "#E8746A", "#6B9E78", "#8B7BB5", "#C4884A"];
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

function ListingCard({ listing, onMarkFilled, sessionContact }) {
  const [revealed, setRevealed] = useState(false);
  const isOwner = !!(sessionContact && listing.contact && sessionContact === listing.contact);
  const daysLeft = listing.expiresAt
    ? Math.max(0, Math.ceil((listing.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  return (
    <div className="fm-card" style={styles.card}>
      <div style={styles.cardTopRow}>
        <div style={{ ...styles.avatar, background: getAvatarColor(listing.title) }}>
          {getInitials(listing.title)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            <div style={styles.cardTitle}>{listing.title}</div>
            {spotsLeft !== null && (
              <span style={styles.spotsBadge}>{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} open</span>
            )}
          </div>
          <div style={styles.cardMeta}>
            {listing.area} · {listing.budget} · Move in {listing.moveIn}
            {listing.distanceKm != null ? ` · ~${listing.distanceKm}km from UC` : ""}
          </div>
          <div style={styles.cardPostedDate}>{timeAgo(listing.renewedAt || listing.createdAt)}</div>
        </div>
        <div style={styles.matchBadge}>{listing.score}% match</div>
      </div>
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
      <p style={styles.cardBio}>{listing.bio}</p>
      {revealed && listing.contact ? (
        <div style={styles.contactReveal}>
          Get in touch: <strong>{listing.contact}</strong>
        </div>
      ) : (
        <button
          style={styles.requestBtn}
          onClick={() => setRevealed(true)}
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
    postType: "group", // group | solo
    title: "",
    people: "1",
    spotsNeeded: "1",
    suburb: "",
    budget: "",
    moveIn: "",
    bio: "",
    contact: "",
    selectedTags: [],
  };
}

function PostForm({ onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);

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

    const people = parseInt(form.people, 10) || 1;
    const spotsNeeded = form.postType === "solo" ? 0 : parseInt(form.spotsNeeded, 10) || 1;

    const title =
      form.postType === "solo"
        ? "Solo looking to join a group"
        : form.title.trim() ||
          `${people} looking for ${spotsNeeded} more`;

    setSubmitting(true);
    await onSubmit({
      type: form.postType,
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
              style={form.postType === "group" ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => update("postType", "group")}
            >
              A group with spots open
            </button>
            <button
              type="button"
              style={form.postType === "solo" ? styles.toggleBtnActive : styles.toggleBtn}
              onClick={() => update("postType", "solo")}
            >
              Just me, looking to join
            </button>
          </div>
        </div>

        {form.postType === "group" && (
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
        )}

        {form.postType === "group" && (
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
        )}

        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Suburb</label>
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
          <label style={styles.label}>
            {form.postType === "group"
              ? "Tell people about your flat — vibe, routines, what you're after"
              : "Tell groups about yourself — vibe, routines, what you're after"}
          </label>
          <textarea
            style={styles.textarea}
            rows={4}
            placeholder="Keep it real — this is what people match on"
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
          />
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
   PAYMENT STEP
--------------------------------------------- */

const LISTING_FEE = 9;

function PaymentStep({ onConfirm, onCancel, error }) {
  const [paying, setPaying] = useState(false);
  async function handlePay() {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1200));
    setPaying(false);
    onConfirm();
  }
  return (
    <div style={styles.formWrap}>
      <LogoLockup size={32} align="left" />
      <h1 style={styles.h2}>One small step</h1>
      <p style={styles.intro}>
        A listing fee keeps FlatMatch focused on serious groups — no spam, no ghost listings.
      </p>
      <div style={styles.feeCard}>
        <div style={styles.feeRow}>
          <span style={styles.feeLabel}>Listing fee</span>
          <span style={styles.feeAmount}>NZ${LISTING_FEE}</span>
        </div>
        <div style={styles.feeMeta}>Active for 30 days · visible to all · remove anytime</div>
        <div style={styles.feeDivider} />
        <div style={styles.feePoints}>
          <div style={styles.feePoint}>✓ Appears in every compatible user's ranked results</div>
          <div style={styles.feePoint}>✓ Auto-expires after 30 days — no zombie listings</div>
          <div style={styles.feePoint}>✓ Mark as filled anytime to remove it immediately</div>
          <div style={styles.feePoint}>✓ Only real groups pay to post — keeps the feed clean</div>
        </div>
      </div>
      {error && <div style={styles.formError}>{error}</div>}
      <div style={styles.formActions}>
        <button style={styles.primaryBtn} onClick={handlePay} disabled={paying}>
          {paying ? "Processing..." : `Pay NZ$${LISTING_FEE} & post listing`}
        </button>
        <button type="button" style={styles.secondaryBtn} onClick={onCancel}>Go back</button>
      </div>
      <p style={styles.shareNote}>Simulated payment — connect Stripe before going live.</p>
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
  return (
    <footer style={styles.footer}>
      <div style={styles.footerInner}>
        <div style={styles.footerLeft}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Logo size={20} />
            <span style={styles.footerBrand}>FlatMatch</span>
          </div>
          <p style={styles.footerTagline}>Built for UC students. Find people, not just a room.</p>
        </div>
        <div style={styles.footerLinks}>
          <div style={styles.footerCol}>
            <div style={styles.footerColHead}>How it works</div>
            <div style={styles.footerColItem}>Post your listing in under a minute</div>
            <div style={styles.footerColItem}>Take the quiz to get your archetype</div>
            <div style={styles.footerColItem}>See listings ranked by compatibility</div>
          </div>
          <div style={styles.footerCol}>
            <div style={styles.footerColHead}>Privacy</div>
            <div style={styles.footerColItem}>Your contact info is only shown when someone requests to connect</div>
            <div style={styles.footerColItem}>No account required</div>
          </div>
        </div>
      </div>
      <div style={styles.footerBottom}>
        <span>© 2026 FlatMatch · Made for UC students in Ōtautahi</span>
      </div>
    </footer>
  );
}


const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }

  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');

  @keyframes cardSlam {
    0% { transform: scale(0.92) translateY(12px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .stamp-anim { animation: cardSlam 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  @media (prefers-reduced-motion: reduce) {
    .stamp-anim { animation: none !important; }
  }


  @keyframes questionIn {
    0% { opacity: 0; transform: translateX(18px); }
    100% { opacity: 1; transform: translateX(0); }
  }
  .question-anim { animation: questionIn 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
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
    border-color: #1FA9A0;
    background: #f0faf9;
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
    background: #23363A;
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
    color: #23363A !important;
  }
  .fm-nav-cta:hover {
    opacity: 0.85;
  }

`;

const FONT_DISPLAY = "'DM Serif Display', Georgia, serif";
const FONT_BODY = "'Inter', sans-serif";

const COLORS = {
  paper: "#F4FAF9",
  ink: "#23363A",
  coral: "#1FA9A0",
  teal: "#3D7A8C",
  yellow: "#D6F2EC",
  inkSoft: "#6B7E82",
  cardBg: "#FFFFFF",
  border: "#DCEFEC",
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
    padding: "100px 20px 60px",
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
    background: COLORS.ink,
    border: "none",
    cursor: "pointer",
    padding: "8px 18px",
    borderRadius: 8,
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
  footerLeft: {
    maxWidth: 220,
  },
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

  /* Intro */
  introWrap: {
    maxWidth: 760,
    width: "100%",
    textAlign: "left",
  },
  eyebrow: {
    fontFamily: FONT_DISPLAY,
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
    textAlign: "left",
  },
  highlight: {
    color: COLORS.coral,
  },
  intro: {
    fontSize: 16,
    lineHeight: 1.7,
    color: COLORS.inkSoft,
    maxWidth: 560,
    marginLeft: 0,
    marginRight: "auto",
    marginBottom: 24,
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
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 600,
    padding: "16px 36px",
    background: COLORS.coral,
    color: "#FFFFFF",
    border: "none",
    borderRadius: 100,
    cursor: "pointer",
    boxShadow: "none",
  },

  secondaryBtn: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    fontWeight: 600,
    padding: "12px 28px",
    background: "transparent",
    color: COLORS.ink,
    border: `1.5px solid ${COLORS.ink}`,
    borderRadius: 100,
    cursor: "pointer",
    marginTop: 24,
  },

  /* Quiz */
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
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.inkSoft,
  },
  progressBarOuter: {
    height: 8,
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

  /* Results */
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
    fontFamily: FONT_DISPLAY,
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
    fontFamily: FONT_DISPLAY,
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
    fontFamily: FONT_DISPLAY,
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
    fontFamily: FONT_DISPLAY,
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12.5,
    color: COLORS.inkSoft,
  },
  matchBadge: {
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.ink,
    background: COLORS.yellow,
    borderRadius: 100,
    padding: "6px 14px",
    whiteSpace: "nowrap",
  },
  cardBio: {
    fontSize: 14,
    lineHeight: 1.65,
    color: COLORS.ink,
    marginBottom: 14,
  },
  requestBtn: {
    fontFamily: FONT_DISPLAY,
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 22px",
    background: "transparent",
    color: COLORS.coral,
    border: `1.5px solid ${COLORS.coral}`,
    borderRadius: 100,
    cursor: "pointer",
  },

  /* Intro extras */
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
    fontFamily: FONT_DISPLAY,
    fontSize: 11,
    letterSpacing: "0.18em",
    fontWeight: 600,
    color: COLORS.yellow,
  },
  pathLabelSecondary: {
    fontFamily: FONT_DISPLAY,
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

  /* Results extras */
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
    borderRadius: 100,
    padding: "10px 18px",
    display: "inline-block",
  },

  /* Form */
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
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.teal,
    background: COLORS.border,
    borderRadius: 100,
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
    fontFamily: FONT_DISPLAY,
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
    borderRadius: 100,
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
    borderRadius: 100,
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
    borderRadius: 100,
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
    borderRadius: 100,
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
    border: "1.5px solid #DCEFEC",
    borderRadius: 18,
    padding: "22px",
    marginBottom: 24,
    boxShadow: "0 8px 24px rgba(35,54,58,0.07)",
  },
  feeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  feeLabel: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, fontWeight: 600, color: "#23363A" },
  feeAmount: { fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, fontWeight: 700, color: "#ff6b4a" },
  feeMeta: { fontSize: 12.5, color: "#6b7e82", marginBottom: 14 },
  feeDivider: { height: 1, background: "#DCEFEC", marginBottom: 14 },
  feePoints: { display: "flex", flexDirection: "column", gap: 8 },
  feePoint: { fontSize: 13.5, color: "#23363A", lineHeight: 1.5 },
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
};
linco@MacBook-Air-45 ~ % 
