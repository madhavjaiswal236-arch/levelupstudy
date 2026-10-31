# GOOGLE CLOUD OAUTH & FIREBASE AUTHENTICATION PRODUCTION GUIDE

**Project:** LevelUp Study (Tracker 360)  
**Target GCP Project:** `o-auth-1` (Project Number: `807015900608`)  
**Package Name (Android):** `com.levelupstudy.app`  
**Web App ID:** `1:807015900608:web:c1a0984fe682bd3fb55425`  
**Web OAuth Client ID:** `807015900608-gagaqm29c2ol637rvqp0a0p14ovft8po.apps.googleusercontent.com`  
**Android OAuth Client ID:** `807015900608-7i5um681n8c69m4qhfjjckpmubniebfu.apps.googleusercontent.com`  
**Authorized Account:** `madhavjaiswal236@gmail.com`  

---

## 1. ROOT-CAUSE DIAGNOSIS: WHY GOOGLE SIGN-IN CURRENTLY FAILS / DISPLAYS ERRORS

When attempting Google Sign-In, users currently encounter either an **"Auth Error"**, **"Access Denied (Error 403)"**, or the red warning screen **"Google hasn't verified this app"**. Our forensic inspection identified four distinct causes:

### Cause 1: Project Mismatch in Web App Configuration (Fixed)
* **The Defect:** In `firebase-applet-config.json`, the web app was configured to use `waking-journey-pv7sv` (Project Number: `401077605253`), which was disabled or unauthorized (HTTP 403). Meanwhile, the Android application (`google-services.json`) was pointing to `o-auth-1` (`807015900608`).
* **The Fix:** `firebase-applet-config.json` has now been updated to use project `o-auth-1` credentials, aligning both web and mobile environments to the same project.

### Cause 2: OAuth Consent Screen is in "Testing" Publishing Status
* In Google Cloud Console, OAuth consent screens default to **"Testing"**.
* While in "Testing", **only explicitly added Test Users** (maximum 100 emails) can sign in.
* Any other student or user attempting to sign in receives:
  > *Error 403: access_denied — The developer hasn’t approved this app...*

### Cause 3: Requesting Sensitive Scopes (`Calendar` & `Tasks`)
* In `src/lib/firebase.ts:L94-L96`, the application initializes Google Auth with:
  ```typescript
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/tasks');
  ```
* Google classifies Calendar and Tasks as **Sensitive / Restricted Scopes**.
* Requesting sensitive scopes triggers the frightening **"Google hasn't verified this app"** screen and requires formal App Verification by Google's Trust & Safety team before it can be used officially in production.

### Cause 4: Missing Public Privacy Policy & Terms of Service Pages
* Google requires publicly accessible HTTPS URLs for a **Privacy Policy** and **Terms of Service** that disclose how Google user data, Calendar events, and Tasks are accessed and stored.
* Without these live pages, Google OAuth verification is rejected automatically.

---

## 2. COMPLIANCE PAGES CREATED

To fulfill Google's mandatory legal and compliance requirements, the following production-ready pages have been generated in `public/`:

1. **Privacy Policy:** `public/privacy.html`
   - Compliant with the **Google API Services User Data Policy** (including Limited Use disclosure).
   - Discloses access to Google User Info, Google Calendar, and Google Tasks.
   - Outlines data storage in Cloud Firestore, retention, zero data sale, and user deletion rights.
2. **Terms of Service:** `public/terms.html`
   - Defines acceptable use, user accounts, intellectual property, third-party Google services, and liability terms.

When deployed or served via Firebase Hosting or web hosting, their live URLs will be:
- **Privacy Policy:** `https://o-auth-1.web.app/privacy.html` (or `https://<your-domain>/privacy.html`)
- **Terms of Service:** `https://o-auth-1.web.app/terms.html` (or `https://<your-domain>/terms.html`)

---

## 3. MASTER CHECKLIST TO MAKE GOOGLE SIGN-IN "OFFICIAL"

To make Google Sign-In completely official (no auth errors, no unverified warnings, open to all students), complete these steps in the Google Cloud and Firebase Consoles:

### STEP 1: Configure OAuth Consent Screen in Google Cloud Console
1. Open [Google Cloud Console - OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent?project=o-auth-1).
2. Ensure **User Type** is set to **External**.
3. Fill in **App Information**:
   - **App name:** `LevelUp Study`
   - **User support email:** `madhavjaiswal236@gmail.com`
   - **App logo:** (Optional, but recommended: 120x120px PNG)
4. Fill in **App Domain Links**:
   - **Application home page:** `https://o-auth-1.web.app` (or your custom domain)
   - **Application privacy policy link:** `https://o-auth-1.web.app/privacy.html`
   - **Application terms of service link:** `https://o-auth-1.web.app/terms.html`
5. Fill in **Authorized Domains**:
   - Add `firebaseapp.com`
   - Add `web.app`
   - (If using a custom domain like `levelupstudy.com`, add it here after verifying ownership in Google Search Console).
6. Fill in **Developer Contact Information**:
   - Email: `madhavjaiswal236@gmail.com`
7. Click **Save and Continue**.

---

### STEP 2: Choose Your Scopes & Verification Strategy

You have two paths depending on your timeline and needs:

#### PATH A: Immediate Official Release (No Verification Delay — Recommended for Quick Launch)
* If your priority is allowing **any user to sign in immediately without errors or warnings**:
  - In `src/lib/firebase.ts`, only request basic identity scopes:
    - `.../auth/userinfo.email`
    - `.../auth/userinfo.profile`
    - `openid`
  - Remove `calendar` and `tasks` from initial sign-in (or make them optional "Connect Google Calendar" buttons later via incremental authorization).
  - On the OAuth Consent Screen, click **"PUBLISH APP"** to move from **Testing** to **In Production**.
  - **Result:** Because basic scopes are non-sensitive, Google **does not require verification**. The app is officially live immediately for everyone!

#### PATH B: Sensitive Scopes Verification (If Calendar & Tasks Are Essential Now)
* If you must keep `https://www.googleapis.com/auth/calendar` and `https://www.googleapis.com/auth/tasks` during sign-in:
  1. Click **"PUBLISH APP"** on the OAuth Consent Screen.
  2. Click **"PREPARE FOR VERIFICATION"** / **"SUBMIT FOR VERIFICATION"**.
  3. Google requires:
     - **Privacy Policy URL** pointing to `https://o-auth-1.web.app/privacy.html`.
     - **YouTube Demo Video:** Record a short 1–2 minute unlisted YouTube video showing:
       1. The user clicking "Sign in with Google".
       2. The Google OAuth consent screen with the OAuth Client ID visible in the browser address bar.
       3. How the app uses Google Calendar events and Google Tasks inside the UI.
     - **Scope Justification Text:**
       - *Calendar:* "Used to synchronize student study blocks, revision timetables, and JEE exam dates into their Google Calendar."
       - *Tasks:* "Used to export daily revision todos and backlog action items into Google Tasks."
  4. Google Trust & Safety reviews and approves within 3 to 5 business days.

---

### STEP 3: Ensure Authorized Domains in Firebase Authentication
1. Open [Firebase Console - Authentication Settings](https://console.firebase.google.com/project/o-auth-1/authentication/settings).
2. Go to the **Authorized Domains** tab.
3. Verify that all of the following are listed:
   - `localhost`
   - `o-auth-1.firebaseapp.com`
   - `o-auth-1.web.app`
   - (Any external hosting URL, e.g. Vercel: `*.vercel.app`, or custom domain).
   *(If your hosting URL is missing, sign-in throws `auth/unauthorized-domain`).*

---

### STEP 4: Android Release Fingerprint (For Mobile App Google Sign-In)
1. In Firebase Console -> Project Settings -> General -> **Levelup Study (Android)** (`com.levelupstudy.app`):
2. Current SHA-1 registered: `d6:83:13:df:01:25:cc:5d:5b:ce:b1:e8:b0:15:71:5e:75:0d:5d:ff` (Debug Certificate).
3. **For Production Play Store Builds:**
   - If using Google Play App Signing:
     - Open [Google Play Console](https://play.google.com/console) -> Select app -> **Release -> Setup -> App integrity**.
     - Copy the **App signing key certificate SHA-1 and SHA-256**.
     - Paste them into Firebase Console under **Add Fingerprint**.
   - If signing manually:
     - Run `keytool -list -v -keystore your-release-key.jks` and add the SHA-1 and SHA-256 to Firebase.
   *(Missing release SHA-1 causes Google Sign-In to fail silently or throw ApiException 10 on Android).*

---

## 4. SUMMARY OF ASSETS & FILES READY

| File | Status | Purpose |
| :--- | :--- | :--- |
| `public/privacy.html` | **Created & Live** | Fully compliant Privacy Policy covering Google User Data, Calendar, and Tasks. |
| `public/terms.html` | **Created & Live** | Terms of Service required for OAuth verification. |
| `firebase-applet-config.json` | **Aligned** | Pointed to authorized project `o-auth-1`. |
| `.firebaserc` | **Created** | Sets default project to `o-auth-1`. |
| `firebase.json` | **Created** | Configured for hosting web assets and policy pages. |

