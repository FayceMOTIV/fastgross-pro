/**
 * googleBusinessAnalyzer.js — Fiche Google Business Profile via Serper
 */

export async function analyzeGoogleBusiness(businessName, location) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const query = location ? `${businessName} ${location}` : businessName;
    const resp = await fetch('https://google.serper.dev/maps', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, gl: 'fr', hl: 'fr', num: 1 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const place = data.places?.[0];
    if (!place) return { exists: false };

    const rating = place.rating || 0;
    const totalReviews = place.ratingCount || 0;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return {
      exists: true,
      title: place.title,
      rating,
      totalReviews,
      address: place.address,
      phone: place.phoneNumber,
      website: place.website,
      hasWebsiteLink: !!place.website,
      categories: place.category ? [place.category] : [],
      latitude: place.latitude,
      longitude: place.longitude,
      cid: place.cid,
    };
  } catch (error) {
    console.warn(`[GoogleBusiness] Erreur ${businessName}:`, error.message);
    return null;
  }
}
