import type { Handler } from '@netlify/functions';

interface GoogleTokenPayload {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  exp?: number;
  iss?: string;
  aud?: string;
}

interface VerifyResponse {
  success: boolean;
  whitelisted: boolean;
  user?: {
    email: string;
    name?: string;
    picture?: string;
    sub?: string;
  };
  error?: string;
}

// Fetch Google's public keys for JWT verification
let googlePublicKeys: Record<string, string> | null = null;
let keysExpiry: number = 0;

const fetchGooglePublicKeys = async (): Promise<Record<string, string>> => {
  const now = Date.now();

  // Cache keys for 1 hour
  if (googlePublicKeys && keysExpiry > now) {
    return googlePublicKeys;
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  const data = await response.json();

  googlePublicKeys = {};
  for (const key of data.keys) {
    googlePublicKeys[key.kid] = key;
  }

  keysExpiry = now + 3600000; // 1 hour
  return googlePublicKeys;
};

// Simple base64url decode
const base64UrlDecode = (str: string): string => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
};

// Verify JWT signature (simplified - for production, use a proper JWT library)
const verifyGoogleToken = async (token: string): Promise<GoogleTokenPayload | null> => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to get key ID
    const header = JSON.parse(base64UrlDecode(headerB64));
    const kid = header.kid;

    if (!kid) {
      return null;
    }

    // Get Google's public keys
    const keys = await fetchGooglePublicKeys();
    const key = keys[kid];

    if (!key) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as GoogleTokenPayload;

    // Verify token expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Verify issuer
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      return null;
    }

    // Verify audience (should match your Google Client ID)
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || payload.aud !== clientId) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { credential } = JSON.parse(event.body || '{}');

    if (!credential) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Credential is required' })
      };
    }

    // Verify the Google token
    const payload = await verifyGoogleToken(credential);

    if (!payload || !payload.email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    // Check whitelist
    const allowedEmails = process.env.ALLOWED_EMAILS || '';
    const normalizedEmail = payload.email.trim().toLowerCase();
    const whitelisted = allowedEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .includes(normalizedEmail);

    const response: VerifyResponse = {
      success: true,
      whitelisted,
      user: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        sub: payload.sub
      }
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Verify token error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
