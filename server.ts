import rateLimit from 'express-rate-limit';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';

// Embedded Google OAuth Router for resilient serverless & Node deployment
export const googleAuthRouter = express.Router();

interface OAuthClientRecord {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
}

const oauthClientsMap = new Map<string, OAuthClientRecord>();
let firebaseOAuthClientId = '';

try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.oAuthClientId) {
      firebaseOAuthClientId = String(config.oAuthClientId).trim();
    }
  }
} catch (e) {
  // ignore
}

const TARGET_CLIENT_ID =
  firebaseOAuthClientId || '807015900608-gagaqm29c2ol637rvqp0a0p14ovft8po.apps.googleusercontent.com';

const KNOWN_TARGET_REDIRECT_URIS = [
  'https://ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app/api/auth/callback',
  'https://levelupstudy.vercel.app',
  'https://levelupstudy.vercel.app/__/auth/handler',
];

const registerOAuthJson = (rawJson: string): boolean => {
  const trimmed = rawJson.trim();
  if (!trimmed.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(trimmed);
    const webCfg = parsed.web || parsed.installed || parsed;
    const secret = typeof webCfg?.client_secret === 'string' ? webCfg.client_secret.trim() : '';
    const clientId = typeof webCfg?.client_id === 'string' ? webCfg.client_id.trim() : TARGET_CLIENT_ID;
    if (!secret) return false;
    const existing = oauthClientsMap.get(clientId);
    const parsedRedirects = Array.isArray(webCfg?.redirect_uris) ? webCfg.redirect_uris : [];
    oauthClientsMap.set(clientId, {
      clientId,
      clientSecret: secret,
      redirectUris: parsedRedirects.length > 0 ? parsedRedirects : (existing?.redirectUris || []),
    });
    return true;
  } catch (e) {
    return false;
  }
};

// 1. Load from local gitignored client_secret*.json files if present (e.g., AI Studio dev)
for (const dirPath of [path.resolve(process.cwd(), 'public/assets/aistudio'), process.cwd()]) {
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.startsWith('client_secret') && file.endsWith('.json')) {
          try {
            registerOAuthJson(fs.readFileSync(path.join(dirPath, file), 'utf8'));
          } catch (e) {
            // ignore malformed file
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

// 2. Load raw OAuth JSON if pasted directly into Vercel / server environment variables
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

// 3. Load plain secret / client ID environment variables (preferring TARGET_CLIENT_ID)
const envClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const rawEnvSecret = (
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.GOOGLE_OAUTH_SECRET ||
  process.env.CLIENT_SECRET ||
  ''
).trim();
const envClientSecret = rawEnvSecret.startsWith('{') ? '' : rawEnvSecret;

if (envClientSecret) {
  if (!oauthClientsMap.has(TARGET_CLIENT_ID)) {
    oauthClientsMap.set(TARGET_CLIENT_ID, {
      clientId: TARGET_CLIENT_ID,
      clientSecret: envClientSecret,
      redirectUris: KNOWN_TARGET_REDIRECT_URIS,
    });
  }
  if (envClientId && envClientId !== TARGET_CLIENT_ID && !oauthClientsMap.has(envClientId)) {
    oauthClientsMap.set(envClientId, {
      clientId: envClientId,
      clientSecret: envClientSecret,
      redirectUris: [],
    });
  }
}

function getActiveOAuthClient(preferredClientId?: string): OAuthClientRecord | null {
  if (oauthClientsMap.has(TARGET_CLIENT_ID) && (!preferredClientId || preferredClientId === TARGET_CLIENT_ID)) {
    return oauthClientsMap.get(TARGET_CLIENT_ID)!;
  }
  if (preferredClientId && oauthClientsMap.has(preferredClientId)) {
    return oauthClientsMap.get(preferredClientId)!;
  }
  if (oauthClientsMap.has(TARGET_CLIENT_ID)) {
    return oauthClientsMap.get(TARGET_CLIENT_ID)!;
  }
  if (envClientId && oauthClientsMap.has(envClientId)) {
    return oauthClientsMap.get(envClientId)!;
  }
  const first = oauthClientsMap.values().next();
  return first.done ? null : first.value;
}

function resolveRedirectUriForOrigin(client: OAuthClientRecord | null, origin: string): { redirectUri: string | null; offlineSupported: boolean } {
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
      : client.clientId === TARGET_CLIENT_ID
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

  // Env-var only deployment fallback
  try {
    const parsed = new URL(cleanOrigin);
    if (parsed.hostname === 'levelupstudy.vercel.app') {
      return { redirectUri: cleanOrigin, offlineSupported: true };
    }
  } catch (e) {
    // ignore
  }
  return { redirectUri: `${cleanOrigin}/api/auth/google/callback`, offlineSupported: true };
}

googleAuthRouter.get('/config', (req: express.Request, res: express.Response) => {
  const preferredClientId = typeof req.query.clientId === 'string' ? req.query.clientId.trim() : undefined;
  const activeClient = getActiveOAuthClient(preferredClientId);
  const rawOrigin =
    (typeof req.query.origin === 'string' && req.query.origin.trim()) ||
    req.headers.origin ||
    (req.get('host') ? `${req.protocol}://${req.get('host')}` : '');

  const { redirectUri, offlineSupported } = resolveRedirectUriForOrigin(activeClient, rawOrigin);

  res.json({
    configured: Boolean(activeClient),
    clientId: activeClient?.clientId || TARGET_CLIENT_ID,
    redirectUri,
    offlineSupported: Boolean(activeClient && offlineSupported),
  });
});

googleAuthRouter.post('/exchange', async (req: express.Request, res: express.Response) => {
  try {
    const { code, redirect_uri, client_id } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid authorization code' });
    }

    const activeClient = getActiveOAuthClient(typeof client_id === 'string' ? client_id.trim() : undefined);

    if (!activeClient) {
      return res.status(500).json({
        error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_SECRET in environment variables.',
      });
    }

    const redirectUri = redirect_uri || 'postmessage';
    const oauth2Client = new OAuth2Client(activeClient.clientId, activeClient.clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);

    return res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      id_token: tokens.id_token || null,
      expires_in: tokens.expiry_date ? Math.max(60, Math.floor((tokens.expiry_date - Date.now()) / 1000)) : 3599,
      scope: tokens.scope,
      client_id: activeClient.clientId,
    });
  } catch (error: any) {
    console.error('Google token exchange error:', error?.response?.data || error?.message || error);
    return res.status(400).json({
      error: 'Failed to exchange authorization code with Google',
      details: error?.response?.data?.error_description || error?.message,
    });
  }
});

googleAuthRouter.post('/refresh', async (req: express.Request, res: express.Response) => {
  try {
    const { refresh_token, client_id } = req.body;
    if (!refresh_token || typeof refresh_token !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid refresh_token' });
    }

    const activeClient = getActiveOAuthClient(typeof client_id === 'string' ? client_id.trim() : undefined);

    if (!activeClient) {
      return res.status(500).json({
        error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_SECRET in environment variables.',
      });
    }

    const oauth2Client = new OAuth2Client(activeClient.clientId, activeClient.clientSecret);
    oauth2Client.setCredentials({ refresh_token });

    const tokenResponse = await oauth2Client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
      return res.status(401).json({ error: 'Failed to obtain access token from Google' });
    }

    const expiryDate = oauth2Client.credentials?.expiry_date;
    const expiresIn = expiryDate ? Math.max(60, Math.floor((expiryDate - Date.now()) / 1000)) : 3599;

    return res.json({
      access_token: token,
      expires_in: expiresIn,
    });
  } catch (error: any) {
    console.error('Google token refresh error:', error?.response?.data || error?.message || error);
    return res.status(401).json({
      error: 'Failed to refresh token with Google',
      details: error?.response?.data?.error_description || error?.message,
    });
  }
});

const googleAuthCallbackHandler = (req: express.Request, res: express.Response) => {
  const authCode = req.query.code ? String(req.query.code) : '';
  const authError = req.query.error ? String(req.query.error) : '';
  const callbackPath = `${req.baseUrl || ''}${req.path || ''}`.replace(/\/+$/, '');

  const html = `<!DOCTYPE html>
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

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};

googleAuthRouter.get('/callback', googleAuthCallbackHandler);


const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware to parse requests
app.use(express.json());
    
// Add CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const configuredOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const defaultAllowedOrigins = [
    'http://localhost:3000', 
    'http://localhost:5173',
    'capacitor://localhost', 
    'http://localhost',
    'https://localhost'
  ];
  const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);

  const isAllowedOrigin = (originUrl: string) => {
    if (allowedOrigins.has(originUrl)) return true;
    try {
      const parsed = new URL(originUrl);
      const hostname = parsed.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
      // Whitelist exact trusted app domains instead of open wildcard suffix matching
      const allowedHosts = new Set([
        'levelup-study.vercel.app',
        'levelupstudy.vercel.app',
        'ais-pre-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app',
        'ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app',
      ]);
      if (allowedHosts.has(hostname)) return true;
      if (process.env.APP_URL && new URL(process.env.APP_URL).hostname === hostname) return true;
    } catch (e) {
      return false;
    }
    return process.env.NODE_ENV !== 'production';
  };

  if (origin) {
    if (isAllowedOrigin(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      return res.status(403).json({ error: 'CORS policy: Origin forbidden' });
    }
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  validate: { ip: false, xForwardedForHeader: false }
});

app.use('/api/', apiLimiter);

// Google OAuth routes (supports both /api/auth/google/callback and /api/auth/callback)
app.use('/api/auth/google', googleAuthRouter);
app.get('/api/auth/callback', googleAuthCallbackHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'offline-coach' });
});

async function startServer() {
  // Vite development middleware vs Static file server
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
