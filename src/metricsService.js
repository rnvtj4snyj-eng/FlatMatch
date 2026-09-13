import { supabase } from './supabaseClient'

// Read all four numbers shown in the metrics strip
export async function fetchMetrics() {
  // Get the three counters
  const { data: counters } = await supabase
    .from('counters')
    .select('name, value')

  // Count how many stories exist
  const { count: storyCount } = await supabase
    .from('stories')
    .select('*', { count: 'exact', head: true })

  // Turn the counters list into an easy lookup, e.g. map.total_listings
  const map = {}
  ;(counters || []).forEach((row) => { map[row.name] = row.value })

  return {
    totalListings: map.total_listings ?? 0,
    quizCompletions: map.quiz_completions ?? 0,
    connectionRequests: map.connection_requests ?? 0,
    stories: storyCount ?? 0,
  }
}

// Add 1 to a counter (name = 'total_listings' | 'quiz_completions' | 'connection_requests')
export async function bumpCounter(name) {
  try {
    await supabase.rpc('increment_counter', { counter_name: name })
  } catch (err) {
    console.error('Failed to bump counter:', name, err)
  }
}

// Save a "found my flat" story
export async function saveStory({ name, story, listingId }) {
  const { error } = await supabase
    .from('stories')
    .insert({ name, story, listing_id: listingId })
  if (error) throw error
}