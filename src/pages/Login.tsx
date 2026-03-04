import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { validateEmail, sanitizeString } from '@/lib/validation';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, formatResetTime } from '@/lib/rateLimiter';
import { R } from '@/lib/routes';


export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'Invalid email address');
      setLoading(false);
      return;
    }

    // Rate limiting
    const sanitizedEmail = sanitizeString(formData.email).toLowerCase().trim();
    const rateLimitKey = getRateLimitKey(null, 'login', sanitizedEmail);
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.LOGIN);
    
    if (!rateLimit.allowed) {
      setError(`Too many login attempts. Please try again in ${formatResetTime(rateLimit.resetTime)}.`);
      setLoading(false);
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, sanitizedEmail, formData.password);

      // Check if this user is an admin
      const adminQ = query(
        collection(db, "admins"),
        where("email", "==", user.email?.toLowerCase())
      );
      const adminSnap = await getDocs(adminQ);
      if (!adminSnap.empty) {
        navigate(R.ADMIN);
        return;
      }

      // Client: check if onboarding is complete
      const clientDoc = await getDoc(doc(db, "clients", user.uid));
      const onboardingCompleted = clientDoc.exists() && clientDoc.data()?.onboardingCompleted === true;
      navigate(onboardingCompleted ? R.DASHBOARD : R.ONBOARDING);

    } catch (err: any) {
      console.error("Login Error:", err.message);

      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


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
          <Link to={R.HOME} className="flex items-center gap-2 mb-6 sm:mb-8">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg gradient-hero flex items-center justify-center">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground">MarketFlow</span>
          </Link>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
            Sign in to access your marketing dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-10 sm:h-11"
                required
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="h-10 sm:h-11 pr-10"
                  required
                />
                {error && (
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10 sm:h-11" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-5 sm:mt-6">
            Don't have an account?{' '}
            <Link to={R.REGISTER} className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </p>

        </motion.div>
      </div>

      {/* Right side - Decorative (hidden on mobile/tablet) */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-8">
        <motion.div
          className="text-center text-primary-foreground"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="h-20 w-20 xl:h-24 xl:w-24 rounded-2xl bg-primary-foreground/20 mx-auto mb-6 flex items-center justify-center animate-float">
            <Zap className="h-10 w-10 xl:h-12 xl:w-12" />
          </div>
          <h2 className="text-2xl xl:text-3xl font-bold mb-4">Your Marketing Hub</h2>
          <p className="text-primary-foreground/80 max-w-sm text-sm xl:text-base">
            Track campaigns, view results, and manage your marketing assets all in one place.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
