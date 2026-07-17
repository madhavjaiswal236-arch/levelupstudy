# Android Home Screen Widgets Implementation Guide

While Capacitor is great for rendering your web app as a native Android app, **Home Screen Widgets** live on the Android OS Launcher outside of your app's WebView. You cannot build them using React or HTML. They must be built natively in Kotlin/XML.

Here is the strategy to implement the premium widgets you requested (Tasks, Days Left) while keeping React as your source of truth.

## 1. Syncing Data to Native Storage
Currently, your app's state is stored in `@capacitor/preferences`. This data is saved as a JSON string inside Android's native `SharedPreferences`, meaning native Kotlin code can read it!

Whenever a task is added or the days left change, your React app is already updating `@capacitor/preferences`.

## 2. Creating the Native Android Widget
Open your `android/` folder in **Android Studio**:

1. Right-click on your package (`com.levelupstudy.app`) -> **New** -> **Widget** -> **App Widget**.
2. Name it `StudyPlannerWidget`.
3. This creates a `StudyPlannerWidget.kt` file and a layout XML file (e.g., `study_planner_widget.xml`).

## 3. Designing the Premium UI (XML)
Edit the `res/layout/study_planner_widget.xml`. Use Android's native `LinearLayout` and `TextView` with rounded corners and gradients to match your dark/neon aesthetic.
```xml
<!-- Example premium dark widget layout -->
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg_dark_gradient"
    android:orientation="vertical"
    android:padding="16dp">
    
    <TextView
        android:id="@+id/daysLeftText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="#FFFFFF"
        android:textSize="24sp"
        android:textStyle="bold" />
        
    <!-- Add more views for tasks -->
</LinearLayout>
```

## 4. Wiring Data in Kotlin
In `StudyPlannerWidget.kt`, override `onUpdate` to read from the SharedPreferences that Capacitor writes to, parse the JSON, and update the UI:

```kotlin
override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    // Capacitor stores Preferences under the "CapacitorStorage" SharedPreferences file
    val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
    
    // Read the JSON string you saved in React
    val stateJson = prefs.getString("jee_tracker_state", "{}")
    
    // Parse the JSON (using org.json.JSONObject)
    val jsonObject = JSONObject(stateJson)
    val xp = jsonObject.optInt("xp", 0)
    // Extract your tasks and dates here...

    for (appWidgetId in appWidgetIds) {
        val views = RemoteViews(context.packageName, R.layout.study_planner_widget)
        views.setTextViewText(R.id.daysLeftText, "XP: $xp")
        // Update other views...
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
```

## 5. Triggering Widget Updates from React
Android widgets only update periodically (usually every 30 minutes minimum). To make it update instantly when the user checks off a task in your app, use the `@capacitor-community/app-widget` or `capacitor-widget-bridge` plugin to trigger a forced native update from your React code.

```typescript
import { WidgetBridge } from 'capacitor-widget-bridge';
// Call this after saving state to force the Android widget to refresh immediately
WidgetBridge.updateWidget();
```
