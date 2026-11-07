import rateLimit from 'express-rate-limit';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';

// Embedded Google OAuth Router for resilient serverless & Node deployment
export const googleAuthRouter = express.Router();

let defaultClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
let defaultClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

if (!defaultClientId) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.oAuthClientId) {
        defaultClientId = config.oAuthClientId;
      }
    }
  } catch (e) {
    // ignore
  }
}

googleAuthRouter.get('/config', (_req: express.Request, res: express.Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || defaultClientId;
  const hasSecret = !!(process.env.GOOGLE_CLIENT_SECRET || defaultClientSecret);
  res.json({
    configured: !!(clientId && hasSecret),
    clientId: clientId || null,
  });
});

googleAuthRouter.post('/exchange', async (req: express.Request, res: express.Response) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid authorization code' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || defaultClientId;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || defaultClientSecret;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }

    const redirectUri = redirect_uri || 'postmessage';
    const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    const { tokens } = await oauth2Client.getToken(code);

    return res.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expiry_date ? Math.max(60, Math.floor((tokens.expiry_date - Date.now()) / 1000)) : 3599,
      scope: tokens.scope,
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
    const { refresh_token } = req.body;
    if (!refresh_token || typeof refresh_token !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid refresh_token' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || defaultClientId;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || defaultClientSecret;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Google OAuth backend is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }

    const oauth2Client = new OAuth2Client(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token });

    const tokenResponse = await oauth2Client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
      return res.status(401).json({ error: 'Failed to obtain access token from Google' });
    }

    return res.json({
      access_token: token,
      expires_in: 3599,
    });
  } catch (error: any) {
    console.error('Google token refresh error:', error?.response?.data || error?.message || error);
    return res.status(401).json({
      error: 'Failed to refresh token with Google',
      details: error?.response?.data?.error_description || error?.message,
    });
  }
});

googleAuthRouter.get('/callback', (req: express.Request, res: express.Response) => {
  const authCode = req.query.code ? String(req.query.code) : '';
  const authError = req.query.error ? String(req.query.error) : '';

  const html = `<!DOCTYPE html>
<html>
<head><title>Connecting Google Calendar...</title></head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #09090b; color: #f4f4f5;">
  <div style="text-align: center; max-width: 400px; padding: 20px;">
    <h3 style="margin-bottom: 8px;">LevelUp Study</h3>
    <p style="color: #a1a1aa; font-size: 14px;">${authError ? 'Authentication error: ' + authError : 'Authentication successful! Closing window...'}</p>
  </div>
  <script>
    (function() {
      var payload = {
        type: 'GOOGLE_AUTH_CALLBACK',
        code: ${JSON.stringify(authCode)},
        error: ${JSON.stringify(authError)}
      };
      if (window.opener) {
        try {
          window.opener.postMessage(payload, '*');
        } catch(e) {}
        setTimeout(function() { window.close(); }, 300);
      } else {
        window.location.href = '/?google_auth_code=' + encodeURIComponent(${JSON.stringify(authCode)});
      }
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});


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

// Health check endpoint
app.use('/api/auth/google', googleAuthRouter);

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
