'use client';

/**
 * Error Boundary global pour capturer les erreurs React
 * Affiche une UI de fallback en cas d'erreur
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// ============================================
// ERROR BOUNDARY CLASS
// ============================================

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log l'erreur
    console.error('🔴 Error Boundary caught error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Callback personnalisé
    this.props.onError?.(error, errorInfo);

    // En production, envoyer à Sentry/LogRocket
    if (process.env.NODE_ENV === 'production') {
      // TODO: Intégrer Sentry
      // Sentry.captureException(error, { extra: errorInfo });
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReportBug = () => {
    const subject = encodeURIComponent(`Bug Report: ${this.state.error?.message || 'Unknown error'}`);
    const body = encodeURIComponent(`
Erreur rencontrée: ${this.state.error?.message}

Stack trace:
${this.state.error?.stack}

Page: ${window.location.href}
Date: ${new Date().toISOString()}
    `);
    window.open(`mailto:support@distram.fr?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // Fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback par défaut
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
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
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                <p className="text-sm font-mono text-red-600 break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="w-4 h-4" />
                Accueil
              </button>
              <button
                onClick={this.handleReportBug}
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

    return this.props.children;
  }
}

// ============================================
// WRAPPER FONCTIONNEL
// ============================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

// ============================================
// MINI ERROR BOUNDARY POUR SECTIONS
// ============================================

export function SectionErrorBoundary({
  children,
  sectionName = 'Cette section',
}: {
  children: ReactNode;
  sectionName?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {sectionName} n&apos;a pas pu être chargée
            </span>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================
// ERROR FALLBACK COMPONENTS
// ============================================

export function ChartErrorFallback() {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Erreur lors du chargement du graphique</p>
      </div>
    </div>
  );
}

export function TableErrorFallback() {
  return (
    <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
      <p className="text-sm text-gray-500">Erreur lors du chargement des données</p>
    </div>
  );
}

export function CardErrorFallback() {
  return (
    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
      <p className="text-sm text-red-600">Erreur de chargement</p>
    </div>
  );
}
