import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'mookalaa-secret-key';

export interface AdminTokenPayload {
  email?: string;
  role?: string;
  [key: string]: any;
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest) {
  return request.cookies.get('auth-token')?.value ||
         request.headers.get('authorization')?.replace('Bearer ', '');
}

/**
 * Returns the signed-in admin for the request, or null when the request has no
 * valid admin session. Used to guard sensitive endpoints such as the payment
 * gateway credentials.
 */
export function getAdminFromRequest(request: NextRequest): AdminTokenPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || typeof payload === 'string') return null;

  return payload as AdminTokenPayload;
}
