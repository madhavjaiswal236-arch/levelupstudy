/**
 * LevelUp Study - Google OAuth Offline Token Refresher
 * Standalone Cloudflare Worker (100% Free Forever)
 *
 * Handles Google OAuth token exchange and automatic silent refresh.
 * Free tier quotas: 100,000 requests/day, 0ms cold starts.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/api/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({ status: 'ok', service: 'levelup-token-refresher' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Config check
    if (url.pathname === '/api/auth/google/config' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
          clientId: env.GOOGLE_CLIENT_ID || null,
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Refresh token endpoint
    if (url.pathname === '/api/auth/google/refresh' && request.method === 'POST') {
      try {
        const body = await request.json();
        const refreshToken = body.refresh_token;

        if (!refreshToken) {
          return new Response(
            JSON.stringify({ error: 'Missing refresh_token parameter' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenRes.json();

        return new Response(JSON.stringify(tokenData), {
          status: tokenRes.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Internal worker error', details: String(err) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // Code exchange endpoint
    if (url.pathname === '/api/auth/google/exchange' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, redirect_uri } = body;

        if (!code) {
          return new Response(
            JSON.stringify({ error: 'Missing authorization code' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri || 'postmessage',
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = await tokenRes.json();

        return new Response(JSON.stringify(tokenData), {
          status: tokenRes.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Internal worker error', details: String(err) }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

