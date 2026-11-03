# CHECKMATE authentication setup

CHECKMATE authentication and data are deliberately isolated from AgriSence. The current implementation is a dedicated Firebase Authentication and Firestore foundation; AgriSence production credentials and databases are never reused.

## 1. Create a dedicated Firebase project

1. Create a new Firebase project named CHECKMATE.
2. Register a separate Web App inside that project.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Enable Google as a provider and configure its support email and OAuth consent details.
5. Create a Cloud Firestore database in production mode.
6. Create the project's default Firebase Storage bucket (choose a region and billing/plan settings appropriate for your project).
7. Add the Web App configuration values to a local `.env` file using `.env.example` as the template, including the exact Storage bucket name shown in Firebase Console.

Never copy AgriSence service-account keys, API secrets, project IDs, or production database configuration into CHECKMATE.

## 2. Configure local environment

Copy `.env.example` to `.env` and fill in the six Firebase Web App values. Set `FIREBASE_PROJECT_ID` to the dedicated CHECKMATE project ID.

The realtime server also uses Google Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS` to access Firebase Admin. Keep those credentials server-side only; never use a `VITE_*` variable for a private key or TURN shared secret.

Restart both the Vite and realtime server processes after changing environment variables.

## 3. Deploy Firestore rules

Review and deploy the repository's Firestore and Storage rules to the CHECKMATE Firebase project:

```bash
firebase deploy --only firestore:rules,storage
```

Account preferences are stored in `players/{uid}/settings/preferences`. Background images are uploaded to `players/{uid}/backgrounds/` in Firebase Storage. Both paths are owner-restricted by the deployed rules. The browser stores only the current in-memory settings; it does not use localStorage as the source of truth.

The rules currently cover:
- Owner-only private player profiles.
- Minimal signed-in public player profiles.
- Participant-only friend requests and friendships.
- Friend-only conversations and immutable text messages.
- Participant-only completed game history.
- Organizer-owned tournament documents and self-registration.
- No client writes to completed game records.

The Firebase Admin SDK bypasses client rules; secure server-side credentials and validation are therefore mandatory.

## 4. Current account capabilities

- Email/password registration and sign-in.
- Email verification message after registration and resend support.
- Explicit verification refresh after clicking the email link.
- Google popup sign-in.
- Password reset email.
- Firebase-managed persistent authentication session.
- Private `players/{uid}` and minimal `publicProfiles/{uid}` documents.
- Account-synced personalisation preferences in Firestore and owner-only custom background image uploads in Firebase Storage.
- Editable display name and account profile at `/profile`.
- Online matchmaking and player calls require a verified email claim.

## 5. Important implementation boundaries

- Client-side Firebase configuration is not a security boundary. Firestore rules enforce ownership and membership.
- Email verification is sent during registration; the server rejects unverified accounts from real-time online play.
- Do not store passwords, OTP values, access tokens, or private credentials in Firestore.
- Before launch, add server-side account abuse controls, account deletion workflow, privacy/export flows, and security monitoring.
- Do not add Firebase Admin SDK credentials or TURN shared secrets to the browser bundle.
