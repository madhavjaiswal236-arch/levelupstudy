import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface OAuthClientRecord {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
}

const DEFAULT_CLIENT_ID =
  '807015900608-gagaqm29c2ol637rvqp0a0p14ovft8po.apps.googleusercontent.com';

const KNOWN_TARGET_REDIRECT_URIS = [
  'https://ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app/api/auth/callback',
  'https://levelupstudy.vercel.app',
  'https://levelupstudy.vercel.app/__/auth/handler',
];

function loadOAuthClients(): { targetClientId: string; clients: Map<string, OAuthClientRecord>; envClientId: string } {
  const clients = new Map<string, OAuthClientRecord>();
  let firebaseOAuthClientId = '';

  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.oAuthClientId) {
        firebaseOAuthClientId = String(config.oAuthClientId).trim();
      }
    }
  } catch {
    // ignore
  }

  const targetClientId = firebaseOAuthClientId || DEFAULT_CLIENT_ID;

  const registerOAuthJson = (rawJson: string): boolean => {
    const trimmed = rawJson.trim();
    if (!trimmed.startsWith('{')) return false;
    try {
      const parsed = JSON.parse(trimmed);
      const webCfg = parsed.web || parsed.installed || parsed;
      const secret = typeof webCfg?.client_secret === 'string' ? webCfg.client_secret.trim() : '';
      const clientId = typeof webCfg?.client_id === 'string' ? webCfg.client_id.trim() : targetClientId;
      if (!secret) return false;
      const existing = clients.get(clientId);
      const parsedRedirects = Array.isArray(webCfg?.redirect_uris) ? webCfg.redirect_uris : [];
      clients.set(clientId, {
        clientId,
        clientSecret: secret,
        redirectUris: parsedRedirects.length > 0 ? parsedRedirects : existing?.redirectUris || [],
      });
      return true;
    } catch {
      return false;
    }
  };

  for (const dirPath of [path.resolve(process.cwd(), 'public/assets/aistudio'), process.cwd()]) {
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          if (file.startsWith('client_secret') && file.endsWith('.json')) {
            try {
              registerOAuthJson(fs.readFileSync(path.join(dirPath, file), 'utf8'));
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const jsonCandidateEnvKeys = [
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CLIENT_SECRET_JSON',
    'GOOGLE_OAUTH_JSON',
    'GOOGLE_OAUTH_SECRET',
    'GOOGLE_CREDENTIALS',
    'GOOGLE_AUTH_JSON',
    'CLIENT_SECRET_JSON',
  ];
  for (const key of jsonCandidateEnvKeys) {
    const val = process.env[key];
    if (typeof val === 'string') {
      registerOAuthJson(val);
    }
  }
  for (const val of Object.values(process.env)) {
    if (typeof val === 'string' && val.trim().startsWith('{') && val.includes('client_secret')) {
      registerOAuthJson(val);
    }
  }

  const envClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const rawEnvSecret = (
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_SECRET ||
    process.env.CLIENT_SECRET ||
    ''
  ).trim();
  const envClientSecret = rawEnvSecret.startsWith('{') ? '' : rawEnvSecret;

  if (envClientSecret) {
    if (!clients.has(targetClientId)) {
      clients.set(targetClientId, {
        clientId: targetClientId,
        clientSecret: envClientSecret,
        redirectUris: KNOWN_TARGET_REDIRECT_URIS,
      });
    }
    if (envClientId && envClientId !== targetClientId && !clients.has(envClientId)) {
      clients.set(envClientId, {
        clientId: envClientId,
        clientSecret: envClientSecret,
        redirectUris: [],
      });
    }
  }

  return { targetClientId, clients, envClientId };
}

function getActiveOAuthClient(
  state: ReturnType<typeof loadOAuthClients>,
  preferredClientId?: string
): OAuthClientRecord | null {
  const { targetClientId, clients, envClientId } = state;
  if (clients.has(targetClientId) && (!preferredClientId || preferredClientId === targetClientId)) {
    return clients.get(targetClientId)!;
  }
  if (preferredClientId && clients.has(preferredClientId)) {
    return clients.get(preferredClientId)!;
  }
  if (clients.has(targetClientId)) {
    return clients.get(targetClientId)!;
  }
  if (envClientId && clients.has(envClientId)) {
    return clients.get(envClientId)!;
  }
  const first = clients.values().next();
  return first.done ? null : first.value;
}

function resolveRedirectUriForOrigin(
  client: OAuthClientRecord | null,
  targetClientId: string,
  origin: string
): { redirectUri: string | null; offlineSupported: boolean } {
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (!client || !cleanOrigin) {
    return { redirectUri: null, offlineSupported: false };
  }

  if (process.env.GOOGLE_REDIRECT_URI) {
    return { redirectUri: process.env.GOOGLE_REDIRECT_URI.trim(), offlineSupported: true };
  }

  const effectiveRedirects =
    client.redirectUris.length > 0
      ? client.redirectUris
      : client.clientId === targetClientId
        ? KNOWN_TARGET_REDIRECT_URIS
        : [];

  if (effectiveRedirects.length > 0) {
    const candidates = [
      `${cleanOrigin}/api/auth/google/callback`,
      `${cleanOrigin}/api/auth/callback`,
      cleanOrigin,
      `${cleanOrigin}/`,
    ];
    for (const candidate of candidates) {
      if (effectiveRedirects.includes(candidate)) {
        return { redirectUri: candidate, offlineSupported: true };
      }
    }
    return { redirectUri: null, offlineSupported: false };
  }

  try {
    const parsed = new URL(cleanOrigin);
    if (parsed.hostname === 'levelupstudy.vercel.app') {
      return { redirectUri: cleanOrigin, offlineSupported: true };
    }
  } catch {
    // ignore
  }
  return { redirectUri: `${cleanOrigin}/api/auth/google/callback`, offlineSupported: true };
}

function isAllowedOrigin(originUrl: string): boolean {
  const configuredOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:5173',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    ...configuredOrigins,
  ]);
  if (allowedOrigins.has(originUrl)) return true;

  try {
    const parsed = new URL(originUrl);
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const allowedHosts = new Set([
      'levelup-study.vercel.app',
      'levelupstudy.vercel.app',
      'ais-pre-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app',
      'ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app',
    ]);
    if (allowedHosts.has(hostname)) return true;
    if (process.env.APP_URL && new URL(process.env.APP_URL).hostname === hostname) return true;
  } catch {
    return false;
  }
  return process.env.NODE_ENV !== 'production';
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req: IncomingMessage & { body?: any }): Promise<Record<string, any>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > 1024 * 1024) break;
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildCallbackHtml(authCode: string, authError: string, callbackPath: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Connecting Google Account...</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #09090b; color: #f4f4f5;">
  <div style="text-align: center; max-width: 400px; padding: 20px;">
    <h3 style="margin-bottom: 8px;">LevelUp Study</h3>
    <p style="color: #a1a1aa; font-size: 14px;">${authError ? 'Authentication error: ' + authError : 'Authentication successful! Closing window...'}</p>
  </div>
  <script>
    (function() {
      var callbackRedirectUri = window.location.origin + ${JSON.stringify(callbackPath)};
      var payload = {
        type: 'GOOGLE_AUTH_CALLBACK',
        code: ${JSON.stringify(authCode)},
        error: ${JSON.stringify(authError)},
        redirectUri: callbackRedirectUri
      };
      var sentToOpener = false;
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage(payload, '*');
          sentToOpener = true;
        } catch(e) {}
      }
      try {
        var bc = new BroadcastChannel('levelup_google_auth');
        bc.postMessage(payload);
        bc.close();
      } catch(e) {}
      if (sentToOpener) {
        setTimeout(function() { window.close(); }, 200);
      } else {
        var qs = ${JSON.stringify(authError)}
          ? 'google_auth_error=' + encodeURIComponent(${JSON.stringify(authError)})
          : 'google_auth_code=' + encodeURIComponent(${JSON.stringify(authCode)});
        window.location.href = '/?' + qs;
      }
    })();
  </script>
</body>
</html>`;
}

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse
) {
  try {
    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : '';
    if (originHeader) {
      if (isAllowedOrigin(originHeader)) {
        res.setHeader('Access-Control-Allow-Origin', originHeader);
      } else {
        return sendJson(res, 403, { error: 'CORS policy: Origin forbidden' });
      }
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    const host =
      (typeof req.headers['x-forwarded-host'] === 'string' && req.headers['x-forwarded-host']) ||
      req.headers.host ||
      'levelupstudy.vercel.app';
    const proto =
      (typeof req.headers['x-forwarded-proto'] === 'string' && req.headers['x-forwarded-proto']) ||
      'https';
    const parsedUrl = new URL(req.url || '/', `${proto}://${host}`);
    const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, { status: 'ok', mode: 'offline-coach' });
    }

    const oauthState = loadOAuthClients();

    if (req.method === 'GET' && pathname === '/api/auth/google/config') {
      const preferredClientId = parsedUrl.searchParams.get('clientId')?.trim() || undefined;
      const activeClient = getActiveOAuthClient(oauthState, preferredClientId);
      const rawOrigin =
        parsedUrl.searchParams.get('origin')?.trim() ||
        originHeader ||
        `${proto}://${host}`;
      const { redirectUri, offlineSupported } = resolveRedirectUriForOrigin(
        activeClient,
        oauthState.targetClientId,
        rawOrigin
      );
      return sendJson(res, 200, {
        configured: Boolean(activeClient),
        clientId: activeClient?.clientId || oauthState.targetClientId,
        redirectUri,
        offlineSupported: Boolean(activeClient && offlineSupported),
      });
    }

    if (
      req.method === 'GET' &&
      (pathname === '/api/auth/google/callback' || pathname === '/api/auth/callback')
    ) {
      const authCode = parsedUrl.searchParams.get('code') || '';
      const authError = parsedUrl.searchParams.get('error') || '';
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(buildCallbackHtml(authCode, authError, pathname));
      return;
    }

    if (req.method === 'POST' && pathname === '/api/auth/google/exchange') {
      const body = await readJsonBody(req);
      const code = typeof body.code === 'string' ? body.code : '';
      const redirectUri = typeof body.redirect_uri === 'string' && body.redirect_uri ? body.redirect_uri : 'postmessage';
      const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : undefined;

      if (!code) {
        return sendJson(res, 400, { error: 'Missing or invalid authorization code' });
      }

      const activeClient = getActiveOAuthClient(oauthState, clientId);
      if (!activeClient) {
        return sendJson(res, 500, {
          error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_SECRET in environment variables.',
        });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: activeClient.clientId,
          client_secret: activeClient.clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const tokenData: any = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        return sendJson(res, 400, {
          error: 'Failed to exchange authorization code with Google',
          details: tokenData.error_description || tokenData.error || `Google token endpoint HTTP ${tokenRes.status}`,
        });
      }

      return sendJson(res, 200, {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        id_token: tokenData.id_token || null,
        expires_in: typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 3599,
        scope: tokenData.scope,
        client_id: activeClient.clientId,
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/google/refresh') {
      const body = await readJsonBody(req);
      const refreshToken = typeof body.refresh_token === 'string' ? body.refresh_token : '';
      const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : undefined;

      if (!refreshToken) {
        return sendJson(res, 400, { error: 'Missing or invalid refresh_token' });
      }

      const activeClient = getActiveOAuthClient(oauthState, clientId);
      if (!activeClient) {
        return sendJson(res, 500, {
          error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_SECRET in environment variables.',
        });
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: activeClient.clientId,
          client_secret: activeClient.clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokenData: any = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok || !tokenData.access_token) {
        return sendJson(res, 401, {
          error: 'Failed to refresh token with Google',
          details: tokenData.error_description || tokenData.error || `Google token endpoint HTTP ${tokenRes.status}`,
        });
      }

      return sendJson(res, 200, {
        access_token: tokenData.access_token,
        expires_in: typeof tokenData.expires_in === 'number' ? tokenData.expires_in : 3599,
      });
    }

    return sendJson(res, 404, { error: 'API route not found' });
  } catch (error: any) {
    console.error('Vercel API handler error:', error);
    return sendJson(res, 500, {
      error: 'Internal server error',
      details: error?.message || String(error),
    });
  }
}
