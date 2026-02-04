---
description: Deploy the Second Brain OS to Firebase Hosting with Firestore
---

# Deploy to Firebase (Google Cloud)

This workflow migrates your database to Firestore and deploys the application to Firebase Hosting using GitHub Actions.

## 1. Firebase Project Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (or use an existing one).
3.  **Enable Firestore**:
    *   Go to "Build" -> "Firestore Database".
    *   Click "Create Database".
    *   Start in **Test Mode** (for now).
    *   Choose a location close to you (e.g., `us-central1`).
4.  **Register Web App**:
    *   Go to Project Settings (gear icon).
    *   Scroll to "Your apps" and click the `</>` (Web) icon.
    *   Register the app (e.g., "second-brain-os").
    *   **COPY the `firebaseConfig` object values**.

## 2. Configure Environment Variables

1.  Open `.env.local` in your project root.
2.  Fill in the values from the `firebaseConfig` you just copied.
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    # ... etc
    ```
3.  **Restart your local server** to pick up the new variables:
    ```bash
    npm run dev
    ```
    *Verify that your app now loads data from Firestore (it will be empty initially).*

## 3. GitHub Actions Deployment Setup

To enable the "Google Workflow" (GitHub Actions) to deploy for you:

1.  **Generate Service Account Key**:
    *   In Firebase Console -> Project Settings -> Service accounts.
    *   Click "Generate new private key".
    *   Download the JSON file.

2.  **Configure GitHub Secrets**:
    *   Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions.
    *   Add a new repository secret named `FIREBASE_SERVICE_ACCOUNT_SECOND_BRAIN_OS`.
    *   Paste the **entire content** of the downloaded JSON file as the value.
    *   Add the other environment variables as secrets too (so the build can use them):
        *   `NEXT_PUBLIC_FIREBASE_API_KEY`
        *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
        *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
        *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
        *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
        *   `NEXT_PUBLIC_FIREBASE_APP_ID`
        *   `GEMINI_API_KEY`

3.  **Push to Main**:
    *   Commit and push your changes to the `main` branch.
    *   The workflow will automatically run, build, and deploy your app.

## 4. Manual Deployment (Optional)

If you have `firebase-tools` installed:
```bash
npx firebase login
npx firebase deploy
```
