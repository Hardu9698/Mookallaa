import { NextResponse } from 'next/server';

const ADMIN_API_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || 'https://mookala.vercel.app/api';

// The admin can change the Razorpay keys at any time, so this proxy must never
// cache the response.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET() {
  try {
    const response = await fetch(`${ADMIN_API_URL}/payment/config`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment config' },
      { status: 500, headers: NO_STORE }
    );
  }
}
