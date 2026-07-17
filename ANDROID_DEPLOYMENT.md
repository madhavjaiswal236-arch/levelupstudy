# Android Deployment Guide

This app has been successfully configured to run as a native Android app using Capacitor. 

## Requirements
- Android Studio installed on your system.
- Firebase `google-services.json` (required for authentication and push notifications).

## Setup Firebase (CRITICAL)
Since the app uses native Firebase Authentication (Google Sign-In) and Push Notifications, you **must** configure your Android app in the Firebase Console:
1. Go to your Firebase Console.
2. Add an Android App with the package name `com.levelupstudy.app`.
3. Download the `google-services.json` file.
4. Place the `google-services.json` file inside the `android/app/` directory of your project.
5. In your Firebase Project settings, add your Android SHA-1 and SHA-256 certificate fingerprints (you can get this by running `./gradlew signingReport` inside the `android` folder).
6. Under Authentication -> Google Provider -> Web SDK configuration, ensure your web client ID is set up correctly (the Capacitor plugin handles the routing natively).

## Generating the APK (Debug)
To build a debug APK for testing on your own device:
1. Run `npm run build:android` to compile the web assets and sync them to the Android project.
2. Navigate to the android folder: `cd android`
3. Run the Gradle build command:
   - macOS/Linux: `./gradlew assembleDebug`
   - Windows: `gradlew.bat assembleDebug`
4. Your APK will be generated at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Generating an AAB for Play Store (Release)
Google Play requires an Android App Bundle (.aab) signed with a release key.
1. Run `npm run build:android`.
2. Open the `android` folder in Android Studio.
3. In Android Studio, go to **Build** -> **Generate Signed Bundle / APK**.
4. Select **Android App Bundle** and click Next.
5. Create a new Key Store path (or choose an existing one), provide passwords, and fill out the certificate details.
6. Select the `release` build variant and click Finish.
7. Android Studio will generate a signed `.aab` file that you can upload to the Google Play Developer Console.

## Changes Implemented
- **Firebase Auth**: Switched to `@capacitor-firebase/authentication` to support native Android Google Sign-In (bypassing the blocked `signInWithPopup`).
- **Data Persistence**: Created an async startup routine in `main.tsx` that syncs `localStorage` to `@capacitor/preferences`. This protects your user's progress from being wiped by the Android OS cache cleaner.
- **Background Timers**: The `ImmersiveTimer` now relies on `Date.now()` differences rather than `setInterval` ticks. This prevents Android from throttling the timer when the screen turns off.
- **Notifications**: Replaced Web Notification API with `@capacitor/local-notifications` to ensure nudges and reminders show up natively in the Android notification tray.
- **Safe Areas**: Added `viewport-fit=cover` to ensure the UI renders correctly on phones with notches/cutouts.
- **Back Button**: Integrated the Capacitor App plugin to route the hardware back button to the Dashboard, and exit the app only if already on the Dashboard.
- **API Routing**: Configured the Capacitor app to use the absolute production URL for server calls, and updated Express CORS policies to allow `capacitor://localhost`.

