import { Navigate } from "react-router-dom";
import { R } from "@/lib/routes";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

type Status = "loading" | "admin" | "unauthorized";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || !user.email) {
        setStatus("unauthorized");
        return;
      }
      try {
        const q = query(
          collection(db, "admins"),
          where("email", "==", user.email.toLowerCase())
        );
        const snap = await getDocs(q);
        setStatus(snap.empty ? "unauthorized" : "admin");
      } catch {
        setStatus("unauthorized");
      }
    });

    return () => unsubscribe();
  }, []);

  if (status === "loading")
    return <div className="p-6 text-center">Verifying admin access...</div>;

  if (status === "unauthorized") return <Navigate to={R.LOGIN} replace />;

  return children;
}
