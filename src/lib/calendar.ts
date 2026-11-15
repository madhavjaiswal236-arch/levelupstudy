import { getAccessToken, refreshGoogleToken, invalidateOAuthToken } from './firebase';
import { getActiveStudyBlock, calculateNextAvailableStudySlot, formatLocalISO } from './studyBlock';

/**
 * Retrieves a valid Google Access Token, attempting background offline refresh
 * if the in-memory token has expired.
 */
async function getValidToken(): Promise<string | null> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshGoogleToken();
  }
  return token;
}

// Serialized pacing gate for Google Calendar write operations (POST/PATCH/DELETE)
// Prevents burst 403 rateLimitExceeded / 429 failures when syncing 5..100+ tasks.
let lastWriteDispatchAt = 0;
let writeGatePromise: Promise<void> = Promise.resolve();
const MIN_WRITE_GAP_MS = 180;

function acquireWriteSlot(): Promise<void> {
  const next = writeGatePromise.then(async () => {
    const now = Date.now();
    const waitMs = Math.max(0, lastWriteDispatchAt + MIN_WRITE_GAP_MS - now);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    lastWriteDispatchAt = Date.now();
  });
  writeGatePromise = next.catch(() => {});
  return next;
}

async function isRateLimitOrTransientResponse(res: Response): Promise<boolean> {
  if ([429, 500, 502, 503, 504].includes(res.status)) return true;
  if (res.status === 403) {
    try {
      const bodyText = await res.clone().text();
      if (!bodyText) return true;
      return /rateLimitExceeded|userRateLimitExceeded|quotaExceeded|too many requests|limit exceeded/i.test(bodyText);
    } catch {
      return false;
    }
  }
  return false;
}

function getRetryDelayMs(res: Response | null, attempt: number, initialDelayMs: number): number {
  if (res) {
    const retryAfter = res.headers?.get?.('Retry-After');
    if (retryAfter) {
      const parsedSec = Number(retryAfter);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        return Math.min(20000, parsedSec * 1000) + Math.floor(Math.random() * 300);
      }
    }
  }
  const exponential = Math.min(16000, initialDelayMs * Math.pow(2, attempt));
  const jitter = Math.floor(Math.random() * 350);
  return exponential + jitter;
}

/**
 * Fetch wrapper for Google APIs with write-burst pacing, full Exponential Backoff + Jitter,
 * Retry-After support, HTTP 403 userRateLimitExceeded handling, and 401 token refreshes.
 */
async function fetchGoogleApi(
  url: string,
  method: string = 'GET',
  body?: any,
  maxRetries: number = 5,
  initialDelayMs: number = 800
): Promise<Response> {
  let token = await getValidToken();
  if (!token) throw new Error('No Google Access Token found.');

  let hasRefreshedToken = false;
  const isWriteMethod = method.toUpperCase() !== 'GET';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (isWriteMethod) {
      await acquireWriteSlot();
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    try {
      const res = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized with token refresh (once)
      if (res.status === 401 && !hasRefreshedToken) {
        hasRefreshedToken = true;
        console.log("Google API 401 token expired, attempting refresh...");
        const newToken = await refreshGoogleToken();
        if (newToken) {
          token = newToken;
          continue;
        } else {
          await invalidateOAuthToken();
        }
      }

      const shouldRetry = await isRateLimitOrTransientResponse(res);
      if (shouldRetry && attempt < maxRetries) {
        const totalDelay = getRetryDelayMs(res, attempt, initialDelayMs);
        console.warn(
          `Google API rate-limit/transient HTTP ${res.status} for ${url}. Retrying in ${totalDelay}ms (Attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt < maxRetries) {
        const totalDelay = getRetryDelayMs(null, attempt, initialDelayMs);
        console.warn(
          `Network error during Google API request to ${url}: ${err instanceof Error ? err.message : String(err)}. Retrying in ${totalDelay}ms (Attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Google API request failed after ${maxRetries} exponential backoff attempts.`);
}

export async function createCalendarEvent(title: string, durationMinutes: number = 105, type: string = 'Lecture', isRetry = false, todos: any[] = [], specificStartTime?: Date, specificEndTime?: Date) {
  let token = await getValidToken();
  
  let startTime = specificStartTime;
  let endTime = specificEndTime;

  if (specificStartTime !== undefined && (!specificStartTime || isNaN(specificStartTime.getTime()))) {
    throw new Error('Cannot create Google Calendar event: explicit startTime is invalid.');
  }
  if (specificEndTime !== undefined && (!specificEndTime || isNaN(specificEndTime.getTime()))) {
    throw new Error('Cannot create Google Calendar event: explicit endTime is invalid.');
  }

  if (!startTime || !endTime) {
    const block = getActiveStudyBlock();
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
    const slot = calculateNextAvailableStudySlot(
      todayStr,
      durationMinutes,
      todos,
      block.start,
      block.end
    );
    startTime = new Date(slot.startTime);
    endTime = new Date(slot.endTime);
  }

  const safeStart = startTime;
  let safeEnd = endTime;
  if (safeEnd.getTime() <= safeStart.getTime()) {
    safeEnd = new Date(safeStart.getTime() + Math.max(30, durationMinutes) * 60 * 1000);
  }

  const hasConflict = await checkCalendarConflicts(safeStart, safeEnd);

  if (!token) {
    console.log("No token available for calendar, creating local event");
    return {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      hasConflict: hasConflict,
      startTime: formatLocalISO(safeStart),
      endTime: formatLocalISO(safeEnd)
    };
  }

  let colorId = '1';
  if (title.toLowerCase().includes('backlog')) {
    colorId = '11';
  } else if (type === 'Practice' || type === 'Custom') {
    colorId = '9';
  } else if (type === 'Lecture') {
    colorId = '11';
  } else if (type === 'Chapter Test') {
    colorId = '6';
  }

  const event = {
    summary: title,
    colorId: colorId,
    start: {
      dateTime: safeStart.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: safeEnd.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 5 },
      ],
    },
  };

  try {
    // Check if an event with the matching title and time range already exists in primary calendar
    try {
      const windowStart = new Date(safeStart.getTime() - 25 * 60 * 1000);
      const windowEnd = new Date(safeEnd.getTime() + 25 * 60 * 1000);
      const existingEvents = await fetchGoogleCalendarEvents(windowStart, windowEnd);
      const normTitle = title.trim().toLowerCase().replace(/^\[done\]\s*/i, "");
      const duplicate = existingEvents.find((e: any) => {
        if (!e.start?.dateTime) return false;
        const eSummaryNorm = (e.summary || "").trim().toLowerCase().replace(/^\[done\]\s*/i, "");
        const eStart = new Date(e.start.dateTime).getTime();
        const diffMs = Math.abs(eStart - safeStart.getTime());
        return (
          (eSummaryNorm === normTitle || eSummaryNorm.includes(normTitle) || normTitle.includes(eSummaryNorm)) &&
          diffMs <= 20 * 60 * 1000
        );
      });
      if (duplicate && duplicate.id) {
        console.log("Reusing existing Google Calendar event to prevent duplicates:", duplicate.id);
        await updateCalendarEventTime(duplicate.id, safeStart, safeEnd, title, colorId);
        return { ...duplicate, hasConflict, startTime: formatLocalISO(safeStart), endTime: formatLocalISO(safeEnd) };
      }
    } catch (checkErr) {
      console.warn("Could not pre-check calendar duplicates, proceeding with creation:", checkErr);
    }

    const res = await fetchGoogleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', 'POST', event);
    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 401) {
        await invalidateOAuthToken();
        throw new Error('Google Calendar access token expired.');
      }
      throw new Error(`Google Calendar API error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    return { ...data, hasConflict, startTime: formatLocalISO(safeStart), endTime: formatLocalISO(safeEnd) };
  } catch (err) {
    console.error('Failed to create Calendar event:', err);
    throw err;
  }
}

export async function createCalendarEventDirect(
  title: string,
  startTime: Date,
  endTime: Date,
  type: string = 'Lecture',
  isCompleted: boolean = false
): Promise<{ id: string; startTime: string; endTime: string } | null> {
  const token = await getValidToken();
  if (!token) return null;

  if (!startTime || isNaN(startTime.getTime()) || !endTime || isNaN(endTime.getTime())) {
    throw new Error(`Cannot create Google Calendar event "${title}": invalid start or end Date.`);
  }

  const safeStart = startTime;
  let safeEnd = endTime;
  if (safeEnd.getTime() <= safeStart.getTime()) {
    safeEnd = new Date(safeStart.getTime() + 60 * 60 * 1000);
  }

  let colorId = '1';
  if (isCompleted) {
    colorId = '10'; // basil/green
  } else if (title.toLowerCase().includes('backlog')) {
    colorId = '11';
  } else if (type === 'Practice' || type === 'Custom') {
    colorId = '9';
  } else if (type === 'Lecture') {
    colorId = '11';
  } else if (type === 'Chapter Test' || type === 'Test') {
    colorId = '6';
  }

  const cleanTitle = title.replace(/^\[Done\]\s*/i, '');
  const summary = isCompleted ? `[Done] ${cleanTitle}` : cleanTitle;

  const event = {
    summary,
    colorId,
    start: {
      dateTime: safeStart.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: safeEnd.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 10 },
        { method: 'popup', minutes: 5 },
      ],
    },
  };

  const res = await fetchGoogleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', 'POST', event);
  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 401) {
      await invalidateOAuthToken();
      throw new Error('Google Calendar access token expired.');
    }
    throw new Error(`Google Calendar API error: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    startTime: formatLocalISO(safeStart),
    endTime: formatLocalISO(safeEnd),
  };
}

export async function checkCalendarConflicts(startTime: Date, endTime: Date): Promise<boolean> {
  let token = await getValidToken();
  if (!token) return false;

  const validStart = startTime && !isNaN(startTime.getTime()) ? startTime : new Date();
  const validEnd = endTime && !isNaN(endTime.getTime()) && endTime.getTime() > validStart.getTime()
    ? endTime
    : new Date(validStart.getTime() + 60 * 60 * 1000);

  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(validStart.toISOString())}&timeMax=${encodeURIComponent(validEnd.toISOString())}&singleEvents=true`;
    const res = await fetchGoogleApi(url, 'GET');

 if (!res.ok) return false;
 
 const data = await res.json();
 return data.items && data.items.length > 0;
 } catch (err) {
 console.error('Failed to check calendar conflicts:', err);
 return false;
 }
}

export async function markCalendarEventCompleted(eventId: string, isCompleted: boolean, title: string): Promise<boolean> {
 if (!eventId) return false;
 let token = await getValidToken();
 if (!token) return false;

 try {
 const updatedTitle = isCompleted ? `[Done] ${title}` : title.replace(/^\[Done\]\s*/, '');
 const res = await fetchGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, 'PATCH', { summary: updatedTitle, ...(isCompleted ? { colorId: '10' } : {}) }); // 10 is basil/green
 
 return res.ok;
 } catch (err) {
 console.error('Failed to mark calendar event completed:', err);
 return false;
 }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  if (!eventId || eventId.startsWith('local-')) return false;
  let token = await getValidToken();
  if (!token) return false;

  try {
    const res = await fetchGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, 'DELETE');

    if (!res.ok && res.status !== 410 && res.status !== 404) {
      if (res.status === 401) {
        await invalidateOAuthToken();
      }
      return false;
    }
    
    return true;
  } catch (err) {
    console.warn('Failed to delete Calendar event:', eventId, err);
    return false;
  }
}

export async function batchDeleteCalendarEvents(eventIds: (string | undefined | null)[]): Promise<number> {
  const validIds = Array.from(new Set(eventIds.filter((id): id is string => Boolean(id && !id.startsWith('local-')))));
  if (validIds.length === 0) return 0;

  let token = await getValidToken();
  if (!token) return 0;

  let deletedCount = 0;
  const failedIds: string[] = [];
  const concurrency = 2;

  for (let i = 0; i < validIds.length; i += concurrency) {
    const chunk = validIds.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map((id) => deleteCalendarEvent(id)));
    results.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        deletedCount++;
      } else {
        failedIds.push(chunk[idx]);
      }
    });
    if (i + concurrency < validIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Sequential retry pass for any rate-limited deletes
  if (failedIds.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    for (const id of failedIds) {
      const ok = await deleteCalendarEvent(id);
      if (ok) deletedCount++;
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
  }

  return deletedCount;
}

export async function rescheduleCalendarEvents(eventsToReschedule: { eventId: string, startTime: Date, endTime: Date }[]) {
  let token = await getValidToken();
  if (!token) return false;

  let allOk = true;
  try {
    for (const evt of eventsToReschedule) {
      if (!evt.eventId || evt.eventId.startsWith('local-')) continue;
      if (!evt.startTime || isNaN(evt.startTime.getTime()) || !evt.endTime || isNaN(evt.endTime.getTime())) {
        allOk = false;
        continue;
      }

      const patchBody = {
        start: {
          dateTime: evt.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: evt.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      };

      const res = await fetchGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${evt.eventId}`, 'PATCH', patchBody);

      if (!res.ok) {
        if (res.status === 401) {
          await invalidateOAuthToken();
          throw new Error('Google Calendar access token expired.');
        }
        allOk = false;
      }
    }
    return allOk;
  } catch (err) {
    console.error('Failed to reschedule Calendar events:', err);
    return false;
  }
}

export async function createGoogleTask(title: string, dueDate?: Date, _isRetry = false): Promise<any> {
 let token = await getValidToken();
 if (!token) return null;
 
 const taskBody: any = {
 title: title,
 status: "needsAction"
 };
 if (dueDate) {
 taskBody.due = dueDate.toISOString();
 }

 try {
 const res = await fetchGoogleApi('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', 'POST', taskBody);

 if (!res.ok) {
 const errorText = await res.text();
 console.error('Google Tasks API error:', res.status, errorText);
 throw new Error(`Google Tasks API error: ${res.status}`);
 }
 return await res.json();
 } catch (err) {
 console.error('Failed to create Google Task:', err);
 throw err;
 }
}

export async function updateGoogleTaskStatus(taskId: string, status: 'completed' | 'needsAction', _isRetry = false): Promise<boolean> {
 if (!taskId) return false;
 let token = await getValidToken();
 if (!token) return false;

 try {
 const res = await fetchGoogleApi(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, 'PATCH', { id: taskId, status });

 if (!res.ok) {
 const errorText = await res.text();
 console.error('Failed to update Google Task API Error:', res.status, errorText);
 }
 return res.ok;
 } catch (err) {
 console.error('Failed to update Google Task:', err);
 return false;
 }
}

export async function deleteGoogleTask(taskId: string, _isRetry = false): Promise<boolean> {
 if (!taskId) return false;
 let token = await getValidToken();
 if (!token) return false;

 try {
 const res = await fetchGoogleApi(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, 'DELETE');

 return res.ok || res.status === 410; // 410 means already deleted
 } catch (err) {
 console.error('Failed to delete Google Task:', err);
 return false;
 }
}


export async function updateCalendarEventTime(eventId: string, startTime?: Date, endTime?: Date, summary?: string, colorId?: string): Promise<boolean> {
  if (!eventId || eventId.startsWith('local-')) return true;
  let token = await getValidToken();
  if (!token) return false;

  const patchBody: any = {};
  if (startTime) patchBody.start = { dateTime: startTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (endTime) patchBody.end = { dateTime: endTime.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  if (summary) patchBody.summary = summary;
  if (colorId) patchBody.colorId = colorId;

  try {
    const res = await fetchGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, 'PATCH', patchBody);
    return res.ok;
  } catch (error) {
    console.warn("Could not update Google Calendar event time:", error);
    return false;
  }
}

export async function fetchGoogleCalendarEvents(timeMin: Date, timeMax: Date): Promise<any[]> {
  let token = await getValidToken();
  if (!token) return [];
  try {
    const allItems: any[] = [];
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 10;

    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&maxResults=2500${pageParam}`;
      const res = await fetchGoogleApi(url, 'GET');
      if (!res.ok) break;
      const data = await res.json();
      if (Array.isArray(data.items)) {
        allItems.push(...data.items);
      }
      pageToken = data.nextPageToken;
      pageCount++;
    } while (pageToken && pageCount < MAX_PAGES);

    return allItems;
  } catch (err) {
    return [];
  }
}
