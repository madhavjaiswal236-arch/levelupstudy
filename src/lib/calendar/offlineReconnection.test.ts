import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Provide standard in-memory storage mock for Node test environment
function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

const mockLocalStorage = createStorageMock();
const mockSessionStorage = createStorageMock();

// @ts-ignore
global.localStorage = mockLocalStorage;
// @ts-ignore
global.sessionStorage = mockSessionStorage;

import {
  refreshGoogleToken,
  persistRefreshToken,
  getRefreshToken,
  invalidateOAuthToken,
} from '../firebase';

describe('Offline-to-Online OAuth 2.0 Reconnection & Silent Token Refresh', () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    await invalidateOAuthToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('Scenario 1: 1-hour limit expired while user was offline -> App silently refreshes without demanding interactive login', async () => {
    // 1. User previously authenticated and stored a persistent refresh token
    const mockRefreshToken = '1//0gMOCK_PERSISTENT_GOOGLE_REFRESH_TOKEN_JEE_STUDENT';
    await persistRefreshToken(mockRefreshToken);

    // Verify refresh token is safely persisted
    const storedToken = await getRefreshToken();
    expect(storedToken).toBe(mockRefreshToken);

    // 2. Mock backend token refresh endpoint (/api/auth/google/refresh)
    const mockNewAccessToken = 'ya29.a0AfH6SMOCK_NEW_ACCESS_TOKEN_AFTER_COMING_ONLINE';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: mockNewAccessToken,
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar',
      }),
    });
    global.fetch = fetchMock;

    // 3. User comes online after 4 hours of offline study and triggers a calendar action
    // Calling refreshGoogleToken() simulates the silent refresh check
    const refreshedToken = await refreshGoogleToken();

    // 4. Assertions:
    // - App called backend refresh endpoint
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/google/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: mockRefreshToken }),
      })
    );

    // - The new access token is returned directly to the application
    expect(refreshedToken).toBe(mockNewAccessToken);
  });

  it('Scenario 2: Concurrent requests upon coming online -> Deduplication guarantees single network call', async () => {
    const mockRefreshToken = '1//0gMOCK_PERSISTENT_REFRESH_TOKEN';
    await persistRefreshToken(mockRefreshToken);

    const mockNewAccessToken = 'ya29.CONCURRENT_TEST_TOKEN';
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      // Simulate network latency of 20ms
      await new Promise((r) => setTimeout(r, 20));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: mockNewAccessToken,
          expires_in: 3600,
        }),
      };
    });

    // 5 calendar items trying to sync at the exact same moment when device reconnects
    const results = await Promise.all([
      refreshGoogleToken(),
      refreshGoogleToken(),
      refreshGoogleToken(),
      refreshGoogleToken(),
      refreshGoogleToken(),
    ]);

    // All callers get the same valid access token
    expect(results).toEqual([
      mockNewAccessToken,
      mockNewAccessToken,
      mockNewAccessToken,
      mockNewAccessToken,
      mockNewAccessToken,
    ]);

    // Only 1 network request was made
    expect(callCount).toBe(1);
  });

  it('Scenario 3: User token revoked on Google dashboard -> invalid_grant clears storage gracefully', async () => {
    const mockRevokedToken = '1//0gMOCK_REVOKED_TOKEN';
    await persistRefreshToken(mockRevokedToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        details: 'Token has been expired or revoked.',
      }),
    });

    const result = await refreshGoogleToken();

    // Refresh should fail cleanly without crashing
    expect(result).toBeNull();

    // Revoked refresh token should be cleared from storage to prevent stale loops
    const remainingToken = await getRefreshToken();
    expect(remainingToken).toBeNull();
  });

  it('Scenario 4: Offline cold-start without access token -> hydrates refresh token and fetches new access token', async () => {
    // App was closed. Reopened after 6 hours.
    mockLocalStorage.setItem('google_refresh_token', '1//0gPERSISTED_IN_LOCALSTORAGE');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'ya29.COLD_START_FRESH_TOKEN',
        expires_in: 3600,
      }),
    });

    const token = await refreshGoogleToken();
    expect(token).toBe('ya29.COLD_START_FRESH_TOKEN');
  });
});
