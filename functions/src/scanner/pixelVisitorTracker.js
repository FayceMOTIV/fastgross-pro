/**
 * pixelVisitorTracker.js — Script pixel + reverse DNS -> identification visiteur
 * Cloud Function HTTP : recoit les pings du pixel installe sur les sites clients FMF
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import dns from 'dns/promises';

const getDb = () => getFirestore();

const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const pixelTracker = onRequest(
  {
    region: 'europe-west1',
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 10,
  },
  async (req, res) => {
    const { orgId, page, referrer } = req.query;
    const visitorIP =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

    if (!orgId || !visitorIP) {
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.status(200).send(PIXEL_GIF);
      return;
    }

    try {
      const db = getDb();

      let companyName = null;
      let hostnames = [];
      try {
        hostnames = await dns.reverse(visitorIP);
        if (hostnames.length > 0) {
          companyName = hostnames[0];
        }
      } catch (error) {
        // Reverse DNS fails often for residential IPs
      }

      const isBusinessIP = companyName ? !isResidentialISP(companyName) : false;

      await db.collection('pixelVisits').add({
        organizationId: orgId,
        visitorIP: hashIP(visitorIP),
        companyName,
        hostnames,
        page: page || '/',
        referrer: referrer || null,
        userAgent: req.headers['user-agent'] || null,
        visitedAt: new Date(),
        identified: !!companyName,
        isBusinessIP,
      });
    } catch (error) {
      console.error('[Pixel] Tracker error:', error.message);
    }

    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).send(PIXEL_GIF);
  }
);

function isResidentialISP(hostname) {
  const ispPatterns = [
    /\.orange\.fr$/i, /\.free\.fr$/i, /\.sfr\.net$/i, /\.bouygues/i,
    /\.numericable/i, /\.proxad/i, /\.neuf\.fr$/i, /\.wanadoo/i,
    /\.bbox/i, /\.dsl\./i, /\.adsl\./i, /\.dynamic\./i, /\.residential/i,
  ];
  return ispPatterns.some((pattern) => pattern.test(hostname));
}

function hashIP(ip) {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[parts.length - 1] = 'xxx';
    return parts.join('.');
  }
  return ip.substring(0, ip.length / 2) + '***';
}
