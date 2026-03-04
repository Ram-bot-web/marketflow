import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

// 🔥 Firebase
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect } from 'react';
import { logActivity } from '@/lib/activityLogger';
import { R } from '@/lib/routes';

const steps = [
  { id: 1, title: 'Business Info', description: 'Tell us about your business' },
  { id: 2, title: 'Goals', description: 'What do you want to achieve?' },
  { id: 3, title: 'Budget', description: 'Your marketing investment' },
  { id: 4, title: 'Target Audience', description: 'Who are your customers?' },
  { id: 5, title: 'Current Status', description: 'Your marketing situation' },
];

const goals = [
  'Increase brand awareness',
  'Generate more leads',
  'Boost online sales',
  'Grow social media following',
  'Improve customer retention',
  'Launch new product/service',
];

const budgetOptions = [
  { value: 'starter', label: '₹500 - ₹1,000/month', description: 'Great for small businesses' },
  { value: 'growth', label: '₹1,000 - ₹3,000/month', description: 'Ideal for growing companies' },
  { value: 'scale', label: '₹3,000 - ₹5,000/month', description: 'For aggressive growth' },
  { value: 'enterprise', label: '₹5,000+/month', description: 'Full-scale marketing' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    businessName: '',
    website: '',
    industry: '',
    description: '',
    goals: [] as string[],
    budget: '',
    targetAge: '',
    targetLocation: '',
    targetInterests: '',
    currentMarketing: '',
    competitors: '',
  });

  const progress = (currentStep / steps.length) * 100;

  useEffect(() => {
    const fetchClientData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, "clients", user.uid);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        setFormData({
          businessName: data.businessName || '',
          website: data.website || '',
          industry: data.industry || '',
          description: data.description || '',
          goals: data.goals || [],
          budget: data.budget || '',
          targetAge: data.audienceAge || '',
          targetLocation: data.audienceLocation || '',
          targetInterests: data.audienceInterests || '',
          currentMarketing: data.currentMarketing || '',
          competitors: data.competitors || '',
        });
      }
    };

    fetchClientData();
  }, []);


  const handleNext = async () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      await saveOnboardingData();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goal)
        ? prev.goals.filter(g => g !== goal)
        : [...prev.goals, goal],
    }));
  };

  // 🔥 SAVE TO FIRESTORE
  const saveOnboardingData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user) {
        alert("You must be logged in.");
        return;
      }

      const clientRef = doc(db, "clients", user.uid);

      await setDoc(clientRef, {
        uid: user.uid,
        email: user.email,

        businessName: formData.businessName,
        website: formData.website,
        industry: formData.industry,
        description: formData.description,
        goals: formData.goals,
        budget: formData.budget,

        audienceAge: formData.targetAge,
        audienceLocation: formData.targetLocation,
        audienceInterests: formData.targetInterests,

        currentMarketing: formData.currentMarketing,
        competitors: formData.competitors,
        status: "onboarding",
        projectStatus: "Strategy",
        onboardingCompleted: true,

        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true }); // 🔥 THIS enables update instead of overwrite

      // Log activity
      await logActivity({
        type: 'onboarding_completed',
        title: `${formData.businessName || user.email} completed onboarding`,
        subtitle: `Industry: ${formData.industry || 'N/A'}, Budget: ${formData.budget || 'N/A'}`,
        clientId: user.uid,
        metadata: { businessName: formData.businessName, industry: formData.industry },
      });

      // Auto-assign onboarding tasks
      try {
        const { autoAssignOnboardingTasks } = await import('@/lib/automation');
        const clientData = {
          id: user.uid,
          email: user.email || '',
          businessName: formData.businessName,
          onboardingCompleted: true,
        };
        await autoAssignOnboardingTasks(user.uid, clientData);
      } catch (error) {
        console.error('Error auto-assigning onboarding tasks:', error);
        // Don't block navigation if automation fails
      }

      navigate(R.DASHBOARD);

    } catch (error) {
      console.error("Error saving onboarding:", error);
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-foreground">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {steps[currentStep - 1].title}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center flex-shrink-0"
            >
              <div className={`
                h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors
                ${currentStep > step.id ? 'bg-success text-success-foreground' : ''}
                ${currentStep === step.id ? 'bg-primary text-primary-foreground' : ''}
                ${currentStep < step.id ? 'bg-secondary text-muted-foreground' : ''}
              `}>
                {currentStep > step.id ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-6 sm:w-12 md:w-20 h-0.5 mx-1 sm:mx-2 ${currentStep > step.id ? 'bg-success' : 'bg-secondary'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">{steps[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{steps[currentStep - 1].description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                {/* Step 1: Business Info */}
                {currentStep === 1 && (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="businessName" className="text-sm">Business Name</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="Your Company Inc."
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="website" className="text-sm">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://yourcompany.com"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="industry" className="text-sm">Industry</Label>
                      <Input
                        id="industry"
                        value={formData.industry}
                        onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                        placeholder="e.g., E-commerce, Healthcare, SaaS"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="description" className="text-sm">Brief Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Tell us what your business does..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Step 2: Goals */}
                {currentStep === 2 && (
                  <div className="space-y-2 sm:space-y-3">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">Select all that apply</p>
                    {goals.map((goal) => (
                      <div
                        key={goal}
                        className="flex items-center space-x-2.5 sm:space-x-3 p-2.5 sm:p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => toggleGoal(goal)}
                      >
                        <Checkbox
                          checked={formData.goals.includes(goal)}
                          onCheckedChange={() => toggleGoal(goal)}
                        />
                        <span className="text-sm sm:text-base text-foreground">{goal}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Step 3: Budget */}
                {currentStep === 3 && (
                  <RadioGroup
                    value={formData.budget}
                    onValueChange={(value) => setFormData({ ...formData, budget: value })}
                    className="space-y-2 sm:space-y-3"
                  >
                    {budgetOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-2.5 sm:space-x-3 p-3 sm:p-4 rounded-lg border transition-colors cursor-pointer ${formData.budget === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-secondary/50'
                          }`}
                        onClick={() => setFormData({ ...formData, budget: option.value })}
                      >
                        <RadioGroupItem value={option.value} />
                        <div>
                          <p className="font-medium text-sm sm:text-base text-foreground">{option.label}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {/* Step 4: Target Audience */}
                {currentStep === 4 && (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="targetAge" className="text-sm">Target Age Range</Label>
                      <Input
                        id="targetAge"
                        value={formData.targetAge}
                        onChange={(e) => setFormData({ ...formData, targetAge: e.target.value })}
                        placeholder="e.g., 25-45 years old"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="targetLocation" className="text-sm">Target Location</Label>
                      <Input
                        id="targetLocation"
                        value={formData.targetLocation}
                        onChange={(e) => setFormData({ ...formData, targetLocation: e.target.value })}
                        placeholder="e.g., United States, California"
                        className="h-10 sm:h-11"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="targetInterests" className="text-sm">Interests & Behaviors</Label>
                      <Textarea
                        id="targetInterests"
                        value={formData.targetInterests}
                        onChange={(e) => setFormData({ ...formData, targetInterests: e.target.value })}
                        placeholder="Describe your ideal customer's interests, hobbies, and behaviors..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Step 5: Current Status */}
                {currentStep === 5 && (
                  <>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="currentMarketing" className="text-sm">Current Marketing Activities</Label>
                      <Textarea
                        id="currentMarketing"
                        value={formData.currentMarketing}
                        onChange={(e) => setFormData({ ...formData, currentMarketing: e.target.value })}
                        placeholder="What marketing are you currently doing? (social media, ads, email, etc.)"
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="competitors" className="text-sm">Main Competitors</Label>
                      <Textarea
                        id="competitors"
                        value={formData.competitors}
                        onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                        placeholder="List your main competitors and what you admire about their marketing..."
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-4 sm:mt-6 gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex-1 sm:flex-none h-10 sm:h-11"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1 sm:flex-none h-10 sm:h-11">
            {currentStep === steps.length ? 'Complete' : 'Next'}
            {currentStep < steps.length && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
