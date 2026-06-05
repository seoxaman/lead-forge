// POST /api/abort-run
// Aborts a running Apify actor run on Apify's side (stops further charging).
// Returns the dataset ID so the frontend can fetch whatever was scraped so far.
// Body: { runId: "abc123" }

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const { runId } = req.body || {};

  if (!APIFY_TOKEN) return res.status(500).json({ error: "Missing APIFY_TOKEN" });
  if (!runId) return res.status(400).json({ error: "Provide runId in body" });

  try {
    // Apify abort endpoint — stops the actor immediately, dataset is preserved
    const url = `https://api.apify.com/v2/actor-runs/${runId}/abort?token=${APIFY_TOKEN}`;
    const r = await fetch(url, { method: "POST" });

    if (!r.ok) {
      const txt = await r.text();
      // 400 = run already finished/aborted — still return dataset info
      if (r.status !== 400) {
        return res.status(r.status).json({ error: `Apify: ${txt.slice(0, 200)}` });
      }
    }

    // Either we aborted successfully or run was already done — fetch current status
    const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`;
    const sr = await fetch(statusUrl);
    const sj = await sr.json();
    const d = sj.data || {};

    return res.status(200).json({
      success: true,
      runId: d.id,
      status: d.status,
      datasetId: d.defaultDatasetId,
      itemCount: d.stats?.outputBodyLen || d.stats?.resultsCount || 0,
      message: "Scrape aborted. Whatever was scraped is preserved in the dataset.",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
