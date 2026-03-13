// Fetches products from Wix Stores and caches them in memory
let cache = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Auto-detect kits/bundles from product name or description.
// Works for any new products added to the catalog without code changes.
// A "kit" is a set containing multiple individual products.
function detectKit(name, description) {
  const kitKeywords = ["ערכה", "מארז", "סט", "קומבו", "combo", "kit", "set", "bundle", "pack"];

  // Pattern 1: "Product A + Product B" — split on "+" to extract components
  if (name.includes("+")) {
    const components = name.split("+").map((c) => c.trim()).filter(Boolean);
    return { isKit: true, components };
  }

  // Pattern 2: name or description contains kit keywords
  const lower = (name + " " + (description || "")).toLowerCase();
  if (kitKeywords.some((kw) => lower.includes(kw))) {
    return { isKit: true, components: [] };
  }

  return { isKit: false, components: [] };
}

export async function getProducts() {
  if (cache && Date.now() < cacheExpiry) return cache;

  const res = await fetch("https://www.wixapis.com/stores/v1/products/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.WIX_API_KEY,
      "wix-site-id": process.env.WIX_SITE_ID,
    },
    body: JSON.stringify({
      query: {
        paging: { limit: 100 },
        filter: JSON.stringify({ visible: { $eq: true } }),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Wix API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();

  cache = (data.products || []).map((p) => {
    const { isKit, components } = detectKit(p.name, p.description);
    return {
      id: p.id,
      name: p.name,
      description: p.description || "",
      url: p.productPageUrl?.base + p.productPageUrl?.path || "",
      price: p.price?.formatted?.price || "",
      image: p.media?.mainMedia?.image?.url || "",
      categories: (p.collections || []).map((c) => c.name),
      inStock: p.stock?.inStock ?? true,
      isKit,
      kitComponents: components, // e.g. ["מולטי ויטמין", "גזה"] for "מולטי + גזה"
    };
  });

  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return cache;
}
