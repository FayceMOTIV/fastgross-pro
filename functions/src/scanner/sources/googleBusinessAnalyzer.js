/**
 * googleBusinessAnalyzer.js — Fiche Google Business Profile via Serper
 */

export async function analyzeGoogleBusiness(businessName, location) {
  try {
    const { cachedSerperFetch } = await import('../../utils/serperCache.js');
    const query = location ? `${businessName} ${location}` : businessName;
    const data = await cachedSerperFetch('maps', { q: query, gl: 'fr', hl: 'fr', num: 1 }, { timeoutMs: 10000 });

    if (data.error) return null;
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
