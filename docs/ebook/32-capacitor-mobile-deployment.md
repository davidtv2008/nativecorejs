# Chapter 32 — Capacitor: Packaging for Android and iOS

NativeCoreJS is a web application framework. Its output is a `dist/` folder of HTML, CSS, and JavaScript that runs in any browser. [Capacitor](https://capacitorjs.com/) is the bridge that takes that `dist/` folder and packages it as a native Android APK or iOS app — without touching your source code.

This chapter explains the full workflow, what you can accomplish on any OS, what requires macOS, and what Capacitor genuinely cannot do.

---

## What Capacitor Does

Capacitor wraps your web app in a native shell. On Android that shell is a `WebView` inside an Android Studio project. On iOS it is a `WKWebView` inside an Xcode project. Your NativeCoreJS code runs exactly as it does in the browser — the same DOM, the same custom elements, the same router — but it is now a `.apk` or `.ipa` file that users install from the app stores.

Capacitor also provides a plugin system that lets you call native device APIs (camera, geolocation, push notifications, haptics, file system, biometrics) through a typed JavaScript interface. Without plugins your app can only do what a browser can do.

---

## Mac-Free vs Mac-Required: The Decision Table

| Task | Windows / Linux | macOS |
|---|---|---|
| Build app logic and UI (`npm run dev`) | ✓ | ✓ |
| Run unit tests (`npm test`) | ✓ | ✓ |
| Build the production web bundle (`npm run build:client`) | ✓ | ✓ |
| Add Android platform (`npm run cap:add:android`) | ✓ | ✓ |
| Sync web assets to Android (`npm run cap:sync`) | ✓ | ✓ |
| Run in Android Emulator | ✓ (needs Android Studio) | ✓ |
| Run on physical Android device | ✓ (needs Android Studio) | ✓ |
| Submit to Google Play | ✓ | ✓ |
| Add iOS platform (`npm run cap:add:ios`) | ✗ | ✓ |
| Build for iOS Simulator | ✗ | ✓ (Xcode required) |
| Run on physical iPhone / iPad | ✗ | ✓ (Xcode required) |
| Submit to the App Store | ✗ | ✓ (Xcode required) |

**Summary:** You can build, develop, and ship a full Android app without ever touching a Mac. iOS requires macOS and Xcode — this is an Apple restriction, not a Capacitor or NativeCoreJS limitation.

---

## Setting Up a New Project with Capacitor

When scaffolding with `create-nativecore`, answer **yes** to the Capacitor prompt:

```bash
npx create-nativecore my-app
# …
# Include Capacitor (Android/iOS packaging)? (n) y
```

Or pass the flag directly:

```bash
npx create-nativecore my-app --capacitor
```

This generates `capacitor.config.ts` in the project root and adds `cap:*` scripts to `package.json`. It also installs `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, and `@capacitor/ios`.

---

## Adding Capacitor to an Existing Project

If your project was created without Capacitor:

```bash
npm install @capacitor/core
npm install --save-dev @capacitor/cli @capacitor/android @capacitor/ios
npx cap init
```

When `npx cap init` asks for the web directory, enter `dist`. Then create `capacitor.config.ts` (see below).

---

## The `capacitor.config.ts` File

When you scaffold with `--capacitor`, the CLI generates this file for you:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.example.myapp',        // change to your real reverse-domain ID
    appName: 'My App',
    webDir: 'dist',                    // must match your build output folder
    server: {
        androidScheme: 'https'         // required for cookies and secure contexts
    }
};

export default config;
```

**Edit `appId` before adding any platform.** The app ID is baked into the native project folder structure and is difficult to change afterwards. Use your own reverse-domain identifier: `com.yourcompany.yourapp`.

---

## Daily Development Workflow

Your day-to-day flow does not change. Write TypeScript, test in the browser, use `npm run dev`. Capacitor only enters the picture when you need to test on a real device or emulator.

```
┌───────────────────────────┐
│  npm run dev              │  ← daily development, fast iteration
│  (browser at localhost)   │
└───────────────────────────┘
         │  when ready to test native
         ▼
┌───────────────────────────┐
│  npm run cap:android      │  ← builds, syncs, opens Android Studio
│  npm run cap:ios          │  ← builds, syncs, opens Xcode (macOS only)
└───────────────────────────┘
```

---

## The `cap:*` npm Scripts

| Script | What it does |
|---|---|
| `npm run cap:add:android` | Generates the `android/` native project (run once) |
| `npm run cap:add:ios` | Generates the `ios/` native project (run once, macOS only) |
| `npm run cap:sync` | Runs `npm run build:client` then `npx cap sync` — copies `dist/` to the native projects and updates plugins |
| `npm run cap:android` | Syncs then opens the project in Android Studio |
| `npm run cap:ios` | Syncs then opens the project in Xcode |
| `npm run cap:run:android` | Syncs then runs directly on a connected Android device or emulator |
| `npm run cap:run:ios` | Syncs then runs directly on a connected iOS device or simulator |

Run `cap:add:android` and `cap:add:ios` exactly once, the first time. After that use `cap:sync` every time you change your web code before testing natively.

---

## Android Workflow (No Mac Required)

### One-time setup

1. Install [Android Studio](https://developer.android.com/studio)
2. In Android Studio, open **SDK Manager** and install at least one Android SDK (API 24 or higher is safe)
3. Set `ANDROID_HOME` in your environment:
   ```bash
   # Linux / macOS
   export ANDROID_HOME=$HOME/Android/Sdk
   # Windows PowerShell
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   ```

### Adding the platform

```bash
npm run cap:add:android
```

This creates an `android/` folder in your project root. Commit it to source control — it is your native Android project.

### Testing

```bash
npm run cap:android
```

Android Studio opens. Press the green **Run** button to launch in an emulator or a connected USB device.

### Building a release APK

In Android Studio: **Build → Generate Signed Bundle / APK**. Follow the signing wizard to create a keystore and sign your release build. The signed APK or AAB is what you upload to Google Play.

---

## iOS Workflow (macOS + Xcode Required)

### One-time setup

1. Install Xcode from the Mac App Store
2. Accept the Xcode license: `sudo xcodebuild -license accept`
3. Install Xcode command-line tools: `xcode-select --install`

### Adding the platform

```bash
npm run cap:add:ios
```

This creates an `ios/` folder. Commit it to source control.

### Testing

```bash
npm run cap:ios
```

Xcode opens. Select a simulator or connected device and press **Run**.

### Building a release IPA

In Xcode: **Product → Archive**, then use the Organizer to upload to App Store Connect. You need an Apple Developer Program membership ($99/year) to distribute outside TestFlight.

---

## Using Capacitor Plugins for Native APIs

When your web app needs a device API that is not available in the browser, add a Capacitor plugin:

```bash
npm install @capacitor/camera
npm install @capacitor/geolocation
npm install @capacitor/push-notifications
npm run cap:sync   # sync the plugin to native projects
```

Then import and use the plugin in your controller:

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

export async function photoController(): Promise<() => void> {
    const events = trackEvents();
    const btn = document.querySelector<HTMLButtonElement>('#take-photo');

    events.on(btn, 'click', async () => {
        const photo = await Camera.getPhoto({
            quality: 90,
            resultType: CameraResultType.Uri
        });
        console.log(photo.webPath);
    });

    return () => events.cleanup();
}
```

Capacitor plugins call native code under the hood. The same code runs in the browser (where Capacitor provides a web fallback or throws a not-implemented error) and in the native app (where it calls the OS API).

---

## The `androidScheme: 'https'` Setting

The `server.androidScheme: 'https'` option in `capacitor.config.ts` makes your Android WebView load the app over a local HTTPS scheme instead of `file://`. This matters because:

- `sessionStorage`, cookies, and `localStorage` behave correctly with HTTPS origins
- `fetch()` works without special CORS workarounds
- Web Crypto API is available (it requires a secure context)

Always keep this setting. Remove it only if you have a specific reason that you fully understand.

---

## What Capacitor Cannot Do

| Limitation | Explanation |
|---|---|
| **No hot reload in native** | `npm run dev` HMR works only in the browser. Native builds require a full sync. Use the browser for development. |
| **No React Native–style native components** | Capacitor uses a WebView. Your UI is rendered by the browser engine, not native OS widgets. The app looks like a web app rendered at 60fps, not like a native UIKit or Material Design app. |
| **No background execution without plugins** | Web apps cannot run when backgrounded. Background tasks, background sync, and push notifications require Capacitor plugins and native configuration. |
| **No native navigation gestures by default** | iOS swipe-back and Android back-button gestures require the Capacitor Haptics and App plugins, plus explicit handling in your router. |
| **App Store approval** | Apple reviews all apps. Thin wrappers around existing websites are routinely rejected. Your app must provide meaningful functionality beyond the website. |
| **Web-only APIs absent in old WebViews** | WebView versions on older Android devices may lag behind Chrome. Test on a range of Android versions, especially API 24–27. |

---

## `.gitignore` for Capacitor

The `android/` and `ios/` folders should be in source control because they hold your native project configuration. However, you should ignore generated build artifacts:

```gitignore
# Capacitor build outputs
android/.gradle/
android/app/build/
ios/DerivedData/
ios/Pods/
```

Add the `Pods/` folder to `.gitignore` if you prefer to run `pod install` on each checkout. If you commit `Pods/`, remove it from `.gitignore` and ensure all team members use the same CocoaPods version.

---

## Project Structure After Adding Capacitor

```
my-app/
├── capacitor.config.ts     ← Capacitor configuration
├── android/                ← Android Studio project (committed)
│   ├── app/
│   └── …
├── ios/                    ← Xcode project (committed, macOS only)
│   ├── App/
│   └── …
├── dist/                   ← web build output, copied here by cap sync
├── src/                    ← your NativeCoreJS source
└── package.json
```

The `dist/` folder is produced by `npm run build:client` and should remain in `.gitignore`. Capacitor copies it into the native projects during `cap sync`.

---

## Recommended Development Cycle

```
1.  npm run dev                → browser dev loop (most of your time)
2.  npm run cap:sync           → after a significant feature is complete
3.  npm run cap:android        → verify on Android emulator or device
4.  npm run cap:ios            → verify on iOS Simulator (Mac only)
5.  Signed APK / IPA builds    → when shipping a release
```

Write tests for business logic in Vitest (they run against `happy-dom`, no native tooling needed). Reserve the native emulators for gesture/layout/plugin testing that cannot be replicated in the browser.

---

## Apply This Chapter to Bonus Project — Taskflow Mobile ★ Checkpoint

> **Project:** Taskflow Mobile — Native Android & iOS  
> **Feature:** Package the Taskflow app from Project 1 as a native Android and iOS app using Capacitor.

Run `npx create-nativecore taskflow-mobile --capacitor` (or add Capacitor to your existing Taskflow project). Add the Android platform, sync, and run in the Android Emulator. Produce a signed APK from Android Studio. If on macOS, add the iOS platform, sync, and run in the iOS Simulator.

### Done Criteria

- [ ] `npx create-nativecore taskflow-mobile --capacitor` scaffolds the project with `capacitor.config.ts` and `cap:*` scripts.
- [ ] `npm run cap:add:android` generates the `android/` native project without errors.
- [ ] The app opens and is functional in the Android Emulator (login, tasks, and dashboard routes work).
- [ ] A signed debug APK is produced via Android Studio's "Build → Build Bundle(s)/APK(s)".
- [ ] *(macOS only)* `npm run cap:add:ios` generates the `ios/` project and the app opens in the iOS Simulator.

### Checkpoint Commit

```bash
git add .
git commit -m "🚀 Bonus project complete: Taskflow Mobile — Android APK built, iOS workflow ready"
git tag bonus-mobile-complete
```

---

**Back:** [Chapter 31 — Framework API Quick Reference](./31-framework-api-quick-reference.md)  
**Next:** [Chapter 33 — SSG and Static Deployment](./33-ssg-and-deployment.md)
