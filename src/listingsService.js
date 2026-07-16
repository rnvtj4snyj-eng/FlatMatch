import { supabase } from './supabaseClient'

export async function fetchListings(institutionId = null) {
  let query = supabase
    .from('listings')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (institutionId) {
    query = query.eq('institution', institutionId)
  }

  const { data, error } = await query

  if (error) throw error

  return data.map(l => ({
    id: l.id,
    type: l.type,
    listingType: l.listing_type,
    title: l.title,
    crew: l.crew,
    seeking: l.seeking,
    people: l.people,
    spotsNeeded: l.spots_needed,
    suburb: l.suburb,
    area: l.area,
    distanceKm: l.distance_km,
    budget: l.budget,
    moveIn: l.move_in,
    bio: l.bio,
    contact: l.contact,
    tags: l.tags,
    photo: l.photo_url,
    status: l.status,
    institution: l.institution || null,
    miniQuizProfile: l.mini_quiz_profile || null,
    fullQuizProfile: l.full_quiz_profile || null,
    dealBreakers: l.deal_breakers || null,
    updates: l.updates || [],
    createdAt: new Date(l.created_at).getTime(),
    renewedAt: new Date(l.renewed_at).getTime(),
    expiresAt: new Date(l.expires_at).getTime(),
  }))
}

export async function createListing(listing) {
  let photoUrl = null

  if (listing.photo) {
    const base64 = listing.photo.split(',')[1]
    const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('listing-photos')
      .upload(fileName, byteArray, { contentType: 'image/jpeg' })

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(fileName)
      photoUrl = urlData.publicUrl
    }
  }

  const deleteToken = crypto.randomUUID()

  const payload = {
    type: listing.type,
    listing_type: listing.listingType,
    title: listing.title,
    crew: listing.crew || null,
    seeking: listing.seeking || null,
    people: listing.people,
    spots_needed: listing.spotsNeeded,
    suburb: listing.suburb,
    area: listing.area,
    distance_km: listing.distanceKm,
    budget: listing.budget,
    move_in: listing.moveIn,
    bio: listing.bio,
    contact: listing.contact,
    tags: listing.tags,
    photo_url: photoUrl,
    status: 'looking',
    institution: listing.institution || null,
    mini_quiz_profile: listing.miniQuizProfile || null,
    full_quiz_profile: listing.fullQuizProfile || null,
    deal_breakers: listing.dealBreakers || null,
    delete_token: deleteToken,
  }

  const { data, error } = await supabase
    .from('listings')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('Failed to save listing:', error)
    throw error
  }

  const saved = JSON.parse(localStorage.getItem('fm_tokens') || '{}')
  saved[data.id] = deleteToken
  localStorage.setItem('fm_tokens', JSON.stringify(saved))

  return {
    ...listing,
    id: data.id,
    photo: photoUrl,
    deleteToken,
    createdAt: new Date(data.created_at).getTime(),
    renewedAt: new Date(data.renewed_at).getTime(),
    expiresAt: new Date(data.expires_at).getTime(),
  }
}

export async function markListingFilled(listingId, tokenOverride) {
  const saved = JSON.parse(localStorage.getItem('fm_tokens') || '{}')
  const token = tokenOverride || saved[listingId]
  if (!token) throw new Error('Not authorised')

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId)
    .eq('delete_token', token)

  if (error) throw error

  delete saved[listingId]
  localStorage.setItem('fm_tokens', JSON.stringify(saved))
}

export async function updateListingStatus(listingId, status) {
  const { error } = await supabase
    .from('listings')
    .update({ status })
    .eq('id', listingId)

  if (error) throw error
}

export async function incrementViews(listingId) {
  const { error } = await supabase.rpc('increment_views', { listing_id: listingId })
  if (error) console.error(error)
}

export async function getViews(listingId) {
  const { data, error } = await supabase
    .from('listing_views')
    .select('views')
    .eq('listing_id', listingId)
    .single()

  if (error) return 0
  return data.views
}

export async function submitInterest(card) {
  const { error } = await supabase
    .from('interests')
    .insert(card)
  if (error) throw error
}

export async function getInterests(listingId) {
  const { data, error } = await supabase
    .from('interests')
    .select('*')
    .eq('listing_id', listingId)
    .order('score', { ascending: false })
  if (error) throw error
  return data
}

export async function connectInterest(interestId) {
  const { error } = await supabase
    .from('interests')
    .update({ connected: true, connected_at: new Date().toISOString() })
    .eq('id', interestId)
  if (error) throw error
}