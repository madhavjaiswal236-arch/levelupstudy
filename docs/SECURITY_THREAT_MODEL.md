# LEVELUP STUDY: FORMAL SECURITY ARCHITECTURE & THREAT MODEL

**Target System:** LevelUp Study (formerly Tracker 360)  
**Version:** 1.0.0 (Web, Express API, Capacitor Android)  
**Evaluator:** Principal Security Architect & Threat Modeling Specialist  
**Standard References:** OWASP Top 10:2025, OWASP ASVS v5.0.0, OWASP MASVS v2.0.0, STRIDE Framework  

---

## 1. ASSET CLASSIFICATION & INVENTORY

The application processes and stores the following critical assets:

| Asset | Classification | Storage Location | Integrity & Confidentiality Requirements |
| :--- | :--- | :--- | :--- |
| **Authentication Identity & Tokens** | **Confidential** | Firebase Auth / Google OAuth (`sessionStorage` in Web, `Preferences` in Capacitor Android) | High: Impersonation allows full takeover of study records and Google API delegations. |
| **User Study History & Notes** | **Private User Data** | Cloud Firestore (`/users/{userId}`) & `localStorage` (`tracker360_history`) | Medium: Contains student schedule patterns, study weaknesses, and private notes. |
| **Task Records & Backlog Plans** | **Private User Data** | Cloud Firestore (`/users/{userId}/todos`) & `localStorage` | High: Academic task integrity; tampering corrupts study roadmap. |
| **XP & Leaderboard Progress** | **System Integrity** | Cloud Firestore (`/users/{userId}`) | High: Must be tamper-resistant to prevent unearned achievement inflation and rivalry cheating. |
| **Syllabus & Chapter Mastery** | **System Integrity** | Cloud Firestore (`/users/{userId}`) | High: Deterministic calculation of student syllabus coverage and retention. |
| **Google Calendar & Tasks Tokens** | **Confidential Token** | Short-lived OAuth Bearer token in memory & `sessionStorage` | High: Scope grants create/read access to personal Google Calendar and Tasks. |
| **Firebase Configuration** | **Public Identifier** | `firebase-applet-config.json`, client bundle | Low: Client API keys identify project; defense relies on server-side rules. |

---

## 2. SYSTEM TRUST BOUNDARIES

```
[ UNTRUSTED USER AGENT / CLIENT ]
┌────────────────────────────────────────────────────────────────────────┐
│ BROWSER / CAPACITOR WEBVIEW                                            │
│  - React 19 UI & Form Inputs                                          │
│  - LocalStorage / IndexedDB / Memory Cache                             │
│  - Capacitor Native Bridge                                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  [ Trust Boundary 1: Client to Network (HTTPS/TLS) ]
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ BACKEND SERVICES & CLOUD PROVIDERS                                     │
│                                                                        │
│  ┌──────────────────────────────┐     ┌─────────────────────────────┐  │
│  │ Express Node.js Server       │     │ Firebase Cloud Firestore    │  │
│  │ (server.ts / /api/health)    │     │ (Security Rules Enforcement)│  │
│  │ Rate limiting & CORS policy  │     │ Per-user UID isolation      │  │
│  └──────────────────────────────┘     └─────────────────────────────┘  │
│                                   │  [ Trust Boundary 2: Cloud Firestore Rules ]
│  ┌──────────────────────────────┐ │   ┌─────────────────────────────┐  │
│  │ Firebase Authentication      │ │   │ Google Calendar / Tasks API │  │
│  │ Google OAuth 2.0 / ID Tokens │◄┘   │ User Delegated Scopes       │  │
│  └──────────────────────────────┘     └─────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Trust Boundary Analysis:
1. **Trust Boundary 1 (Client vs Cloud):** Everything running in the user's browser or mobile device (React state, `AppContext`, `reconciliation.ts`) is considered **untrusted**. A client can be modified, requests can be intercepted via proxy (Burp Suite/mitmproxy), and state can be forged. All security guarantees must be enforced by Cloud Firestore Security Rules and backend validation.
2. **Trust Boundary 2 (Cross-User Isolation):** User A must be completely partitioned from User B. In Firestore, `/users/{userId}` is strictly isolated using `request.auth.uid == userId`. No user may read, update, or list documents of another student.
3. **Trust Boundary 3 (Third-Party OAuth Delegation):** Access to Google Calendar and Google Tasks is authorized via Google OAuth 2.0. The application acts as a delegated client and must never leak or persist refresh credentials on unencrypted media.

---

## 3. STRIDE THREAT MODELING MATRIX

| STRIDE Category | Threat Scenario | Impact | Likelihood | Mitigating Control & Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker spoofs another student's UID to read their study history. | **High** | Low | **Mitigated:** Firestore rules mandate `request.auth.uid == userId`. Forged UIDs without matching Firebase ID Token are rejected with `PERMISSION_DENIED`. |
| **Tampering** | Student tampers with network payload to award 1,000,000 XP in a single request. | **High** | Medium | **Mitigated:** `firestore.rules` enforces delta limits: `request.resource.data.xp - resource.data.xp <= 50000` and absolute ceiling `<= 10000000`. |
| **Repudiation** | User claims tasks were deleted by a bug rather than deliberate action. | **Low** | Medium | **Partially Mitigated:** Task completion writes timestamped `completedAt` and `taskContract.ts` records idempotency keys. Audit logging in cloud is limited by Spark plan. |
| **Information Disclosure** | Sensitive data or OAuth tokens leaked via HTTP, unencrypted storage, or open directories. | **High** | Medium | **Mitigated:** Enforced HSTS (`max-age=63072000`), cleartext traffic disabled in Android (`network_security_config.xml`), and `android:allowBackup="false"`. |
| **Denial of Service** | Malicious client floods server with write requests or floods `/users/{uid}` with huge documents. | **High** | High | **Mitigated:** Key size limited to `<= 150` in Firestore rules. Express server rate-limited via `express-rate-limit` (100 req/15 min). Monolithic sync debounced. |
| **Elevation of Privilege** | Normal student modifies their document to inject an `admin: true` or role field. | **Critical** | Low | **Mitigated:** Schema checks in `firestore.rules` reject unauthorized keys; administrative endpoints do not exist on the client surface. |

---

## 4. RESIDUAL RISKS & ARCHITECTURAL GAPS

1. **Client-Controlled Logic for Study Sessions:** While Firestore rules bound XP deltas to $\le 50,000$, an adversarial client can still script rapid valid updates within the allowed threshold. Full serverless validation (e.g. Cloud Functions for XP ledger writes) requires upgrading beyond the free Spark plan.
2. **Rooted Android Device Token Access:** In Capacitor, OAuth tokens stored in `Preferences` reside in app-private XML. On rooted Android devices, a malicious user or spyware with root privileges could extract temporary bearer tokens before they expire.
