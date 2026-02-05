import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware Next.js - DISTRAM by Face Media
 * AUTH DÉSACTIVÉE TEMPORAIREMENT
 */

export function middleware(request: NextRequest) {
  // Auth désactivée - laisser passer toutes les requêtes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
