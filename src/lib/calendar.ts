import { getAccessToken, refreshGoogleToken } from './firebase';

/**
 * Fetch wrapper for Google APIs with full Exponential Backoff and Jitter.
 * Gracefully handles transient network failures (TypeError), rate limiting (429),
 * server errors (500, 502, 503, 504), and 401 token refreshes.
 */
async function fetchGoogleApi(
  url: string,
  method: string = 'GET',
  body?: any,
  maxRetries: number = 3,
  initialDelayMs: number = 500
): Promise<Response> {
  let token = await getAccessToken();
  if (!token) throw new Error('No Google Access Token found.');

  let hasRefreshedToken = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
      let res = await fetch(url, fetchOptions);

      // Handle 401 Unauthorized with token refresh (once)
      if (res.status === 401 && !hasRefreshedToken) {
        hasRefreshedToken = true;
        console.log("Google API 401 token expired, attempting refresh...");
        const newToken = await refreshGoogleToken();
        if (newToken) {
          token = newToken;
          // Retry immediately with the refreshed token
          continue;
        }
      }

      // Check for transient server errors (429 Too Many Requests, 500, 502, 503, 504)
      const isTransientError = [429, 500, 502, 503, 504].includes(res.status);

      if (isTransientError && attempt < maxRetries) {
        const backoffMs = initialDelayMs * Math.pow(2, attempt);
        const jitterMs = Math.floor(Math.random() * 250);
        const totalDelay = backoffMs + jitterMs;

        console.warn(
          `Google API transient error HTTP ${res.status} for ${url}. Retrying with exponential backoff in ${totalDelay}ms (Attempt ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
        continue;
      }

      return res;
    } catch (err) {
      // Catch network-level exceptions (e.g. lost connection / DNS failure)
      if (attempt < maxRetries) {
        const backoffMs = initialDelayMs * Math.pow(2, attempt);
        const jitterMs = Math.floor(Math.random() * 250);
        const totalDelay = backoffMs + jitterMs;

        console.warn(
          `Network error during Google API request to ${url}: ${err instanceof Error ? err.message : String(err)}. Retrying with exponential backoff in ${totalDelay}ms (Attempt ${attempt + 1}/${maxRetries})...`
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
  let token = await getAccessToken();
  
  let startTime = specificStartTime;
  let endTime = specificEndTime;

  if (!startTime || !endTime) {
    let latestEndTime = new Date();
    const now = new Date();
    for (const t of todos) {
      if (t.endTime && !t.completed) {
        const dt = new Date(t.endTime);
        if (dt > latestEndTime && dt.getTime() < now.getTime() + 3 * 24 * 60 * 60 * 1000) {
          latestEndTime = dt;
        }
      }
    }
    startTime = new Date(latestEndTime);
    startTime.setMinutes(startTime.getMinutes() + 10);
    
    let finalDuration = durationMinutes;
    endTime = new Date(startTime.getTime() + finalDuration * 60000);
  }

  const hasConflict = await checkCalendarConflicts(startTime, endTime);

  if (!token) {
    console.log("No token available for calendar, creating local event");
    return {
      id: 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      hasConflict: hasConflict,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
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
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
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
    // Check if an event with the exact same title and time range already exists in primary calendar
    try {
      const windowStart = new Date(startTime.getTime() - 5 * 60 * 1000);
      const windowEnd = new Date(endTime.getTime() + 5 * 60 * 1000);
      const existingEvents = await fetchGoogleCalendarEvents(windowStart, windowEnd);
      const duplicate = existingEvents.find((e: any) => {
        if (!e.start?.dateTime) return false;
        const eStart = new Date(e.start.dateTime).getTime();
        const diffMs = Math.abs(eStart - startTime.getTime());
        return (
          e.summary?.trim().toLowerCase() === title.trim().toLowerCase() &&
          diffMs <= 3 * 60 * 1000
        );
      });
      if (duplicate && duplicate.id) {
        console.log("Reusing existing Google Calendar event to prevent duplicates:", duplicate.id);
        return { ...duplicate, hasConflict, startTime: startTime.toISOString(), endTime: endTime.toISOString() };
      }
    } catch (checkErr) {
      console.warn("Could not pre-check calendar duplicates, proceeding with creation:", checkErr);
    }

    const res = await fetchGoogleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', 'POST', event);
    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 401) {
        sessionStorage.removeItem('google_access_token');
        throw new Error('Google Calendar access token expired.');
      }
      throw new Error(`Google Calendar API error: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    return { ...data, hasConflict, startTime: startTime.toISOString(), endTime: endTime.toISOString() };
  } catch (err) {
    console.error('Failed to create Calendar event:', err);
    throw err;
  }
}

export async function checkCalendarConflicts(startTime: Date, endTime: Date): Promise<boolean> {
 let token = await getAccessToken();
 if (!token) return false;

 try {
 const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(startTime.toISOString())}&timeMax=${encodeURIComponent(endTime.toISOString())}&singleEvents=true`;
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
 let token = await getAccessToken();
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

export async function deleteCalendarEvent(eventId: string) {
 if (!eventId) return false;
 let token = await getAccessToken();
 if (!token) return false;

 try {
 const res = await fetchGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, 'DELETE');

 if (!res.ok && res.status !== 410) { // 410 Gone is fine, it means already deleted
 if (res.status === 401) {
 sessionStorage.removeItem('google_access_token');
 }
 return false;
 }
 
 return true;
 } catch (err) {
 console.error('Failed to delete Calendar event:', err);
 return false;
 }
}

export async function rescheduleCalendarEvents(eventsToReschedule: { eventId: string, startTime: Date, endTime: Date }[]) {

 let token = await getAccessToken();
 if (!token) return false;

 try {
 for (const evt of eventsToReschedule) {
 if (!evt.eventId) continue;

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

 if (!res.ok && res.status === 401) {
 sessionStorage.removeItem('google_access_token');
 throw new Error('Google Calendar access token expired.');
 }
 }
 return true;
 } catch (err) {
 console.error('Failed to reschedule Calendar events:', err);
 return false;
 }
}

export async function createGoogleTask(title: string, dueDate?: Date, _isRetry = false): Promise<any> {
 let token = await getAccessToken();
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
 let token = await getAccessToken();
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
 let token = await getAccessToken();
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
  let token = await getAccessToken();
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
 let token = await getAccessToken();
 if (!token) return [];
 try {
   const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin.toISOString())}&timeMax=${encodeURIComponent(timeMax.toISOString())}&singleEvents=true&maxResults=250`;
   const res = await fetchGoogleApi(url, 'GET');
   if (!res.ok) return [];
   const data = await res.json();
   return data.items || [];
 } catch(err) {
   return [];
 }
}
