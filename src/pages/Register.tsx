import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// 🔥 Firebase
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from '@/lib/firebase';
import { logActivity } from '@/lib/activityLogger';
import { validateEmail, validatePassword, validateBusinessName, sanitizeString } from '@/lib/validation';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS, formatResetTime } from '@/lib/rateLimiter';
import { R } from '@/lib/routes';

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: number } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    businessName: '',
  });

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setValidationErrors({});

  // Validate inputs
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.isValid) {
    setValidationErrors(prev => ({ ...prev, email: emailValidation.error || '' }));
    return;
  }

  const passwordValidation = validatePassword(formData.password);
  if (!passwordValidation.isValid) {
    setValidationErrors(prev => ({ ...prev, password: passwordValidation.error || '' }));
    return;
  }

  const businessNameValidation = validateBusinessName(formData.businessName);
  if (!businessNameValidation.isValid) {
    setValidationErrors(prev => ({ ...prev, businessName: businessNameValidation.error || '' }));
    return;
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey(null, 'register', formData.email);
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.REGISTER);
  
  if (!rateLimit.allowed) {
    setError(`Too many registration attempts. Please try again in ${formatResetTime(rateLimit.resetTime)}.`);
    setRateLimitInfo({ remaining: 0, resetTime: rateLimit.resetTime });
    return;
  }

  setRateLimitInfo({ remaining: rateLimit.remaining, resetTime: rateLimit.resetTime });
  setLoading(true);

  try {
    // Sanitize inputs
    const sanitizedEmail = sanitizeString(formData.email).toLowerCase().trim();
    const sanitizedFullName = sanitizeString(formData.fullName);
    const sanitizedBusinessName = sanitizeString(formData.businessName);

    // 1️⃣ Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      sanitizedEmail,
      formData.password
    );

    const user = userCredential.user;

    // 2️⃣ Update display name in Firebase Auth
    await updateProfile(user, {
      displayName: sanitizedFullName,
    });

    // 3️⃣ Save extra user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      fullName: sanitizedFullName,
      email: sanitizedEmail,
      businessName: sanitizedBusinessName,
      createdAt: new Date(),
    });

    // Log activity
    await logActivity({
      type: 'registration',
      title: `New user registered: ${sanitizedBusinessName || sanitizedFullName}`,
      subtitle: `Email: ${sanitizedEmail}`,
      clientId: user.uid,
      metadata: { email: sanitizedEmail, businessName: sanitizedBusinessName },
    });

    console.log("User registered and saved to Firestore ✅");

    // 4️⃣ Go to onboarding
    navigate(R.ONBOARDING);

  } catch (error: any) {
    console.error("Registration Error:", error.message);
    
    if (error.code === "auth/email-already-in-use") {
      setError("This email is already registered. Please use a different email or try logging in.");
    } else if (error.code === "auth/weak-password") {
      setError("Password is too weak. Please use a stronger password.");
    } else if (error.code === "auth/invalid-email") {
      setError("Invalid email address. Please check and try again.");
    } else {
      setError(error.message || "Registration failed. Please try again.");
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
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
          <h2 className="text-2xl xl:text-3xl font-bold mb-4">Start Growing Today</h2>
          <p className="text-primary-foreground/80 max-w-sm text-sm xl:text-base">
            Join hundreds of businesses already using MarketFlow to transform their marketing.
          </p>
        </motion.div>
      </div>

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

          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
            Get started with your free marketing dashboard
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {rateLimitInfo && rateLimitInfo.remaining < 3 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {rateLimitInfo.remaining} registration attempt{rateLimitInfo.remaining !== 1 ? 's' : ''} remaining
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  setFormData({ ...formData, fullName: e.target.value });
                  if (validationErrors.fullName) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.fullName;
                      return newErrors;
                    });
                  }
                }}
                required
              />
              {validationErrors.fullName && (
                <p className="text-sm text-destructive mt-1">{validationErrors.fullName}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (validationErrors.email) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.email;
                      return newErrors;
                    });
                  }
                }}
                required
              />
              {validationErrors.email && (
                <p className="text-sm text-destructive mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (validationErrors.password) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.password;
                        return newErrors;
                      });
                    }
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to={R.LOGIN} className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
