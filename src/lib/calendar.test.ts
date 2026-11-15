import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./firebase', () => ({
  getAccessToken: vi.fn(async () => 'mock-access-token'),
  refreshGoogleToken: vi.fn(async () => 'mock-refreshed-token'),
  invalidateOAuthToken: vi.fn(async () => {}),
}));

import { createCalendarEventDirect } from './calendar';

describe('calendar API rate-limit & date validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects invalid start/end dates instead of falling back to new Date()', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      createCalendarEventDirect(
        'Invalid Date Event',
        new Date('invalid-date'),
        new Date('2026-12-01T11:00:00'),
        'Lecture',
        false
      )
    ).rejects.toThrow(/invalid start or end Date/i);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('retries HTTP 403 userRateLimitExceeded and returns local ISO timestamps on success', async () => {
    let callCount = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              code: 403,
              errors: [{ reason: 'userRateLimitExceeded', message: 'Rate Limit Exceeded' }],
            },
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ id: 'gcal_retry_ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const start = new Date(2026, 11, 1, 9, 0, 0);
    const end = new Date(2026, 11, 1, 11, 0, 0);
    const res = await createCalendarEventDirect('Physics — Lecture 1', start, end, 'Lecture', false);

    expect(callCount).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(res).toEqual({
      id: 'gcal_retry_ok',
      startTime: '2026-12-01T09:00:00',
      endTime: '2026-12-01T11:00:00',
    });
  });
});
