# React Native (Expo) Migration Plan

Migrate the GigOne frontend from React web (`client/`) to a React Native mobile app (`mobile/`) using Expo. The Express backend (`server/`) remains **100% unchanged**.

## User Review Required

> [!IMPORTANT]
> **TTS on mobile** — The web version calls a local Python TTS server (`openai-edge-tts` on port 5050). On a phone this won't work because `localhost:5050` refers to the phone itself. We have two options:
> 1. **Use `expo-speech`** (built-in device TTS, works offline, zero setup) — *recommended for demo*
> 2. Deploy the TTS server to a public URL and call it from the app
>
> The plan below uses **Option 1: `expo-speech`** for simplicity.

> [!IMPORTANT]
> **Google OAuth** — The web version does `window.location.href = "http://localhost:5000/api/auth/google"`. On mobile, we'll use `expo-web-browser` to open the OAuth flow in an in-app browser and capture the redirect token. This approach is standard.

---

## Proposed Changes

### Project Scaffolding

#### [NEW] `mobile/` (Expo project root)

Scaffold with:
```bash
npx -y create-expo-app@latest ./mobile --template blank
```

Install key dependencies:
```bash
npx expo install expo-av expo-speech expo-web-browser expo-location @react-native-async-storage/async-storage
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context axios
```

---

### API Services Layer

#### [NEW] mobile/src/services/api.js
- Axios instance with `baseURL` pointing to laptop IP (e.g. `http://192.168.x.x:5000/api`)
- Auth interceptor reads token from **AsyncStorage** instead of `localStorage`

#### [NEW] mobile/src/services/chatApi.js
- Direct port of [client/src/services/chatApi.js](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/services/chatApi.js)
- Replace `localStorage` → `AsyncStorage`
- Remove browser-only `window.location.search` token logic
- Replace [synthesizeSpeech()](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/services/chatApi.js#114-137) with `expo-speech` (device TTS)

#### [NEW] mobile/src/services/earningsApi.js
- Direct port of [client/src/services/earningsApi.js](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/services/earningsApi.js)
- Same AsyncStorage adaptation

---

### Auth Screens

#### [NEW] mobile/src/screens/SignInScreen.js
- Port of [client/src/pages/auth/SignIn.jsx](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/pages/auth/SignIn.jsx)
- `TextInput` for email/password, Worker/Admin toggle
- Google OAuth via `expo-web-browser` (opens server OAuth URL, captures redirect)
- Token stored in **AsyncStorage**

#### [NEW] mobile/src/screens/SignUpScreen.js
- Port of [client/src/pages/auth/SignUp.jsx](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/pages/auth/SignUp.jsx)
- Name, email, password fields

---

### Navigation

#### [NEW] mobile/src/navigation/AppNavigator.js
- **Auth stack** (SignIn, SignUp) — shown when no token
- **Main tabs** (Dashboard, Earnings, WorkLogs, More) — shown when token exists
- Bottom tab bar with icons

---

### Dashboard (Core Feature)

#### [NEW] mobile/src/screens/DashboardScreen.js
- Port of [client/src/pages/user/DashBoard.jsx](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/pages/user/DashBoard.jsx) (627 lines → ~400 lines native)
- AI chat interface with `FlatList` for messages
- Press-and-hold mic button using `onPressIn` / `onPressOut`
- Uses `expo-av` for voice recording (replaces `MediaRecorder`)
- Uses `expo-speech` for TTS (replaces `openai-edge-tts`)
- Weather, burnout, weekly earnings widgets
- Language selector dropdown

#### [NEW] mobile/src/hooks/useVoiceRecorder.js
- Port of [client/src/hooks/useVoiceRecorder.js](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/hooks/useVoiceRecorder.js)
- Uses `Audio.Recording` from `expo-av` instead of browser `MediaRecorder`
- Returns `{ isRecording, startRecording, stopRecording }` (same API)

---

### Other Screens

#### [NEW] mobile/src/screens/EarningsScreen.js
- Port of [client/src/pages/user/Earnings.jsx](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/pages/user/Earnings.jsx)
- List earnings, add/edit/delete with modal

#### [NEW] mobile/src/screens/WorkLogsScreen.js
- Port of [client/src/pages/user/WorkLogs.jsx](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/client/src/pages/user/WorkLogs.jsx)
- List past conversations

#### [NEW] mobile/src/screens/MoreScreen.js
- Links to: Suggestions, Weekly Report, Platforms, Shift Planner, Settings
- Each as a placeholder with title + "Coming Soon"

---

### Theme & Styling

#### [NEW] mobile/src/theme.js
- Central design tokens matching the web dark glassmorphism theme:
  - `colors.primary = '#6c63ff'`
  - `colors.accent = '#00d4aa'`
  - `colors.bgDeep = '#07080f'`
  - `colors.bgCard = 'rgba(19,22,38,0.85)'`
- Typography using system fonts (Inter via `expo-google-fonts` optional)

---

### Entry Point

#### [MODIFY] mobile/App.js
- Wraps everything in `NavigationContainer`
- Checks AsyncStorage for token on mount → shows Auth or Main stack

---

## What Does NOT Change

| Item | Reason |
|---|---|
| `server/` (all files) | API is device-agnostic |
| [server/.env](file:///c:/Users/nagar/OneDrive/Desktop/antigravity/Geek-worker-guide/GigOne/server/.env) | Same MongoDB, same Gemini keys |
| `client/` | Kept as-is for reference |

---

## Verification Plan

### Automated (Dev Server)
1. Run `npx expo start` in `mobile/` — should launch without errors
2. Scan QR code on phone using Expo Go app — app should open

### Manual Testing (on phone via Expo Go)
1. **Auth flow**: Open app → see SignIn screen → enter valid credentials → should navigate to Dashboard
2. **Dashboard loads**: Should see weather, burnout widget, weekly earnings from API
3. **Voice chat**: Press and hold mic → speak → release → should see transcription + AI reply + hear TTS
4. **Earnings page**: Navigate to Earnings tab → should see list → add a new earning → should appear
5. **WorkLogs page**: Navigate to WorkLogs tab → should see past conversations

> [!NOTE]
> Both phone and laptop must be on the **same WiFi network** for the phone to reach the local API server.
