// POST /api/sync
// Triggers a new Apify Google Maps Scraper run on-demand.
//
// Body: {
//   searchString: "plumbers in austin texas",
//   targetLeads: 10,           // how many no-website leads user wants
//   multiplier: 3              // scrape this much more to filter (default 3x)
// }
//
// Returns the new datasetId — save it as APIFY_DATASET_ID env var to make it live.

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const ACTOR_ID = process.env.APIFY_ACTOR_ID || "compass~crawler-google-places";

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: "Missing APIFY_TOKEN env var" });
  }

  const body = req.body || {};
  const searchString = body.searchString || body.query;
  const targetLeads = parseInt(body.targetLeads || body.maxItems || 10);
  const multiplier = parseFloat(body.multiplier || 3);

  // Calculate actual scrape count: target × multiplier
  // This compensates for filtering out businesses WITH websites
  const actualScrapeCount = Math.ceil(targetLeads * multiplier);

  if (!searchString) {
    return res.status(400).json({ error: "Provide 'searchString' in JSON body, e.g. 'plumbers in austin'" });
  }

  try {
    const apifyUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}`;

    const input = {
      searchStringsArray: [searchString],
      maxCrawledPlacesPerSearch: actualScrapeCount,
      language: "en",
      skipClosedPlaces: true,
      scrapePlaceDetailPage: true,
      includeWebResults: false,
    };

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
      targetLeads,
      actualScrapeCount,
      multiplier,
      message: `Scrape started: ${actualScrapeCount} businesses will be scraped to find ~${targetLeads} without websites.`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
