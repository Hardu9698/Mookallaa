import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import {
  clearRazorpayConfig,
  detectMode,
  getRazorpayConfig,
  maskKeyId,
  maskSecret,
  saveRazorpayConfig,
  setRazorpayEnabled,
  validateKeyId,
  validateKeySecret,
  verifyRazorpayCredentials,
  type RazorpayConfig,
} from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/**
 * Admin-only CRUD for the Razorpay credentials.
 *
 * The key secret is never returned by this endpoint - only a masked preview of
 * it, so an admin can confirm which secret is currently saved.
 */

function unauthorized() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized. Please sign in to the admin panel again.' },
    { status: 401 }
  );
}

function toPublicShape(config: RazorpayConfig) {
  return {
    provider: 'razorpay',
    keyId: config.keyId,
    keyIdMasked: maskKeyId(config.keyId),
    secretMasked: maskSecret(config.keySecret),
    secretSet: config.hasKeySecret,
    secretDecryptFailed: config.secretDecryptFailed,
    mode: config.mode,
    enabled: config.enabled,
    isConfigured: config.isConfigured,
    source: config.source,
    envFallbackAvailable: config.envFallbackAvailable,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

export async function GET(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return unauthorized();

  try {
    const config = await getRazorpayConfig();
    return NextResponse.json(
      { success: true, config: toPublicShape(config) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/settings/payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load payment gateway settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const { keyId, keySecret, enabled, force, skipVerify } = body ?? {};

    // Enable / disable toggle only - no credential changes.
    if (keyId === undefined && keySecret === undefined && typeof enabled === 'boolean') {
      const existing = await getRazorpayConfig();

      if (enabled && !existing.hasKeyId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Save a valid Key ID and Key Secret before enabling Razorpay.',
          },
          { status: 400 }
        );
      }

      const updated = await setRazorpayEnabled(enabled, admin.email || null);
      return NextResponse.json({
        success: true,
        config: toPublicShape(updated),
        message: enabled ? 'Razorpay checkout enabled' : 'Razorpay checkout disabled',
      });
    }

    const keyIdCheck = validateKeyId(keyId);
    if (!keyIdCheck.valid) {
      return NextResponse.json({ success: false, error: keyIdCheck.error }, { status: 400 });
    }

    const existing = await getRazorpayConfig();
    const trimmedKeyId = String(keyId).trim();
    const providedSecret = typeof keySecret === 'string' ? keySecret.trim() : '';

    // The secret is optional on update: when left blank we keep the stored one.
    // It is mandatory the first time, and whenever the key id changes.
    let effectiveSecret = providedSecret;

    if (!providedSecret) {
      const keyIdChanged = existing.keyId !== trimmedKeyId;
      const storedSecretUsable = existing.source === 'database' && existing.hasKeySecret;

      if (keyIdChanged || !storedSecretUsable) {
        return NextResponse.json(
          {
            success: false,
            error: existing.secretDecryptFailed
              ? 'The stored Key Secret could not be read. Please enter it again.'
              : 'Razorpay Key Secret is required',
          },
          { status: 400 }
        );
      }

      effectiveSecret = existing.keySecret;
    } else {
      const secretCheck = validateKeySecret(providedSecret);
      if (!secretCheck.valid) {
        return NextResponse.json({ success: false, error: secretCheck.error }, { status: 400 });
      }
    }

    // Verify the pair against Razorpay before persisting it, unless the admin
    // explicitly asked us to skip or force.
    let verification = null;

    if (!skipVerify) {
      verification = await verifyRazorpayCredentials(trimmedKeyId, effectiveSecret);

      if (!verification.valid && verification.invalidCredentials && !force) {
        return NextResponse.json(
          {
            success: false,
            error: verification.message,
            verification,
            canForce: true,
          },
          { status: 400 }
        );
      }
    }

    const saved = await saveRazorpayConfig({
      keyId: trimmedKeyId,
      keySecret: providedSecret || undefined,
      enabled: typeof enabled === 'boolean' ? enabled : existing.enabled,
      updatedBy: admin.email || null,
    });

    const modeLabel = detectMode(trimmedKeyId) === 'live' ? 'LIVE' : 'TEST';
    let message = 'Razorpay credentials saved (' + modeLabel + ' mode)';
    if (verification && !verification.valid) {
      message += '. Note: ' + verification.message;
    }

    return NextResponse.json({
      success: true,
      config: toPublicShape(saved),
      verification,
      message,
    });
  } catch (error) {
    console.error('POST /api/settings/payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save payment gateway settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) return unauthorized();

  try {
    const config = await clearRazorpayConfig(admin.email || null);
    return NextResponse.json({
      success: true,
      config: toPublicShape(config),
      message: config.envFallbackAvailable
        ? 'Saved credentials removed. Falling back to the server environment keys.'
        : 'Saved credentials removed. Razorpay is no longer configured.',
    });
  } catch (error) {
    console.error('DELETE /api/settings/payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove payment gateway settings' },
      { status: 500 }
    );
  }
}
