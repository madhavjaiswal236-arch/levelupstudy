import sys

with open('src/lib/calendar.ts', 'r') as f:
    content = f.read()

start_idx = content.find("export async function createCalendarEvent")
end_idx = content.find("export async function checkCalendarConflicts")

new_func = """export async function createCalendarEvent(title: string, durationMinutes: number = 105, type: string = 'Lecture', isRetry = false, todos: any[] = [], specificStartTime?: Date, specificEndTime?: Date) {
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
    if (latestEndTime > new Date()) {
      startTime.setMinutes(startTime.getMinutes() + 10);
    }
    
    const hours = startTime.getHours();
    if (hours >= 22) {
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(9, 0, 0, 0);
    } else if (hours < 9) {
      startTime.setHours(9, 0, 0, 0);
    }
    
    let finalDuration = durationMinutes;
    if (finalDuration < 105 && (type === 'Lecture' || type === 'Notes' || type === 'Practice' || type === 'Custom' || type === 'Revision' || type === 'PYQs' || type === 'DPP')) {
      finalDuration = 105;
    }
    
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
    const res = await fetchGoogleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', 'POST', event, isRetry);
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

"""

content = content[:start_idx] + new_func + content[end_idx:]

with open('src/lib/calendar.ts', 'w') as f:
    f.write(content)
