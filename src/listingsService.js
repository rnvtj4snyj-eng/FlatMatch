import supabase from "./supabaseClient";

/**
 * Listings Service
 * Handles all database operations for listings
 * Falls back to localStorage if Supabase is not configured
 */

// LocalStorage fallback key
const LS_LISTINGS_KEY = "flatmatch_listings";

/**
 * Fetch all active listings from Supabase or localStorage
 * @returns {Promise<Array>} Array of active listings
 */
export async function fetchListings() {
  try {
    if (!supabase) {
      // Fallback to localStorage
      const stored = localStorage.getItem(LS_LISTINGS_KEY);
      const listings = stored ? JSON.parse(stored) : [];
      const now = Date.now();
      return listings.filter(
        (l) => !l.filled && (!l.expiresAt || l.expiresAt > now)
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("filled", false)
      .or(`expiresAt.is.null,expiresAt.gt."${now}"`)
      .order("createdAt", { ascending: false });

    if (error) {
      console.error("Error fetching listings:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Error in fetchListings:", err);
    return [];
  }
}

/**
 * Create a new listing
 * @param {Object} listing - The listing data
 * @returns {Promise<Object>} The created listing with ID
 */
export async function createListing(listing) {
  try {
    if (!supabase) {
      // Fallback to localStorage
      const id = `listing:${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const record = {
        ...listing,
        id,
        createdAt: Date.now(),
        renewedAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        filled: false,
      };
      const stored = localStorage.getItem(LS_LISTINGS_KEY) || "[]";
      const listings = JSON.parse(stored);
      listings.push(record);
      localStorage.setItem(LS_LISTINGS_KEY, JSON.stringify(listings));
      return record;
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();

    const { data, error } = await supabase
      .from("listings")
      .insert([
        {
          title: listing.title,
          type: listing.type,
          people: listing.people,
          spotsNeeded: listing.spotsNeeded,
          suburb: listing.suburb,
          area: listing.area,
          distanceKm: listing.distanceKm,
          budget: listing.budget,
          moveIn: listing.moveIn,
          bio: listing.bio,
          contact: listing.contact,
          tags: listing.tags,
          filled: false,
          createdAt: now.toISOString(),
          renewedAt: now.toISOString(),
          expiresAt: expiresAt,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating listing:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Error in createListing:", err);
    throw err;
  }
}

/**
 * Mark a listing as filled
 * @param {string} listingId - The ID of the listing to mark filled
 * @returns {Promise<void>}
 */
export async function markListingFilled(listingId) {
  try {
    if (!supabase) {
      // Fallback to localStorage
      const stored = localStorage.getItem(LS_LISTINGS_KEY) || "[]";
      const listings = JSON.parse(stored);
      const filtered = listings.filter((l) => l.id !== listingId);
      localStorage.setItem(LS_LISTINGS_KEY, JSON.stringify(filtered));
      return;
    }

    const { error } = await supabase
      .from("listings")
      .update({ filled: true })
      .eq("id", listingId);

    if (error) {
      console.error("Error marking listing filled:", error);
      throw error;
    }
  } catch (err) {
    console.error("Error in markListingFilled:", err);
    throw err;
  }
}

/**
 * Renew a listing (extend expiry date)
 * @param {string} listingId - The ID of the listing to renew
 * @returns {Promise<Object>} The updated listing
 */
export async function renewListing(listingId) {
  try {
    if (!supabase) {
      // Fallback to localStorage
      const stored = localStorage.getItem(LS_LISTINGS_KEY) || "[]";
      const listings = JSON.parse(stored);
      const listingIndex = listings.findIndex((l) => l.id === listingId);
      if (listingIndex >= 0) {
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        listings[listingIndex].renewedAt = Date.now();
        listings[listingIndex].expiresAt = Date.now() + THIRTY_DAYS;
        localStorage.setItem(LS_LISTINGS_KEY, JSON.stringify(listings));
        return listings[listingIndex];
      }
      return null;
    }

    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS).toISOString();

    const { data, error } = await supabase
      .from("listings")
      .update({
        renewedAt: now.toISOString(),
        expiresAt: expiresAt,
      })
      .eq("id", listingId)
      .select()
      .single();

    if (error) {
      console.error("Error renewing listing:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Error in renewListing:", err);
    throw err;
  }
}

/**
 * Delete a listing
 * @param {string} listingId - The ID of the listing to delete
 * @returns {Promise<void>}
 */
export async function deleteListing(listingId) {
  try {
    if (!supabase) {
      // Fallback to localStorage
      const stored = localStorage.getItem(LS_LISTINGS_KEY) || "[]";
      const listings = JSON.parse(stored);
      const filtered = listings.filter((l) => l.id !== listingId);
      localStorage.setItem(LS_LISTINGS_KEY, JSON.stringify(filtered));
      return;
    }

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingId);

    if (error) {
      console.error("Error deleting listing:", error);
      throw error;
    }
  } catch (err) {
    console.error("Error in deleteListing:", err);
    throw err;
  }
}
