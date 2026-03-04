# Quick Fix: Firebase Storage 404 Error

## The Problem
You're getting a **404 error** when trying to upload files. This means **Firebase Storage is not enabled** in your Firebase project.

## The Solution (2 minutes)

### Step 1: Enable Firebase Storage
1. Open: https://console.firebase.google.com/project/marketflow-cf7f1/storage
2. Click **"Get Started"** button
3. Choose **"Start in production mode"**
4. Select a **location** (choose the same region as your Firestore if possible)
5. Click **"Done"**

### Step 2: Set Security Rules
1. In the Storage page, click the **"Rules"** tab
2. Replace everything with this:

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

3. Click **"Publish"**

### Step 3: Test
1. Go back to your app
2. Refresh the page
3. Try uploading a file again

## That's It! ✅

If you still get errors after this, check:
- Browser console for specific error messages
- That you're logged in
- That the file is under 25MB
- That the file type is allowed (images or PDF)

## Need More Help?
See `FIREBASE_STORAGE_SETUP.md` for detailed troubleshooting.




