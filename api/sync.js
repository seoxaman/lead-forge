// POST /api/sync
// Triggers a new Apify Google Maps Scraper run on-demand.
//
// Body: {
//   niche: "Restaurant",       // WHAT to search
//   city: "Mumbai",            // WHERE — city
//   country: "India",          // WHERE — country
//   targetLeads: 10,           // how many no-website leads user wants
//   multiplier: 3              // scrape this much more to filter (default 3x)
// }
//
// Uses Apify's locationQuery to GEOGRAPHICALLY anchor the search — so
// "Restaurant in Mumbai India" no longer returns places in Columbia, SC
// just because their name contains "Mumbai".

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const ACTOR_ID = process.env.APIFY_ACTOR_ID || "compass~crawler-google-places";

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: "Missing APIFY_TOKEN env var" });
  }

  const body = req.body || {};

  // Accept either separate fields (new) OR searchString (backward compat)
  const niche = body.niche || "";
  const city = body.city || "";
  const country = body.country || "";
  const legacySearchString = body.searchString || body.query;

  const targetLeads = parseInt(body.targetLeads || body.maxItems || 10);
  const multiplier = parseFloat(body.multiplier || 3);
  const actualScrapeCount = Math.ceil(targetLeads * multiplier);

  // Validate input
  if (!niche && !legacySearchString) {
    return res.status(400).json({ error: "Provide 'niche' (e.g. 'Restaurant') in body" });
  }

  // Build proper Apify input with GEO-ANCHORED search
  const input = {
    maxCrawledPlacesPerSearch: actualScrapeCount,
    language: "en",
    skipClosedPlaces: true,
    scrapePlaceDetailPage: true,
    includeWebResults: false,
  };

  // KEY FIX: split niche (what) from location (where)
  if (niche && (city || country)) {
    // New mode: geo-anchored search
    input.searchStringsArray = [niche];                              // WHAT: "Restaurant"
    input.locationQuery = [city, country].filter(Boolean).join(", ");// WHERE: "Mumbai, India"
  } else {
    // Legacy mode: just use the combined string
    input.searchStringsArray = [legacySearchString || niche];
  }

  // Build a friendly display query for the response
  const displayQuery = niche
    ? `${niche} in ${[city, country].filter(Boolean).join(", ")}`
    : (legacySearchString || "");

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`;

    const r = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: `Apify: ${txt.slice(0, 300)}` });
    }

    const run = await r.json();
    return res.status(200).json({
      success: true,
      runId: run.data.id,
      status: run.data.status,
      datasetId: run.data.defaultDatasetId,
      consoleUrl: `https://console.apify.com/actors/runs/${run.data.id}`,
      query: displayQuery,
      apifyInput: { searchStringsArray: input.searchStringsArray, locationQuery: input.locationQuery },
      targetLeads,
      actualScrapeCount,
      multiplier,
      message: `Scrape started: ${actualScrapeCount} businesses will be scraped in ${input.locationQuery || "search text"} to find ~${targetLeads} without websites.`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
