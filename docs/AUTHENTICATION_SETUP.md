# CHECKMATE authentication setup

CHECKMATE authentication is deliberately isolated from AgriSence.

## 1. Create a dedicated Firebase project

1. Create a new Firebase project named CHECKMATE.
2. Register a separate Web App inside that project.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Enable Google as a provider and configure its support email and OAuth consent details.
5. Create a Cloud Firestore database in production mode.
6. Add the Web App configuration values to a local `.env` file using `.env.example` as the template.

Never copy AgriSence service-account keys, API secrets, project IDs, or production database configuration into CHECKMATE.

## 2. Configure local environment

Copy `.env.example` to `.env` and fill in the six Firebase Web App values. These are client configuration values; do not put Firebase Admin credentials or service-account private keys in Vite variables.

Restart the Vite dev server after changing environment variables.

## 3. Deploy Firestore rules

Review and deploy the repository's `firestore.rules` file to the CHECKMATE Firebase project:

```bash
firebase deploy --only firestore:rules
```

The current rules restrict player profile documents to their owner. All other collections are denied by default until their rules are designed and reviewed.

## 4. Current account capabilities

- Email/password registration and sign-in.
- Email verification message after registration.
- Google popup sign-in.
- Password reset email.
- Firebase-managed persistent authentication session.
- A private `players/{uid}` Firestore profile document.
- A routed account screen at `/auth`.

## 5. Important implementation boundaries

- Client-side Firebase configuration is not a security boundary. Firestore rules enforce profile ownership.
- Email verification is sent during registration; the UI must not treat a new account as verified until Firebase reports `emailVerified === true`.
- Do not store passwords, OTP values, access tokens, or private credentials in Firestore.
- Before launch, add server-side account abuse controls, account deletion workflow, privacy/export flows, and security monitoring.
- Do not add Firebase Admin SDK credentials to the browser bundle.
