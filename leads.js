// GET /api/leads
// Fetches leads from your Apify dataset, filters for "no website" businesses,
// and returns a paginated, filtered list to the frontend.
//
// Query params:
//   ?datasetId=xxx     - override the env var dataset (use frontend-tracked scrapes)
//   ?datasetIds=a,b,c  - aggregate from multiple datasets (comma-separated)
//   ?country=&city=&niche=&minRating=&minReviews=&hasPhone=&hasEmail=&limit=&offset=&sort=

export default async function handler(req, res) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const DEFAULT_DATASET_ID = process.env.APIFY_DATASET_ID;

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: "Server missing APIFY_TOKEN env var" });
  }

  const {
    datasetId = "",
    datasetIds = "",
    country = "",
    city = "",
    niche = "",
    minRating = "0",
    minReviews = "0",
    hasPhone = "false",
    hasEmail = "false",
    sort = "rating",
    limit = "60",
    offset = "0",
  } = req.query;

  // Decide which datasets to query
  let ids = [];
  if (datasetIds) ids = datasetIds.split(",").map(s => s.trim()).filter(Boolean);
  else if (datasetId) ids = [datasetId];
  else if (DEFAULT_DATASET_ID) ids = [DEFAULT_DATASET_ID];

  if (ids.length === 0) {
    return res.status(500).json({ error: "No dataset to query. Set APIFY_DATASET_ID env var or pass ?datasetId=" });
  }

  try {
    // Fetch all datasets in parallel
    const allItems = (await Promise.all(ids.map(async id => {
      const url = `https://api.apify.com/v2/datasets/${id}/items?token=${APIFY_TOKEN}&clean=true&format=json`;
      const r = await fetch(url);
      if (!r.ok) return [];   // skip failed datasets (might be still-running)
      return r.json();
    }))).flat();

    // De-dupe by gmb_place_id (most reliable unique key)
    const seen = new Set();
    const unique = [];
    for (const it of allItems) {
      const key = it.placeId || it.cid || `${it.title}|${it.address}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(it);
    }

    // Normalize + filter for "no website"
    let leads = unique
      .filter(it => {
        const website = it.website || it.url_website || it.websiteUrl || "";
        const hasRealWebsite = website && !website.includes("google.com/maps") && !website.includes("maps.google");
        return !hasRealWebsite && (it.title || it.name);
      })
      .map((it, idx) => normalize(it, idx));

    // Apply filters
    if (country) leads = leads.filter(l =>
      l.countryCode === country.toUpperCase() ||
      (l.country || "").toLowerCase() === country.toLowerCase() ||
      (l.countryName || "").toLowerCase() === country.toLowerCase()
    );
    if (city) leads = leads.filter(l => (l.city || "").toLowerCase() === city.toLowerCase());
    if (niche) leads = leads.filter(l => (l.niche || "").toLowerCase().includes(niche.toLowerCase()));
    if (parseFloat(minRating) > 0) leads = leads.filter(l => l.rating >= parseFloat(minRating));
    if (parseInt(minReviews) > 0) leads = leads.filter(l => l.reviews >= parseInt(minReviews));
    if (hasPhone === "true") leads = leads.filter(l => !!l.phone);
    if (hasEmail === "true") leads = leads.filter(l => !!l.email);

    if (sort === "rating") leads.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    else if (sort === "reviews") leads.sort((a, b) => b.reviews - a.reviews);
    else if (sort === "recent") leads.sort((a, b) => (b.scrapedAt || 0) - (a.scrapedAt || 0));

    const total = leads.length;
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const page = leads.slice(start, end);

    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json({
      total,
      returned: page.length,
      offset: start,
      limit: parseInt(limit),
      datasetsQueried: ids.length,
      leads: page,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normalize(it, idx) {
  const placeId = it.placeId || it.cid || "";
  const rating = parseFloat(it.totalScore || it.rating || 0) || 0;
  const reviews = parseInt(it.reviewsCount || it.totalReviews || 0) || 0;
  const countryRaw = it.country || it.countryCode || "";
  return {
    id: placeId ? `lead_${placeId}` : `lead_${idx}_${Date.now()}`,
    gmb_place_id: placeId,
    name: it.title || it.name || "Unnamed business",
    niche: it.categoryName || (Array.isArray(it.categories) ? it.categories[0] : "") || "Other",
    country: countryRaw,
    countryCode: it.countryCode || "",
    countryName: countryRaw,
    city: it.city || "",
    state: it.state || "",
    address: it.address || "",
    phone: it.phone || it.phoneUnformatted || null,
    email: extractEmail(it),
    rating,
    reviews,
    photos: parseInt(it.imagesCount || 0) || 0,
    gmb_url: it.url || (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : ""),
    hours: formatHours(it.openingHours),
    lat: it.location?.lat || null,
    lng: it.location?.lng || null,
    scrapedAt: it.scrapedAt ? new Date(it.scrapedAt).getTime() : Date.now(),
    cost: (rating >= 4.5 && reviews >= 100) ? 2 : 1,
  };
}

function extractEmail(it) {
  if (it.email) return it.email;
  if (Array.isArray(it.emails) && it.emails[0]) return it.emails[0];
  if (it.contactInfo?.email) return it.contactInfo.email;
  return null;
}

function formatHours(hrs) {
  if (!hrs) return "";
  if (typeof hrs === "string") return hrs;
  if (Array.isArray(hrs)) {
    return hrs.map(h => `${h.day || ""}: ${h.hours || ""}`.trim()).filter(Boolean).slice(0, 7).join(" · ");
  }
  return "";
}
