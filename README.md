# Shre – Clothing Share Platform

This is a React + Vite app for a clothing sharing platform with authentication, profiles, a shared map of pins, and realtime chat.

## Tech
- React + Vite
- Router: `react-router-dom`
- Animations: `motion` (framer-motion successor)
- Firebase: Auth, Firestore, Storage, Realtime Database
- Maps: Leaflet (`react-leaflet`)
- Styling: vanilla CSS with CSS variables; theme-ready

## Getting Started
1) Install and run
```bash
npm i
npm run dev
```

2) Create `.env` (project root)
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
```

3) Firebase Console setup
- Create or open a Firebase project
- Build > Authentication: enable Email/Password and Google; add authorized domains (`localhost`, your dev/prod domains)
- Build > Firestore Database: create Firestore (Production mode)
- Build > Storage: create default bucket
- Build > Realtime Database: create database
- Project settings > General: add a Web App and copy config into `.env`
- If using Google provider, ensure OAuth consent/web client is configured

4) Firebase Security Rules (baseline)
Firestore rules (users, pins, favourites):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    match /users/{uid} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == uid;
      match /favoritePins/{pinId} {
        allow read, write: if isSignedIn() && request.auth.uid == uid;
      }
    }

    match /pins/{pinId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow delete, update: if isSignedIn() && resource.data.userId == request.auth.uid;
    }
  }
}
```

Storage rules (limit to each user’s folder):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() {
      return request.auth != null;
    }
    match /users/{uid}/{allPaths=**} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == uid;
    }
  }
}
```

Realtime Database rules (only participants can read/write a chat):
```
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "chats": {
      "$chatId": {
        ".read": "auth != null && root.child('chats/'+$chatId+'/users/'+auth.uid).val() == true",
        ".write": "auth != null && root.child('chats/'+$chatId+'/users/'+auth.uid).val() == true"
      }
    },
    "userChats": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

## Fonts
- Akshar is imported via Google Fonts in `src/styles/globals.css`.
- Santoshi (local): place WOFF2/WOFF files under `src/assets/fonts/santoshi/`. See `src/assets/fonts/README.md`.

## Colors and Themes
CSS variables are defined in `src/styles/variables.css`. Adjust colors once there to affect the whole app.

Primary: `#1d427d`  Secondary: `#faef5c`

State palettes are also provided (error, info, warning, success).

## Firebase
We use:
- Auth: Email/password and Google provider
- Firestore: user profiles, map pins, favorites
- Storage: images (door knob avatar, clothing images)
- Realtime Database: chat

Configuration lives in `src/firebase/client.ts`, pulling from Vite env vars.

## Firebase Console: Step-by-step setup and where to find values

1) Open Console and choose project
- Go to `https://console.firebase.google.com`
- Select your project (or create a new one)

2) Get Web App Config (API key, Auth domain, Project ID, App ID, Storage bucket, Messaging sender id)
- Bottom-left gear → Project settings → General
- Scroll to “Your apps”
  - If none, click “</>” to register a Web app; otherwise click your existing Web app
- In “Firebase SDK snippet” → Config, copy these into your `.env`:
  - `apiKey` → `VITE_FIREBASE_API_KEY`
  - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
  - `projectId` → `VITE_FIREBASE_PROJECT_ID`
  - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
  - `appId` → `VITE_FIREBASE_APP_ID`
  - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`

3) Realtime Database URL
- Left nav → Build → Realtime Database
- If not created: “Create database” → choose location → Start in locked mode
- After creation, copy the URL shown at the top (format: `https://<project>-default-rtdb.firebaseio.com`)
- Paste into `.env` as `VITE_FIREBASE_DATABASE_URL`

4) Enable Authentication (Email/Password + Google)
- Left nav → Build → Authentication
- Click “Get started” if first time
- Tab “Sign-in method”
  - Email/Password → Enable → Save
  - Google → Enable → pick Support email → Save
- Tab “Settings” → Authorized domains → add `localhost` and any deployed domains

5) Create Firestore
- Left nav → Build → Firestore Database
- “Create database” → Start in production mode → choose region → Enable
- Rules: open the “Rules” tab and paste the Firestore rules from this README (Security Rules section) → Publish

6) Create Storage
- Left nav → Build → Storage
- “Get started” → choose region → Enable
- Rules: open the “Rules” tab and paste the Storage rules from this README → Publish
- The storage bucket name is also visible here (matches the `storageBucket` in your Web config)

7) Realtime Database rules
- Left nav → Build → Realtime Database
- Tab “Rules” → paste the Realtime DB rules from this README → Publish

8) Verify `.env`
Your `.env` must include:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=https://<project>-default-rtdb.firebaseio.com
```

9) Run locally
```
npm i
npm run dev
```

## App Flow (What to do after setup)
1) Sign up or login (Email/Password or Google)
2) Complete Profile
   - Name, Nickname, Educational Institute, Location, Blood Group
   - Bio, Aesthetic (select)
   - Upload at least 6 clothing images (tops/bottoms)
   - Optional door knob avatar (circular)
   - Save → redirects to Home
3) Profile pages
   - Self: yellow ID card, green dashed door-knob area, closet (2-col), Activity (pins + favourites), “Download Hanger” exports 4:3 PNG
   - Others: 20-60-20 layout with clothing marquees (motion), center ID card without name, “Knock” opens a chat overlay, link to open full chat page
4) Map
   - Big map (Leaflet). Click to add pin (Shop/Service)
   - Hover shows info + Save/Unsave
   - Right sidebar: “My pins” (delete/edit own), “My favourites” (unsave)
5) Chat
   - Route: `/chat` (recent chats list + pane) or `/chat/:uid` to start a chat directly
   - Live messages via Realtime DB

## Structure
```
src/
  context/           AuthProvider
  firebase/          Firebase SDK client
  pages/             Routes (Home, Login, Register, CompleteProfile, Profile, Map, Chat)
  routes/            ProtectedRoute
  styles/            variables.css, globals.css
  assets/fonts/      local fonts (Santoshi)
```

## UI Library
Requested: shadcn. Note: shadcn/ui requires Tailwind, but this project uses vanilla CSS. If Tailwind cannot be added, use Radix primitives + custom CSS for inputs, dialogs, tooltips, and chat UI.

## Leaflet
We use Leaflet directly (no react-leaflet). Leaflet CSS is linked in `index.html`.

## Roadmap
- Profile self/other detailed layouts
- Leaflet map pins CRUD and favorites panel
- Realtime chat screen (list + pane)
- Export “Download Hanger” PNG (uses `html-to-image`)
