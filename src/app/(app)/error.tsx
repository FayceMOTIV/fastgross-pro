'use client';

/**
 * Error page for App Router
 * Catches errors in the (app) route group
 */

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log l'erreur côté client
    console.error('App Error:', error);

    // En production, envoyer à un service de monitoring
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentry.captureException(error);
    }
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  const handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${error.message || 'Unknown error'}`);
    const body = encodeURIComponent(`
Erreur rencontrée: ${error.message}

Digest: ${error.digest || 'N/A'}

Page: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Date: ${new Date().toISOString()}
    `);
    window.open(`mailto:support@distram.fr?subject=${subject}&body=${body}`);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icône */}
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>

        {/* Message */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Oups ! Une erreur est survenue
        </h2>
        <p className="text-gray-600 mb-6">
          Nous nous excusons pour la gêne occasionnée. Notre équipe a été notifiée.
        </p>

        {/* Détails de l'erreur (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-gray-500">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4" />
            Accueil
          </button>
          <button
            onClick={handleReportBug}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bug className="w-4 h-4" />
            Signaler
          </button>
        </div>
      </div>
    </div>
  );
}
