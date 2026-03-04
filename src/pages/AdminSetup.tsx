import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { R } from "@/lib/routes";

export default function AdminSetup() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [alreadySetup, setAlreadySetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Check if any admins already exist — if so, block this page
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "admins"));
        if (!snap.empty) setAlreadySetup(true);
      } catch {
        // allow setup if check fails
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      await updateProfile(user, { displayName: formData.name });

      await addDoc(collection(db, "admins"), {
        email: formData.email.toLowerCase(),
        name: formData.name,
        addedAt: serverTimestamp(),
        addedBy: "setup",
      });

      navigate(R.ADMIN);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Use it to log in as admin, then add yourself as admin from the admin panel.");
      } else {
        setError(err.message || "Setup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="p-6 text-center">Checking setup status...</div>;
  }

  if (alreadySetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin already configured</h1>
          <p className="text-muted-foreground mb-6">
            An admin account has already been created. Please log in with your
            admin credentials.
          </p>
          <Button asChild>
            <Link to={R.LOGIN}>Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to={R.HOME} className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg gradient-hero flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">MarketFlow</span>
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Admin Setup</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Create the first admin account. This page is only available once.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Admin Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-11"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-11 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className="h-11"
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Creating admin account..." : "Create Admin Account"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link to={R.LOGIN} className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-8">
        <motion.div
          className="text-center text-primary-foreground"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="h-24 w-24 rounded-2xl bg-primary-foreground/20 mx-auto mb-6 flex items-center justify-center">
            <ShieldCheck className="h-12 w-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Secure Admin Access</h2>
          <p className="text-primary-foreground/80 max-w-sm">
            Set up your admin account to manage clients, campaigns, and team
            members.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
