import { useState, useMemo, useEffect, useRef } from "react";

/* ---------------------------------------------
   LOCATION DATA
--------------------------------------------- */

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
    id: "year",
    text: "What year are you in?",
    options: [
      { label: "First year", tags: { chill: 1, social: 1 } },
      { label: "Second year", tags: { chill: 1 } },
      { label: "Third year", tags: { quiet: 1 } },
      { label: "Fourth year or above", tags: { quiet: 1, early: 1 } },
      { label: "Postgrad", tags: { quiet: 2, early: 1 } },
    ],
  },
  {
    id: "degree",
    text: "What are you studying?",
    options: [
      { label: "Engineering / Science / Tech", tags: { early: 1, quiet: 1 } },
      { label: "Business / Commerce / Law", tags: { tidy: 1, chill: 1 } },
      { label: "Arts / Humanities / Education", tags: { social: 1, chill: 1 } },
      { label: "Health / Med / Nursing", tags: { early: 2, quiet: 1 } },
      { label: "Creative / Design / Fine Arts", tags: { night: 1, social: 1 } },
      { label: "Something else", tags: { chill: 1 } },
    ],
  },
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
    name: "The Homebody Circle",
    tagline: "Cosy nights in, good food, and a flat that feels like home.",
    description: "Your ideal flat has a warm, lived-in living room, regular shared dinners, and people who actually hang out together rather than just passing in the hallway. Nights in with a show or a board game beat going out most of the time.",
    dominant: ["chill", "tidy"],
  },
  {
    id: "social_hub",
    name: "The Social Hub",
    tagline: "The flat where people end up, most nights.",
    description: "Your ideal flat has an open door — people drift in and out, pres happen at yours sometimes, and there's always someone around. You don't mind a bit of noise if it means the place feels alive.",
    dominant: ["social", "night"],
  },
  {
    id: "study_first",
    name: "Study First",
    tagline: "Calm flat, respected quiet hours, good for getting things done.",
    description: "You like a flat that takes study seriously — quiet during the week, considerate about noise, and people who get that exam season changes the vibe. Doesn't mean boring, just calm when it counts.",
    dominant: ["quiet", "early"],
  },
  {
    id: "wellness_routine",
    name: "Wellness & Routine",
    tagline: "Early starts, healthy habits, and a flat that supports them.",
    description: "Gym, runs, good sleep, maybe a shared meal-prep Sunday — routine matters to you, and you'd love flatmates on a similar wavelength. A flat that makes healthy habits easier, not harder.",
    dominant: ["early", "tidy"],
  },
  {
    id: "easy_going",
    name: "Easy Going Crew",
    tagline: "No rosters, no drama, just vibes.",
    description: "You're low-maintenance and prefer flats that don't overthink things. Chores get done eventually, plans are loose, and as long as everyone's reasonable, the small stuff doesn't matter.",
    dominant: ["chill"],
  },
  {
    id: "house_proud",
    name: "House Proud",
    tagline: "A flat that feels decorated, organised, and cared for.",
    description: "Shared spaces matter to you — a nice living room, a kitchen that works, maybe some plants or fairy lights. You like a flat with a clear chore system and flatmates who care about how the place looks and feels.",
    dominant: ["tidy", "social"],
  },
  {
    id: "budget_first",
    name: "Budget First",
    tagline: "Rent's the priority — everything else is negotiable.",
    description: "You're practical about flatting. Keeping costs down matters more than having a perfectly matched social scene, and you're flexible on most other things to make that happen.",
    dominant: ["budget"],
  },
];

function scoreToTags(answers) {
  const tagTotals = {};
  for (const qId in answers) {
    const q = QUESTIONS.find((x) => x.id === qId);
    if (!q) continue;
    const opt = q.options[answers[qId]];
    if (!opt) continue;
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

function compatibilityScore(userTags, listingTags) {
  const allTags = new Set([...Object.keys(userTags), ...Object.keys(listingTags)]);
  let dot = 0, userMag = 0, listingMag = 0;
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
   LOCALSTORAGE PERSISTENCE
--------------------------------------------- */

const LS_KEY = "flatmatch_listings_v1";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return parsed.filter(l => !l.filled);
  } catch {
    return [];
  }
}

function saveToStorage(listings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(listings));
  } catch {}
}

/* ---------------------------------------------
   SHARE BUTTON
--------------------------------------------- */

function ShareButton() {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: "FlatMatch", text: "Find your people at UC — take the flatmate quiz", url })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // fallback: select text
        const el = document.createElement("textarea");
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <button
      style={{
        ...styles.shareBtn,
        background: copied ? "#D6F2EC" : "transparent",
        borderColor: copied ? "#1FA9A0" : "#DCEFEC",
        color: copied ? "#1FA9A0" : "#6B7E82",
      }}
      onClick={handleShare}
      aria-label="Share FlatMatch"
    >
      {copied ? "✓ Link copied!" : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share FlatMatch
        </>
      )}
    </button>
  );
}

/* ---------------------------------------------
   LOGO
--------------------------------------------- */

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="FlatMatch logo" style={{ borderRadius: size * 0.2, display: "block" }}>
      <rect x="0" y="0" width="200" height="200" rx="40" fill="#23363A" />
      <circle cx="82" cy="110" r="38" fill="#1FA9A0" opacity="0.9" />
      <circle cx="124" cy="110" r="38" fill="#3D7A8C" opacity="0.9" />
      <path d="M103 48 L152 92 H140 V132 H66 V92 H54 Z" fill="#F4FAF9" />
    </svg>
  );
}

function LogoLockup({ size = 40, align = "center" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start", gap: 10, marginBottom: 18 }}>
      <Logo size={size} />
      <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: size * 0.55, fontWeight: 600, color: "#23363A" }}>
        FlatMatch
      </span>
    </div>
  );
}

/* ---------------------------------------------
   APP
--------------------------------------------- */

export default function App() {
  const [stage, setStage] = useState("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [userListings, setUserListings] = useState(() => loadFromStorage());
  const [postError, setPostError] = useState(null);
  const [sessionContact, setSessionContact] = useState(null);

  const tagTotals = useMemo(() => scoreToTags(answers), [answers]);
  const archetype = useMemo(() => determineArchetype(tagTotals), [tagTotals]);

  const ranked = useMemo(() => {
    return userListings
      .map((listing) => ({ ...listing, score: compatibilityScore(tagTotals, listing.tags) }))
      .sort((a, b) => b.score - a.score);
  }, [tagTotals, userListings]);

  function persistListings(listings) {
    setUserListings(listings);
    saveToStorage(listings);
  }

  function submitListing(listing) {
    setPostError(null);
    const id = `listing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = { ...listing, id, createdAt: Date.now(), filled: false };
    setSessionContact(listing.contact);
    persistListings([record, ...userListings]);
    setStage("posted");
  }

  function renewListing(listingId) {
    const updated = userListings.map(l =>
      l.id === listingId ? { ...l, renewedAt: Date.now() } : l
    );
    persistListings(updated);
  }

  function markFilled(listingId) {
    persistListings(userListings.filter((l) => l.id !== listingId));
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

      {stage === "intro" && <Intro onStart={() => setStage("quiz")} onPost={() => setStage("post")} />}

      {stage === "quiz" && (
        <Quiz
          question={QUESTIONS[currentQ]}
          questionIndex={currentQ}
          total={QUESTIONS.length}
          onSelect={(optIndex) => selectAnswer(currentQ, optIndex)}
          onBack={currentQ > 0 ? () => setCurrentQ((i) => i - 1) : null}
        />
      )}

      {stage === "result" && (
        <Results
          archetype={archetype}
          ranked={ranked}
          onRestart={restart}
          onPost={() => setStage("post")}
          onMarkFilled={markFilled}
          onRenew={renewListing}
          sessionContact={sessionContact}
        />
      )}

      {stage === "post" && (
        <PostForm onSubmit={submitListing} onCancel={() => setStage("intro")} error={postError} />
      )}

      {stage === "posted" && (
        <PostedConfirmation
          onBrowse={() => setStage("intro")}
          onTakeQuiz={() => { setAnswers({}); setCurrentQ(0); setStage("quiz"); }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------
   INTRO
--------------------------------------------- */

function Intro({ onStart, onPost }) {
  return (
    <div style={styles.introWrap}>
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginBottom: 8 }}>
        <ShareButton />
      </div>
      <LogoLockup size={48} align="center" />
      <div style={styles.ucBadge}>Built for University of Canterbury students</div>
      <h1 style={styles.h1}>
        Find your <span style={styles.highlight}>people</span>, not just a room.
      </h1>
      <p style={styles.intro}>
        FlatMatch ranks flats and flatmates by how well your day-to-day habits actually line up —
        sleep schedules, mess tolerance, how social you want the place to be — so you spend less
        time messaging randoms who turn out to be a totally different vibe.
      </p>

      <div style={styles.pathsGrid}>
        <div style={styles.pathCardPrimary}>
          <div style={styles.pathLabel}>STEP 1</div>
          <h3 style={styles.pathTitle}>Post your listing</h3>
          <p style={styles.pathDescription}>
            Got a flat with spots open, or need to join a group? Post it in under a minute —
            your listing instantly becomes visible to everyone taking the questionnaire.
          </p>
          <button style={styles.primaryBtn} onClick={onPost}>Post your listing</button>
        </div>

        <div style={styles.pathCard}>
          <div style={styles.pathLabelSecondary}>STEP 2</div>
          <h3 style={styles.pathTitle}>Take the questionnaire</h3>
          <p style={styles.pathDescription}>
            A few quick questions about how you actually live. You'll get your flatting archetype,
            then see every listing ranked by compatibility — highest match first.
          </p>
          <div style={styles.introMeta}>
            <span>~3 minutes</span>
            <span style={styles.dot}>·</span>
            <span>Get ranked matches</span>
          </div>
          <button style={styles.secondaryBtn} onClick={onStart}>Start the questionnaire</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------
   QUIZ
--------------------------------------------- */

function Quiz({ question, questionIndex, total, onSelect, onBack }) {
  return (
    <div style={styles.quizWrap}>
      <div style={{ marginBottom: 16 }}><Logo size={32} /></div>
      <div style={styles.progressRow}>
        {onBack ? (
          <button style={styles.backBtn} onClick={onBack} aria-label="Previous question">← Back</button>
        ) : <span />}
        <div style={styles.progressText}>{questionIndex + 1} / {total}</div>
      </div>

      <div style={styles.progressBarOuter}>
        <div style={{ ...styles.progressBarInner, width: `${((questionIndex + 1) / total) * 100}%` }} />
      </div>

      <h2 style={styles.question}>{question.text}</h2>

      <div style={styles.optionsCol}>
        {question.options.map((opt, i) => (
          <button key={i} style={styles.optionBtn} onClick={() => onSelect(i)}>
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

function Results({ archetype, ranked, onRestart, onPost, onMarkFilled, onRenew, sessionContact }) {
  const [suburbFilter, setSuburbFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all | group | solo
  const [sortBy, setSortBy] = useState("match");
  const [keyword, setKeyword] = useState("");

  const availableSuburbs = useMemo(() => {
    const set = new Set();
    for (const l of ranked) { if (l.suburb) set.add(l.suburb); }
    return UC_SUBURBS.filter((s) => set.has(s.name));
  }, [ranked]);

  const filtered = useMemo(() => {
    let list = ranked;
    if (suburbFilter !== "all") list = list.filter((l) => l.suburb === suburbFilter);
    if (typeFilter !== "all") list = list.filter((l) => l.type === typeFilter);
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter((l) =>
        l.bio?.toLowerCase().includes(kw) ||
        l.title?.toLowerCase().includes(kw) ||
        l.suburb?.toLowerCase().includes(kw)
      );
    }
    if (sortBy === "distance") {
      list = [...list].sort((a, b) => {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        return da !== db ? da - db : b.score - a.score;
      });
    }
    return list;
  }, [ranked, suburbFilter, typeFilter, sortBy, keyword]);

  const groups = filtered.filter((l) => l.type === "group");
  const solos = filtered.filter((l) => l.type === "solo");
  const showBoth = typeFilter === "all";

  return (
    <div style={styles.resultsWrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 }}>
        <Logo size={32} />
        <ShareButton />
      </div>

      <div className="stamp-anim" style={styles.archetypeCard}>
        <div style={styles.archetypeEyebrow}>YOUR FLATTING ARCHETYPE</div>
        <h1 style={styles.archetypeName}>{archetype.name}</h1>
        <p style={styles.archetypeTagline}>{archetype.tagline}</p>
        <p style={styles.archetypeDescription}>{archetype.description}</p>
      </div>

      {ranked.length > 0 && (
        <div style={styles.filterBar}>
          {/* Keyword search */}
          <div style={{ ...styles.fieldGroup, minWidth: "100%" }}>
            <label style={styles.label}>Search listings</label>
            <div style={{ position: "relative" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7E82" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                style={{ ...styles.input, paddingLeft: 36 }}
                type="text"
                placeholder="Search by suburb, bio keywords..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Suburb filter */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Suburb</label>
            <select style={styles.input} value={suburbFilter} onChange={(e) => setSuburbFilter(e.target.value)}>
              <option value="all">All suburbs</option>
              {availableSuburbs.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}{s.distanceKm != null ? ` (~${s.distanceKm}km)` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Listing type</label>
            <div style={styles.toggleRow}>
              {["all", "group", "solo"].map((t) => (
                <button key={t} type="button"
                  style={typeFilter === t ? styles.toggleBtnActive : styles.toggleBtn}
                  onClick={() => setTypeFilter(t)}>
                  {t === "all" ? "All" : t === "group" ? "Groups" : "Solo"}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Sort by</label>
            <div style={styles.toggleRow}>
              <button type="button" style={sortBy === "match" ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setSortBy("match")}>Best match</button>
              <button type="button" style={sortBy === "distance" ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => setSortBy("distance")}>Closest to UC</button>
            </div>
          </div>
        </div>
      )}

      {ranked.length === 0 ? (
        <div style={{ ...styles.emptyState, marginBottom: 32 }}>
          No listings yet — be the first to post one!
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...styles.emptyState, marginBottom: 32 }}>
          No listings match your search — try different filters.
        </div>
      ) : (
        <>
          {(showBoth || typeFilter === "group") && (
            <div style={styles.resultsSection}>
              <h3 style={styles.sectionLabel}>GROUPS LOOKING FOR PEOPLE</h3>
              {groups.length === 0 ? (
                <EmptyState text="No groups match this filter." />
              ) : (
                <div style={styles.cardsCol}>
                  {groups.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} onRenew={onRenew} sessionContact={sessionContact} />
                  ))}
                </div>
              )}
            </div>
          )}

          {(showBoth || typeFilter === "solo") && (
            <div style={styles.resultsSection}>
              <h3 style={styles.sectionLabel}>PEOPLE LOOKING TO JOIN A GROUP</h3>
              {solos.length === 0 ? (
                <EmptyState text="No solo profiles match this filter." />
              ) : (
                <div style={styles.cardsCol}>
                  {solos.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} onMarkFilled={onMarkFilled} onRenew={onRenew} sessionContact={sessionContact} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div style={styles.resultsActions}>
        <button style={styles.primaryBtn} onClick={onPost}>Post your own listing</button>
        <button style={styles.secondaryBtn} onClick={onRestart}>Retake the questionnaire</button>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

/* ---------------------------------------------
   LISTING CARD
--------------------------------------------- */

function ListingCard({ listing, onMarkFilled, onRenew, sessionContact }) {
  const [revealed, setRevealed] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const isOwner = !!(sessionContact && listing.contact && sessionContact === listing.contact);

  // spots left badge
  const spotsLeft = listing.type === "group" && listing.spotsNeeded > 0
    ? listing.spotsNeeded
    : null;

  function handleRenew() {
    onRenew && onRenew(listing.id);
    setRenewed(true);
    setTimeout(() => setRenewed(false), 3000);
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <div style={styles.cardTitle}>{listing.title}</div>
            {spotsLeft !== null && (
              <span style={styles.spotsBadge}>
                {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} open
              </span>
            )}
          </div>
          <div style={styles.cardMeta}>
            {listing.area} · {listing.budget} · Move in {listing.moveIn}
            {listing.distanceKm != null ? ` · ~${listing.distanceKm}km from UC` : ""}
          </div>
        </div>
        <div style={styles.matchBadge}>{listing.score}% match</div>
      </div>

      {isOwner && (
        <div style={styles.ownerActions}>
          <button style={styles.markFilledBtn} onClick={() => onMarkFilled && onMarkFilled(listing.id)}>
            ✓ Mark as filled
          </button>
          <button
            style={{ ...styles.renewBtn, background: renewed ? "#D6F2EC" : "transparent", color: renewed ? "#1FA9A0" : "#3D7A8C", borderColor: renewed ? "#1FA9A0" : "#3D7A8C" }}
            onClick={handleRenew}
          >
            {renewed ? "✓ Renewed!" : "↻ Renew listing"}
          </button>
        </div>
      )}

      <p style={styles.cardBio}>{listing.bio}</p>

      {revealed && listing.contact ? (
        <div style={styles.contactReveal}>
          Get in touch: <strong>{listing.contact}</strong>
        </div>
      ) : (
        <button style={styles.requestBtn} onClick={() => setRevealed(true)} disabled={!listing.contact}>
          {listing.contact ? "Request to join" : "No contact added"}
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

const BIO_MAX = 300;

function emptyForm() {
  return { postType: "group", title: "", people: "1", spotsNeeded: "1", suburb: "", budget: "", moveIn: "", bio: "", contact: "", selectedTags: [] };
}

function PostForm({ onSubmit, onCancel, error }) {
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const bioCharsLeft = BIO_MAX - form.bio.length;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTag(key) {
    setForm((prev) => {
      const has = prev.selectedTags.includes(key);
      return { ...prev, selectedTags: has ? prev.selectedTags.filter((t) => t !== key) : [...prev.selectedTags, key] };
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
    for (const key of form.selectedTags) { tags[key] = 2; }

    const people = parseInt(form.people, 10) || 1;
    const spotsNeeded = form.postType === "solo" ? 0 : parseInt(form.spotsNeeded, 10) || 1;
    const title = form.postType === "solo"
      ? "Solo looking to join a group"
      : form.title.trim() || `${people} looking for ${spotsNeeded} more`;

    setSubmitting(true);
    onSubmit({ type: form.postType, title, people, spotsNeeded, suburb: form.suburb, area: form.suburb, distanceKm: suburbDistance(form.suburb), budget: form.budget.trim(), moveIn: form.moveIn.trim(), bio: form.bio.trim(), contact: form.contact.trim(), tags });
    setSubmitting(false);
  }

  return (
    <div style={styles.formWrap}>
      <LogoLockup size={32} align="left" />
      <h1 style={styles.h2}>Post your listing</h1>
      <p style={styles.intro}>A couple of minutes now means people who'd actually fit can find you.</p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>What are you posting?</label>
          <div style={styles.toggleRow}>
            <button type="button" style={form.postType === "group" ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => update("postType", "group")}>A group with spots open</button>
            <button type="button" style={form.postType === "solo" ? styles.toggleBtnActive : styles.toggleBtn} onClick={() => update("postType", "solo")}>Just me, looking to join</button>
          </div>
        </div>

        {form.postType === "group" && (
          <div style={styles.fieldRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>How many people are you currently?</label>
              <input style={styles.input} type="number" min="1" max="10" value={form.people} onChange={(e) => update("people", e.target.value)} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>How many spots open?</label>
              <input style={styles.input} type="number" min="1" max="10" value={form.spotsNeeded} onChange={(e) => update("spotsNeeded", e.target.value)} />
            </div>
          </div>
        )}

        {form.postType === "group" && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Listing title (optional)</label>
            <input style={styles.input} type="text" placeholder="e.g. 2 looking for 2 chill flatmates" value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>
        )}

        <div style={styles.fieldRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Suburb</label>
            <select style={styles.input} value={form.suburb} onChange={(e) => update("suburb", e.target.value)}>
              <option value="" disabled>Select a suburb</option>
              {UC_SUBURBS.map((s) => (
                <option key={s.name} value={s.name}>{s.name}{s.distanceKm != null ? ` (~${s.distanceKm}km from UC)` : ""}</option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Budget (per week)</label>
            <input style={styles.input} type="text" placeholder="e.g. $200-220pw" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Move-in date</label>
          <input style={styles.input} type="text" placeholder="e.g. Feb 2027, or Now" value={form.moveIn} onChange={(e) => update("moveIn", e.target.value)} />
        </div>

        <div style={styles.fieldGroup}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label style={styles.label}>
              {form.postType === "group" ? "Tell people about your flat — vibe, routines, what you're after" : "Tell groups about yourself — vibe, routines, what you're after"}
            </label>
            <span style={{ fontSize: 12, color: bioCharsLeft < 30 ? "#C0455A" : "#6B7E82", fontVariantNumeric: "tabular-nums" }}>
              {bioCharsLeft}
            </span>
          </div>
          <textarea
            style={styles.textarea}
            rows={4}
            placeholder="Keep it real — this is what people match on"
            value={form.bio}
            maxLength={BIO_MAX}
            onChange={(e) => update("bio", e.target.value)}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Vibe tags — pick what fits (at least 1)</label>
          <div style={styles.tagGrid}>
            {NZ_TAG_OPTIONS.map((opt) => (
              <button key={opt.key} type="button"
                style={form.selectedTags.includes(opt.key) ? styles.tagBtnActive : styles.tagBtn}
                onClick={() => toggleTag(opt.key)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Contact (email, Instagram, phone — your call)</label>
          <input style={styles.input} type="text" placeholder="e.g. @yourhandle or email" value={form.contact} onChange={(e) => update("contact", e.target.value)} />
        </div>

        {(validationError || error) && <div style={styles.formError}>{validationError || error}</div>}

        <div style={styles.formActions}>
          <button type="submit" style={styles.primaryBtn} disabled={submitting}>
            {submitting ? "Posting…" : "Post listing"}
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={onCancel}>Cancel</button>
        </div>
      </form>

      <p style={styles.shareNote}>
        Your listing is visible to anyone using FlatMatch — only share contact details you're comfortable being public.
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
        Your listing is live and will show up in everyone's ranked matches based on compatibility.
        Share FlatMatch with your group chats so people can actually find it.
      </p>
      <div style={{ marginBottom: 16 }}>
        <ShareButton />
      </div>
      <div style={styles.formActions}>
        <button style={styles.primaryBtn} onClick={onTakeQuiz}>Take the quiz yourself</button>
        <button style={styles.secondaryBtn} onClick={onBrowse}>Back to home</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------
   STYLES
--------------------------------------------- */

const globalCSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
  @keyframes cardSlam {
    0% { transform: scale(0.92) translateY(12px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
  }
  .stamp-anim { animation: cardSlam 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
  @media (prefers-reduced-motion: reduce) { .stamp-anim { animation: none !important; } }
  button:focus-visible { outline: 3px solid #5FA8A0; outline-offset: 2px; }
  .option-btn:hover { border-color: #1FA9A0 !important; }
`;

const FONT_DISPLAY = "'Fredoka', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const COLORS = {
  paper: "#F4FAF9", ink: "#23363A", coral: "#1FA9A0", teal: "#3D7A8C",
  yellow: "#D6F2EC", inkSoft: "#6B7E82", cardBg: "#FFFFFF", border: "#DCEFEC",
};

const styles = {
  page: { minHeight: "100vh", background: COLORS.paper, color: COLORS.ink, fontFamily: FONT_BODY, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px 60px" },
  introWrap: { maxWidth: 560, width: "100%", textAlign: "center" },
  h1: { fontFamily: FONT_DISPLAY, fontSize: "clamp(34px, 7vw, 52px)", fontWeight: 600, lineHeight: 1.15, marginBottom: 18 },
  highlight: { color: COLORS.coral },
  intro: { fontSize: 16, lineHeight: 1.7, color: COLORS.inkSoft, maxWidth: 460, marginLeft: "auto", marginRight: "auto", marginBottom: 24 },
  introMeta: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 32, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  dot: { color: COLORS.border },
  ucBadge: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, color: COLORS.teal, background: COLORS.border, borderRadius: 100, padding: "6px 14px", display: "inline-block", marginBottom: 16 },
  pathsGrid: { display: "flex", flexDirection: "column", gap: 16, marginTop: 28, textAlign: "left" },
  pathCard: { background: COLORS.cardBg, border: `1.5px solid ${COLORS.border}`, borderRadius: 20, padding: "24px 26px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 },
  pathCardPrimary: { background: COLORS.ink, border: `1.5px solid ${COLORS.ink}`, borderRadius: 20, padding: "24px 26px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10, color: COLORS.paper },
  pathLabel: { fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.18em", fontWeight: 600, color: COLORS.yellow },
  pathLabelSecondary: { fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: "0.18em", fontWeight: 600, color: COLORS.teal },
  pathTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600 },
  pathDescription: { fontSize: 14, lineHeight: 1.6, opacity: 0.9 },
  primaryBtn: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, padding: "16px 36px", background: COLORS.coral, color: "#FFFFFF", border: "none", borderRadius: 100, cursor: "pointer", boxShadow: "0 4px 14px rgba(31,169,160,0.35)" },
  secondaryBtn: { fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 600, padding: "12px 28px", background: "transparent", color: COLORS.ink, border: `1.5px solid ${COLORS.ink}`, borderRadius: 100, cursor: "pointer", marginTop: 24 },
  shareBtn: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 100, border: "1.5px solid #DCEFEC", cursor: "pointer", display: "inline-flex", alignItems: "center", transition: "all 0.2s ease" },
  quizWrap: { maxWidth: 560, width: "100%" },
  progressRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backBtn: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: COLORS.inkSoft, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" },
  progressText: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.inkSoft },
  progressBarOuter: { height: 6, background: COLORS.border, borderRadius: 100, overflow: "hidden", marginBottom: 32 },
  progressBarInner: { height: "100%", background: COLORS.coral, borderRadius: 100, transition: "width 0.3s ease" },
  question: { fontFamily: FONT_DISPLAY, fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 600, lineHeight: 1.3, marginBottom: 28 },
  optionsCol: { display: "flex", flexDirection: "column", gap: 10 },
  optionBtn: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: 500, textAlign: "left", padding: "16px 20px", background: COLORS.cardBg, color: COLORS.ink, border: `1.5px solid ${COLORS.border}`, borderRadius: 14, cursor: "pointer", lineHeight: 1.5, transition: "border-color 0.15s ease" },
  resultsWrap: { maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", alignItems: "center" },
  archetypeCard: { width: "100%", background: COLORS.ink, color: COLORS.paper, borderRadius: 24, padding: "36px 32px", textAlign: "center", marginBottom: 40 },
  archetypeEyebrow: { fontFamily: FONT_DISPLAY, fontSize: 12, letterSpacing: "0.2em", fontWeight: 600, color: COLORS.yellow, marginBottom: 12 },
  archetypeName: { fontFamily: FONT_DISPLAY, fontSize: "clamp(32px, 8vw, 48px)", fontWeight: 700, marginBottom: 10, color: COLORS.coral },
  archetypeTagline: { fontSize: 16, fontWeight: 600, marginBottom: 16, color: COLORS.paper },
  archetypeDescription: { fontSize: 14.5, lineHeight: 1.7, color: "#D8D2E8", maxWidth: 460, marginLeft: "auto", marginRight: "auto" },
  filterBar: { display: "flex", gap: 14, flexWrap: "wrap", width: "100%", background: COLORS.cardBg, border: `1.5px solid ${COLORS.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 24 },
  resultsSection: { width: "100%", marginBottom: 32 },
  sectionLabel: { fontFamily: FONT_DISPLAY, fontSize: 13, letterSpacing: "0.14em", fontWeight: 600, color: COLORS.teal, marginBottom: 14 },
  cardsCol: { display: "flex", flexDirection: "column", gap: 14 },
  card: { background: COLORS.cardBg, border: `1.5px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 22px" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  cardTitle: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600 },
  cardMeta: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 },
  matchBadge: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.ink, background: COLORS.yellow, borderRadius: 100, padding: "6px 14px", whiteSpace: "nowrap", flexShrink: 0 },
  spotsBadge: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, color: COLORS.teal, background: "#EAF7F5", border: `1px solid ${COLORS.border}`, borderRadius: 100, padding: "3px 10px", whiteSpace: "nowrap" },
  cardBio: { fontSize: 14, lineHeight: 1.65, color: COLORS.ink, marginBottom: 14, marginTop: 10 },
  requestBtn: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, padding: "10px 22px", background: "transparent", color: COLORS.coral, border: `1.5px solid ${COLORS.coral}`, borderRadius: 100, cursor: "pointer" },
  contactReveal: { fontSize: 13.5, color: COLORS.ink, background: COLORS.yellow, borderRadius: 100, padding: "10px 18px", display: "inline-block" },
  ownerActions: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 },
  markFilledBtn: { padding: "7px 14px", background: "transparent", border: "1.5px solid #5FA8A0", color: "#5FA8A0", borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY },
  renewBtn: { padding: "7px 14px", background: "transparent", border: `1.5px solid ${COLORS.teal}`, color: COLORS.teal, borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, transition: "all 0.2s ease" },
  emptyState: { fontSize: 14, color: COLORS.inkSoft, background: COLORS.cardBg, border: `1.5px dashed ${COLORS.border}`, borderRadius: 16, padding: "20px 22px", textAlign: "center" },
  resultsActions: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 24, width: "100%" },
  formWrap: { maxWidth: 560, width: "100%" },
  h2: { fontFamily: FONT_DISPLAY, fontSize: "clamp(28px, 6vw, 38px)", fontWeight: 600, lineHeight: 1.2, marginBottom: 12 },
  form: { display: "flex", flexDirection: "column", gap: 18, marginTop: 8 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  fieldRow: { display: "flex", gap: 14, flexWrap: "wrap" },
  label: { fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 600, color: COLORS.ink },
  input: { fontFamily: FONT_BODY, fontSize: 15, padding: "12px 16px", border: `1.5px solid ${COLORS.border}`, borderRadius: 12, background: COLORS.cardBg, color: COLORS.ink, width: "100%" },
  textarea: { fontFamily: FONT_BODY, fontSize: 15, padding: "12px 16px", border: `1.5px solid ${COLORS.border}`, borderRadius: 12, background: COLORS.cardBg, color: COLORS.ink, resize: "vertical", lineHeight: 1.6, width: "100%" },
  toggleRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  toggleBtn: { fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 500, padding: "12px 18px", borderRadius: 100, border: `1.5px solid ${COLORS.border}`, background: COLORS.cardBg, color: COLORS.ink, cursor: "pointer" },
  toggleBtnActive: { fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600, padding: "12px 18px", borderRadius: 100, border: `1.5px solid ${COLORS.coral}`, background: COLORS.coral, color: "#FFFFFF", cursor: "pointer" },
  tagGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  tagBtn: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 100, border: `1.5px solid ${COLORS.border}`, background: COLORS.cardBg, color: COLORS.ink, cursor: "pointer" },
  tagBtnActive: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "10px 16px", borderRadius: 100, border: `1.5px solid ${COLORS.teal}`, background: COLORS.teal, color: "#FFFFFF", cursor: "pointer" },
  formError: { fontSize: 13, color: "#C0455A", background: "#FCEAEC", borderRadius: 10, padding: "10px 14px" },
  formActions: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  shareNote: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 18, textAlign: "center", lineHeight: 1.6 },
};
