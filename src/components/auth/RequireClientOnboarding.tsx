import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { R } from "@/lib/routes";

type GateState = "loading" | "allow" | "onboarding" | "login";

/**
 * For client-area routes: sends users to onboarding until `clients/{uid}.onboardingCompleted`.
 * Skips the check when the user is an admin (same email lookup as Login).
 */
export default function RequireClientOnboarding({ children }: { children: JSX.Element }) {
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) {
        setState("login");
        return;
      }
      const email = user.email.toLowerCase().trim();
      try {
        const adminSnap = await getDocs(
          query(collection(db, "admins"), where("email", "==", email))
        );
        if (!adminSnap.empty) {
          setState("allow");
          return;
        }
        const clientSnap = await getDoc(doc(db, "clients", user.uid));
        const done =
          clientSnap.exists() && clientSnap.data()?.onboardingCompleted === true;
        setState(done ? "allow" : "onboarding");
      } catch {
        setState("onboarding");
      }
    });
    return () => unsub();
  }, []);

  if (state === "loading") {
    return (
      <div className="p-6 text-center text-muted-foreground text-sm">Loading your workspace…</div>
    );
  }
  if (state === "login") return <Navigate to={R.LOGIN} replace />;
  if (state === "onboarding") return <Navigate to={R.ONBOARDING} replace />;
  return children;
}
