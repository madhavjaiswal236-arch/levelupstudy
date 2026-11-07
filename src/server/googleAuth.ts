import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const router = Router();

// Load client ID from environment or fallback firebase-applet-config.json
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

/**
 * GET /api/auth/google/config
 * Returns OAuth status and public client ID for frontend flow initialization
 */
router.get('/config', (_req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || defaultClientId;
  const hasSecret = !!(process.env.GOOGLE_CLIENT_SECRET || defaultClientSecret);
  res.json({
    configured: !!(clientId && hasSecret),
    clientId: clientId || null,
  });
});

/**
 * POST /api/auth/google/exchange
 * Exchanges an authorization code (obtained via offline consent flow) for
 * an access_token AND a long-lived refresh_token.
 */
router.post('/exchange', async (req: Request, res: Response) => {
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

/**
 * POST /api/auth/google/refresh
 * Refreshes an expired access_token silently in the background using the stored refresh_token.
 * Does not require any user gesture or re-authentication prompt.
 */
router.post('/refresh', async (req: Request, res: Response) => {
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


/**
 * GET /api/auth/google/callback
 * Browser popup callback receiver that returns the authorization code
 * to the opener window via postMessage.
 */
router.get('/callback', (req: Request, res: Response) => {
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

export default router;
