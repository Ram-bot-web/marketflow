/**
 * Cloud Functions for MarketFlow (optional). Deploying requires Firebase Blaze (pay-as-you-go).
 * Until then: use client-side admin bootstrap in AdminSetup/Login + firestore.rules self-create clause.
 * When upgrading: add `"functions": { "source": "functions" }` to firebase.json and run
 * `firebase deploy --only functions` after switching the project to Blaze.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({ region: "us-central1" });

/**
 * Lets the SPA know whether /admin/setup may create the first admin (no Firestore reads from the client).
 */
exports.getAdminBootstrapStatus = onCall({ invoker: "public" }, async () => {
  const snap = await admin.firestore().collection("admins").limit(1).get();
  return { firstAdminAllowed: snap.empty };
});

/**
 * Creates admins/{uid} only when the admins collection is still empty (first admin).
 */
exports.bootstrapFirstAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const name = request.data && typeof request.data.name === "string" ? request.data.name.trim() : "";
  if (name.length < 1 || name.length > 200) {
    throw new HttpsError("invalid-argument", "Name is required (max 200 characters).");
  }

  const existing = await admin.firestore().collection("admins").limit(1).get();
  if (!existing.empty) {
    throw new HttpsError("failed-precondition", "An admin account already exists.");
  }

  const email = (request.auth.token.email || "").toLowerCase();
  if (!email) {
    throw new HttpsError("failed-precondition", "Your account has no email; cannot create admin profile.");
  }

  const uid = request.auth.uid;
  await admin.firestore().collection("admins").doc(uid).set(
    {
      email,
      name,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: "setup",
    },
    { merge: true }
  );

  return { ok: true };
});

/**
 * Copies legacy admins/{randomId} into admins/{uid} when email matches (Admin SDK bypasses rules).
 */
exports.linkAdminUid = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const email = (request.auth.token.email || "").toLowerCase();
  if (!email) {
    throw new HttpsError("failed-precondition", "Your account has no email.");
  }
  const uid = request.auth.uid;
  const ref = admin.firestore().collection("admins").doc(uid);
  const atUid = await ref.get();
  if (atUid.exists) {
    return { ok: true, alreadyLinked: true };
  }

  const snap = await admin.firestore().collection("admins").where("email", "==", email).get();
  if (snap.empty) {
    throw new HttpsError("not-found", "No admin record for this email.");
  }

  const legacy = snap.docs.find((d) => d.id !== uid) || snap.docs[0];
  if (legacy.id === uid) {
    return { ok: true, alreadyLinked: true };
  }

  const row = legacy.data() || {};
  await ref.set(
    {
      email,
      name: typeof row.name === "string" ? row.name : "",
      addedAt: row.addedAt || admin.firestore.FieldValue.serverTimestamp(),
      addedBy: typeof row.addedBy === "string" ? row.addedBy : "migrated-login",
      mergedFromLegacyId: legacy.id,
    },
    { merge: true }
  );

  return { ok: true, linked: true };
});
