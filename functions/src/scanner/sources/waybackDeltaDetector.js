/**
 * waybackDeltaDetector.js — Compare version actuelle vs Wayback Machine
 */

export async function detectWaybackDelta(domain) {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const timestamp = oneYearAgo.toISOString().replace(/[-:T]/g, '').substring(0, 8);

    const waybackUrl = `https://archive.org/wayback/available?url=${domain}&timestamp=${timestamp}`;
    const response = await fetch(waybackUrl, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (!data.archived_snapshots?.closest?.available) {
      return { hasArchive: false, unchanged: false };
    }

    const archivedUrl = data.archived_snapshots.closest.url;
    const archivedTimestamp = data.archived_snapshots.closest.timestamp;

    const [archivedResponse, currentResponse] = await Promise.allSettled([
      fetch(archivedUrl, { signal: AbortSignal.timeout(10000) }),
      fetch(`https://${domain}`, { signal: AbortSignal.timeout(10000) }),
    ]);

    if (archivedResponse.status !== 'fulfilled' || currentResponse.status !== 'fulfilled') {
      return { hasArchive: true, archivedTimestamp, unchanged: false };
    }

    const archivedHtml = await archivedResponse.value.text();
    const currentHtml = await currentResponse.value.text();

    const archivedTitle = extractTitle(archivedHtml);
    const currentTitle = extractTitle(currentHtml);
    const archivedCopyright = extractCopyrightYear(archivedHtml);
    const currentCopyright = extractCopyrightYear(currentHtml);

    const contentSimilarity = calculateSimilarity(
      stripHtml(archivedHtml).substring(0, 2000),
      stripHtml(currentHtml).substring(0, 2000)
    );

    return {
      hasArchive: true,
      archivedTimestamp,
      archivedTitle,
      currentTitle,
      titleChanged: archivedTitle !== currentTitle,
      copyrightChanged: archivedCopyright !== currentCopyright,
      archivedCopyright,
      currentCopyright,
      contentSimilarity,
      unchanged: contentSimilarity > 0.85 && archivedTitle === currentTitle,
      monthsSinceChange: contentSimilarity > 0.85 ? 12 : 0,
    };
  } catch (error) {
    return { hasArchive: false, error: error.message };
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractCopyrightYear(html) {
  const match = html.match(/(?:©|&copy;|\(c\))\s*(\d{4})/i);
  return match ? parseInt(match[1]) : null;
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
