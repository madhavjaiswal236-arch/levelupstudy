# LEVELUP STUDY: PRIVACY AUDIT & DATA INVENTORY

**System:** LevelUp Study (formerly Tracker 360)  
**Evaluator:** Privacy & Data-Governance Auditor  
**Reference Policies:** Google API Services User Data Policy (Limited Use Requirements), India DPDP Act 2023, GDPR Principles  

---

## 1. COMPREHENSIVE PERSONAL DATA INVENTORY

| Data Category | Specific Fields | Collection Purpose | Storage Location | Retention Lifecycle | Third-Party Access |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication Identity** | Name, Email address, Profile Picture URL, Firebase UID | User identification, cross-device account synchronization, avatar display | Firebase Auth, Cloud Firestore (`/users/{uid}`), `localStorage` | Retained while student account is active. | Google Firebase / Google Identity Services only. Never shared or sold. |
| **Academic Progress** | Syllabus checklist states, completed lectures, chapter mastery % | Personalized study tracking, syllabus velocity analytics | Cloud Firestore (`/users/{uid}`), `localStorage: tracker360_syllabus` | Retained until manually reset or account deleted. | Stored strictly in student's private Firestore partition. |
| **Study Sessions & Logging** | JEE session duration, questions attempted, correct answers, accuracy % | Study time tracking, question analytics, performance trends | Cloud Firestore (`/users/{uid}`), `localStorage: tracker360_history` | Retained across active study history. | Zero third-party sharing. |
| **Gamification & Rewards** | Total XP, cadet level, study streak days, rival badges | Gamified motivation, habit reinforcement | Cloud Firestore (`/users/{uid}`), `localStorage` | Retained with user profile. | Displayed only on user's own device/profile. |
| **OAuth Calendar & Tasks Tokens** | Google Calendar Bearer Token, Google Tasks Bearer Token | Optional synchronization of study blocks with personal Google Calendar | In-memory session (`sessionStorage` in Web, Capacitor `Preferences` in mobile) | Ephemeral (expires within 3,600 seconds). | Transmitted directly to `googleapis.com`. |

---

## 2. DATA MINIMIZATION & RETENTION CONTROLS

1. **No Sensitive Personal Data Collected:** The application intentionally does **NOT** collect phone numbers, physical addresses, payment cards, national IDs, or biometric data.
2. **Minimal Permissions:** Only basic identity (`email`, `profile`, `openid`) is used for authentication. Extended scopes (`calendar`, `tasks`) are strictly optional.
3. **Data Export Capability:** In [`src/lib/backlog/exportPdf.ts`](file:///c:/Users/pc/Downloads/levelup-study%20(5)/src/lib/backlog/exportPdf.ts), students can export their entire study roadmap and backlog schedule as a structured PDF document for offline use without external server rendering.
4. **Data Deletion Process:**
   - As documented in [`public/privacy.html`](file:///c:/Users/pc/Downloads/levelup-study%20(5)/public/privacy.html), students can revoke Google OAuth access at any time via Google Account Security Settings.
   - Formal data deletion requests emailed to `madhavjaiswal236@gmail.com` purge the `/users/{userId}` Firestore document and all associated subcollections within 30 days.

---

## 3. PRIVACY LEAK ANALYSIS

| Potential Leak Vector | Inspection Result | Risk Level | Remediating Control |
| :--- | :--- | :--- | :--- |
| **Sensitive Data in URLs** | Clean | **Zero** | No tokens, passwords, or personal emails are passed in URL query strings. Routing uses React Router with path-based params. |
| **Console Log Leakage** | Audited | **Low** | Debug logs in `firebase.ts` log error names, not raw tokens or sensitive passwords. |
| **Browser History / Caching** | Audited | **Low** | `vercel.json` and `firebase.json` apply `Cache-Control: no-cache` for HTML documents and immutable headers for hashed JS assets. |
| **Third-Party Telemetry** | Clean | **Zero** | Zero external ad trackers, Facebook SDKs, or commercial marketing pixels are installed in the codebase. |
