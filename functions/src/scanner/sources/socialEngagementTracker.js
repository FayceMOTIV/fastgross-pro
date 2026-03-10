/**
 * socialEngagementTracker.js — Instagram/TikTok engagement monitoring
 */

export async function trackSocialEngagement(socialLinks) {
  if (!socialLinks) return null;

  const results = {};

  if (socialLinks.instagram) {
    results.instagram = await analyzeInstagramProfile(socialLinks.instagram);
  }

  if (socialLinks.facebook) {
    results.facebook = { detected: true, url: socialLinks.facebook };
  }

  if (socialLinks.tiktok) {
    results.tiktok = { detected: true, url: socialLinks.tiktok };
  }

  const hasAnySocial = Object.keys(results).length > 0;
  return { ...results, hasAnySocial };
}

async function analyzeInstagramProfile(instagramUrl) {
  // Extract handle from URL
  const handleMatch = instagramUrl.match(/instagram\.com\/([^/?]+)/);
  if (!handleMatch) return { detected: true, url: instagramUrl };

  const handle = handleMatch[1];

  // Basic check via public profile (no API key needed)
  try {
    const resp = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!resp.ok) {
      return { detected: true, handle, accessible: false };
    }

    const html = await resp.text();

    // Try to extract basic info from meta tags
    const descMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:description|description)["']\s+content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1] : null;

    // Parse followers from description like "1,234 Followers"
    let followers = null;
    if (description) {
      const followersMatch = description.match(/([\d,.]+[KkMm]?)\s*Followers/i);
      if (followersMatch) {
        followers = parseFollowerCount(followersMatch[1]);
      }
    }

    return {
      detected: true,
      handle,
      accessible: true,
      followers,
      description: description?.substring(0, 200),
    };
  } catch (error) {
    return { detected: true, handle, accessible: false, error: error.message };
  }
}

function parseFollowerCount(str) {
  if (!str) return null;
  str = str.replace(/,/g, '');
  const multiplier = str.match(/([KkMm])$/);
  const num = parseFloat(str);
  if (multiplier) {
    if (multiplier[1].toLowerCase() === 'k') return Math.round(num * 1000);
    if (multiplier[1].toLowerCase() === 'm') return Math.round(num * 1000000);
  }
  return Math.round(num);
}
