/**
 * googleReviewsMonitor.js — Monitoring avis Google Maps
 */

export async function analyzeGoogleReviews(placeId, businessName) {
  if (!businessName) return null;

  try {
    const { cachedSerperFetch } = await import('../../utils/serperCache.js');
    const data = await cachedSerperFetch('reviews', { q: businessName, gl: 'fr', hl: 'fr', num: 20 }, { timeoutMs: 10000 });

    if (data.error) return null;
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
