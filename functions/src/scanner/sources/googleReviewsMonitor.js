/**
 * googleReviewsMonitor.js — Monitoring avis Google Maps
 */

export async function analyzeGoogleReviews(placeId, businessName) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || !businessName) return null;

  try {
    const resp = await fetch('https://google.serper.dev/reviews', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: businessName, gl: 'fr', hl: 'fr', num: 20 }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const reviews = data.reviews || [];

    if (reviews.length === 0) return { hasReviews: false, totalReviews: 0 };

    const recentReviews = reviews.slice(0, 10);
    const avgRating = recentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / recentReviews.length;
    const withResponse = recentReviews.filter(r => r.ownerResponse).length;
    const responseRate = withResponse / recentReviews.length;

    const negativeRecent = recentReviews.filter(r => (r.rating || 5) <= 2).length;

    return {
      hasReviews: true,
      totalReviews: reviews.length,
      recentAvgRating: Math.round(avgRating * 10) / 10,
      responseRate: Math.round(responseRate * 100) / 100,
      negativeRecentCount: negativeRecent,
      recentReviewsTrend: avgRating < 3.5 ? 'declining' : avgRating > 4.2 ? 'improving' : 'stable',
    };
  } catch (error) {
    console.warn(`[GoogleReviews] Erreur:`, error.message);
    return null;
  }
}
