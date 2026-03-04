# Firebase Storage Setup Guide

## Issue: 404 Error on File Upload

If you're getting a 404 error when uploading files, you need to configure Firebase Storage properly.

## Step 1: Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `marketflow-cf7f1`
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started**
5. Choose **Start in production mode** (we'll add rules next)
6. Select a location for your storage bucket
7. Click **Done**

## Step 2: Set Storage Security Rules

1. In Firebase Console, go to **Storage** > **Rules**
2. Replace the default rules with the rules from `storage.rules` file:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /assets/{userId}/{category}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                   && request.auth.uid == userId
                   && request.resource.size < 25 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*|application/pdf');
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish**

## Step 3: Configure CORS (if needed)

If you still get CORS errors, you may need to configure CORS for your storage bucket:

1. Install Google Cloud SDK (if not already installed)
2. Create a `cors.json` file:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

3. Run this command (replace with your bucket name):
```bash
gsutil cors set cors.json gs://marketflow-cf7f1.firebasestorage.app
```

## Step 4: Verify Storage Bucket Configuration

1. In Firebase Console, go to **Project Settings** > **General**
2. Scroll down to **Your apps** section
3. Verify the **Storage bucket** is: `marketflow-cf7f1.firebasestorage.app`
4. If different, update `src/lib/firebase.ts`:

```typescript
export const storage = getStorage(app, "gs://marketflow-cf7f1.firebasestorage.app");
```

## Alternative: Deploy Rules via Firebase CLI

If you have Firebase CLI installed:

1. Install Firebase CLI (if not installed):
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase (if not already):
```bash
firebase init storage
```

4. Deploy rules:
```bash
firebase deploy --only storage
```

## Troubleshooting

### Still getting 404?
- Verify the storage bucket exists in Firebase Console
- Check that Storage is enabled for your project
- Verify the bucket name matches in `firebase.ts`

### Getting CORS errors?
- Follow Step 3 to configure CORS
- Check browser console for specific CORS error messages
- Verify your domain is allowed in CORS config

### Getting permission errors?
- Check Storage security rules are published
- Verify user is authenticated (`auth.currentUser` is not null)
- Check that `userId` in path matches `auth.uid`

### Files not appearing?
- Check Firestore `assets` collection for metadata
- Verify download URL is saved correctly
- Check browser console for errors

## Testing

After setup, test the upload:
1. Go to `/assets` page
2. Click "Select Files" or drag & drop
3. Select an image file
4. Check browser console for any errors
5. Verify file appears in Firebase Storage console
6. Check Firestore `assets` collection for metadata




