// Allowed origins for CORS on callable functions
// Webhooks (onRequest) keep cors: true for external service access
export const ALLOWED_ORIGINS = [
  'https://face-media-factory.web.app',
  'https://face-media-factory.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
]
