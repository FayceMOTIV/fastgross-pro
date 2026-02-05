'use client';

/**
 * Global Error page for Next.js App Router
 * Catches unhandled errors in the root layout
 */

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
          <div className="max-w-md w-full text-center">
            {/* Icône */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>

            {/* Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Erreur critique
            </h1>
            <p className="text-gray-600 mb-8">
              Une erreur inattendue s&apos;est produite. Veuillez rafraîchir la page.
            </p>

            {/* Détails de l'erreur (dev only) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-6 p-4 bg-white border border-red-200 rounded-lg text-left">
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Réessayer
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Home className="w-5 h-5" />
                Page d&apos;accueil
              </button>
            </div>

            {/* Logo */}
            <div className="mt-12">
              <p className="text-sm text-gray-400">
                DISTRAM - FastGross Pro
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
