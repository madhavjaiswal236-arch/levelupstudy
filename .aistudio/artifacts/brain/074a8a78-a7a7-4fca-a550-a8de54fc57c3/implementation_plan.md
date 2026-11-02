# Study Plan Google Calendar Sync & Stale Event Elimination

Eliminates the "ghost task" bug where old deleted study sessions lingered on Google Calendar and were resurrected into newly created study plans. Also incorporates the security audit findings to maintain robust multi-tenant cloud protection.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed and are codified in this plan:

- **Confirmed Decision 1 (Old Plan Event Cleanup)**: When a new study plan is generated or an old one is replaced, all previous study sessions on Google Calendar will be automatically deleted in the background so they do not conflict with the new timetable.
- **Confirmed Decision 2 (External Calendar Clutter)**: Non-study personal events from Google Calendar will be hidden from the study plan view to keep the student's study schedule distraction-free and focused purely on their active JEE curriculum.

---

## 1. Overview & Core Concept

- **What It Does**: 
  1. Ensures that creating or regenerating a study plan in Backlog HQ completely purges outdated study blocks from Google Calendar.
  2. Stops the calendar background sync from treating old deleted sessions as new external tasks and injecting them back into the active study roadmap.
  3. Preserves all security audit hardening (Firestore security rules, strict tenant isolation, and secure hosting headers).
- **Target Persona**: High-performance students preparing for JEE/NEET who need a clean, reliable, single-source-of-truth timetable without duplicate or resurrected study tasks.
- **Key Value**: Guaranteed consistency between the in-app Tracker 360 roadmap and Google Calendar, with zero ghost tasks.

---

## 2. In Simple Words: What Effects This Will Have on the App

1. **Clean Slate on New Study Plans**: When you click "Create Plan" or customize your roadmap, your study calendar will only contain the tasks for your *new* plan. Old sessions from previous plans are safely cleaned up from Google Calendar instead of stacking up.
2. **No More Ghost Tasks**: Deleting a task or restarting your roadmap means it stays gone. The app will never read old events back from Google Calendar to resurrect deleted items.
3. **Pure Study Focus**: Non-study personal events on your Google Calendar will no longer clutter your study plan view, keeping your daily dashboard focused 100% on lectures, DPPs, and revision blocks.
4. **Faster Calendar Syncing**: By only syncing and tracking active study items, calendar loading and background synchronization will be noticeably snappier and use less network data.

---

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ Backlog HQ / Plan Generator                                  │
│  - User triggers "Quick Create" or "Apply New Plan"         │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1. Collects old tasks with calendarEventId
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Calendar Cleanup Pipeline (src/lib/calendar.ts)             │
│  - batchDeleteCalendarEvents(staleEventIds)                 │
│  - Sends DELETE to Google Calendar API                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ 2. Deletes from Google Calendar
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ State Synchronization (src/context/AppContext.tsx)          │
│  - Purges old backlog todos from state & cloud               │
│  - Injects fresh roadmap todos with clean IDs               │
└──────────────────────────────┬──────────────────────────────┘
                               │ 3. Restricts sync to active todos only
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ StudyCalendar (src/components/StudyCalendar.tsx)            │
│  - Ignores orphaned/external non-study Google events        │
│  - Only renders events belonging to active todos            │
└─────────────────────────────────────────────────────────────┘
```

### Proposed Changes

#### A. Calendar Cleanup Service (`src/lib/calendar.ts`)
- Add `batchDeleteCalendarEvents(eventIds: string[])`:
  - Iterates through event IDs of stale tasks and sends `DELETE /calendar/v3/calendars/primary/events/{id}` with exponential backoff.
  - Ignores local IDs (`local-*`) and silently handles already-deleted events (`404` or `410 Gone`).

#### B. Plan Replacement Hook (`src/pages/BacklogHQ.tsx`)
- In `handleQuickCreatePlan` and plan generation:
  - Identify previous backlog tasks in `todos` that have valid `calendarEventId`s.
  - Call the cleanup service in the background to purge them from Google Calendar.
  - Replace `todos` with the new roadmap items and persist to cloud.

#### C. Study Calendar Ingestion Filter (`src/components/StudyCalendar.tsx`)
- In `scheduledEvents` and the background sync effect:
  - Remove the legacy behavior of converting untracked Google events (`isExternalGoogleEvent`) into study plan tasks.
  - Strictly limit displayed events to active items present in `todos`.
  - Prevent untracked calendar entries from re-entering the `todos` state.

#### D. Security Audit Alignment & Verification
- Ensure `firebase.json` preserves `"firestore": { "rules": "firestore.rules" }` and security headers.
- Maintain `firestore.rules` constraints (`request.auth.uid == userId`, key count $\le 150$, XP delta $\le 50,000$).

---

## 4. Verification Plan

1. **Old Plan Cleanup Test**:
   - Schedule tasks on Google Calendar with an initial plan.
   - Create a new study plan in Backlog HQ.
   - Verify that the old events are deleted from Google Calendar and the new plan's events take their place.
2. **Ghost Task Resurrection Test**:
   - Delete a study task in the app.
   - Trigger calendar background sync or refresh the page.
   - Verify the deleted task does NOT reappear in the calendar or todo list.
3. **Build & Type Checking**:
   - Run `npm run lint` (`tsc --noEmit`) to verify 0 compiler errors.
   - Run `npm run build` to ensure production compilation succeeds.
