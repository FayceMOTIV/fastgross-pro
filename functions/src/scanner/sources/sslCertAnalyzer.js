/**
 * sslCertAnalyzer.js — Analyse du certificat SSL
 */
import tls from 'tls';

export async function analyzeSSLCert(domain) {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(443, domain, { servername: domain }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          resolve({ hasSSL: false });
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const issuedAt = new Date(cert.valid_from);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
        const certAgeDays = Math.floor((now - issuedAt) / (1000 * 60 * 60 * 24));

        resolve({
          hasSSL: true,
          issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
          subject: cert.subject?.CN || domain,
          issuedAt: issuedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          daysUntilExpiry,
          isExpired: daysUntilExpiry < 0,
          expiringSoon: daysUntilExpiry > 0 && daysUntilExpiry < 30,
          isLetsEncrypt: (cert.issuer?.O || '').toLowerCase().includes('encrypt'),
          certAgeDays,
          serialNumber: cert.serialNumber,
        });
      });

      socket.on('error', () => {
        resolve({ hasSSL: false, error: 'Connection failed' });
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        resolve({ hasSSL: false, error: 'Timeout' });
      });
    } catch (error) {
      resolve({ hasSSL: false, error: error.message });
    }
  });
}
