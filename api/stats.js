// GET /api/stats?datasetId=xxx
// Returns aggregate counts for the active dataset (env var by default, or override via query).
// Filter dropdowns are now hardcoded in the frontend (not derived from this).

export default async function handler(req, res) {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  const DEFAULT_DATASET_ID = process.env.APIFY_DATASET_ID;
  const { datasetId = "", datasetIds = "" } = req.query;

  if (!APIFY_TOKEN) {
    return res.status(500).json({ error: "Missing APIFY_TOKEN env var" });
  }

  let ids = [];
  if (datasetIds) ids = datasetIds.split(",").map(s => s.trim()).filter(Boolean);
  else if (datasetId) ids = [datasetId];
  else if (DEFAULT_DATASET_ID) ids = [DEFAULT_DATASET_ID];

  if (ids.length === 0) {
    return res.status(200).json({ total: 0, avgRating: "0.0", uniqueCities: 0, uniqueCountries: 0 });
  }

  try {
    const allItems = (await Promise.all(ids.map(async id => {
      const url = `https://api.apify.com/v2/datasets/${id}/items?token=${APIFY_TOKEN}&clean=true&fields=title,city,country,countryCode,categoryName,website,totalScore`;
      const r = await fetch(url);
      if (!r.ok) return [];
      return r.json();
    }))).flat();

    const noWebsite = allItems.filter(i => {
      const w = i.website || "";
      return !w || w.includes("google.com/maps");
    });

    const cities = new Set(noWebsite.map(i => i.city).filter(Boolean));
    const countries = new Set(noWebsite.map(i => i.country || i.countryCode).filter(Boolean));
    const avgRating = noWebsite.length
      ? (noWebsite.reduce((s, i) => s + (parseFloat(i.totalScore) || 0), 0) / noWebsite.length).toFixed(1)
      : "0.0";

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      total: noWebsite.length,
      avgRating,
      uniqueCities: cities.size,
      uniqueCountries: countries.size,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
