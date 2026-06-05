// GET /api/run-status?runId=xxx
// Checks an Apify actor run's status. Used by frontend to poll while waiting for a scrape to finish.

export default async function handler(req, res) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const { runId } = req.query;

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: "Missing APIFY_TOKEN env var" });
  }
  if (!runId) {
    return res.status(400).json({ error: "Provide ?runId= query param" });
  }

  try {
    const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`;
    const r = await fetch(url);
    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: `Apify: ${txt.slice(0, 200)}` });
    }
    const json = await r.json();
    const d = json.data || {};

    return res.status(200).json({
      runId: d.id,
      status: d.status,                    // READY, RUNNING, SUCCEEDED, FAILED, TIMING-OUT, ABORTING, ABORTED
      startedAt: d.startedAt,
      finishedAt: d.finishedAt,
      datasetId: d.defaultDatasetId,
      itemCount: d.stats?.outputBodyLen || d.stats?.resultsCount || 0,
      runtimeSecs: d.stats?.runTimeSecs || 0,
      isDone: d.status === "SUCCEEDED" || d.status === "FAILED" || d.status === "ABORTED",
      isSuccess: d.status === "SUCCEEDED",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
