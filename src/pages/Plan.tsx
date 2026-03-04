import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Target, Clock, Loader2, Download, Printer, Share2, History } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, getDoc, orderBy } from 'firebase/firestore';

interface ClientDoc {
  marketingPlan?: string;
  marketingPlanUpdatedAt?: { seconds: number };
  businessName?: string;
}

interface PlanVersion {
  id: string;
  plan: string;
  updatedAt?: { seconds: number };
  updatedBy?: string;
}

export default function Plan() {
  const [plan,      setPlan]      = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<{ seconds: number } | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [loading,   setLoading]   = useState(true);
  const [versions,  setVersions]  = useState<PlanVersion[]>([]);
  const [viewMode,  setViewMode] = useState<'current' | 'history'>('current');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    const email = auth.currentUser?.email;
    if (!uid) { setLoading(false); return; }

    let isMounted = true;

    // Load initial data
    const loadPlan = async () => {
      try {
        // Try marketingPlans collection first - by UID
        let planQuery = query(collection(db, 'marketingPlans'), where('clientId', '==', uid));
        let planSnap = await getDocs(planQuery);
        
        // If not found by UID, try by email (fallback for data migration issues)
        if (planSnap.empty && email) {
          console.log('Plan not found by UID, trying email:', email);
          planQuery = query(collection(db, 'marketingPlans'), where('clientId', '==', email));
          planSnap = await getDocs(planQuery);
        }
        
        if (!planSnap.empty && isMounted) {
          const planData = planSnap.docs[0].data();
          console.log('Marketing plan found:', planData);
          setPlan(planData.plan ?? null);
          setUpdatedAt(planData.updatedAt ?? null);
          setUpdatedBy(planData.updatedBy || '');
          setLoading(false);
          
          // Load version history (simplified - in real app, store versions separately)
          // For now, we'll show the current version as the only version
          setVersions([{
            id: planSnap.docs[0].id,
            plan: planData.plan ?? '',
            updatedAt: planData.updatedAt ?? null,
            updatedBy: planData.updatedBy || '',
          }]);
          return;
        }
        
        console.log('No plan found in marketingPlans collection, checking clients collection');
        // Fallback to clients collection
        const clientSnap = await getDoc(doc(db, 'clients', uid));
        if (clientSnap.exists() && isMounted) {
          const data = clientSnap.data() as ClientDoc;
          console.log('Marketing plan from clients collection:', data.marketingPlan ? 'Found' : 'Not found');
          setPlan(data.marketingPlan ?? null);
          setUpdatedAt(data.marketingPlanUpdatedAt ?? null);
        } else {
          console.log('Client document not found for UID:', uid);
        }
      } catch (error) {
        console.error('Error loading plan:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPlan();
    
    // Listen to marketingPlans collection for real-time updates
    // Try UID first
    let planQuery1 = query(collection(db, 'marketingPlans'), where('clientId', '==', uid));
    const unsub1 = onSnapshot(
      planQuery1,
      (snap) => {
        if (!snap.empty && isMounted) {
          const planData = snap.docs[0].data();
          console.log('Real-time plan update (by UID):', planData);
          setPlan(planData.plan ?? null);
          setUpdatedAt(planData.updatedAt ?? null);
          setUpdatedBy(planData.updatedBy || '');
          
          // Update versions
          setVersions([{
            id: snap.docs[0].id,
            plan: planData.plan ?? '',
            updatedAt: planData.updatedAt ?? null,
            updatedBy: planData.updatedBy || '',
          }]);
        } else if (snap.empty && isMounted && email) {
          // If not found by UID, try email
          const planQuery2 = query(collection(db, 'marketingPlans'), where('clientId', '==', email));
          getDocs(planQuery2).then(emailSnap => {
            if (!emailSnap.empty && isMounted) {
              const planData = emailSnap.docs[0].data();
              console.log('Real-time plan update (by email):', planData);
              setPlan(planData.plan ?? null);
              setUpdatedAt(planData.updatedAt ?? null);
              setUpdatedBy(planData.updatedBy || '');
              
              setVersions([{
                id: emailSnap.docs[0].id,
                plan: planData.plan ?? '',
                updatedAt: planData.updatedAt ?? null,
                updatedBy: planData.updatedBy || '',
              }]);
            } else if (emailSnap.empty && isMounted) {
              // If plan deleted from marketingPlans, check clients collection
              getDoc(doc(db, 'clients', uid)).then(clientSnap => {
                if (clientSnap.exists() && isMounted) {
                  const data = clientSnap.data() as ClientDoc;
                  setPlan(data.marketingPlan ?? null);
                  setUpdatedAt(data.marketingPlanUpdatedAt ?? null);
                }
              });
            }
          });
        } else if (snap.empty && isMounted) {
          // If plan deleted from marketingPlans, check clients collection
          getDoc(doc(db, 'clients', uid)).then(clientSnap => {
            if (clientSnap.exists() && isMounted) {
              const data = clientSnap.data() as ClientDoc;
              setPlan(data.marketingPlan ?? null);
              setUpdatedAt(data.marketingPlanUpdatedAt ?? null);
            }
          });
        }
      },
      (error) => {
        console.error('Error in marketingPlans snapshot (UID):', error);
        // Try email as fallback
        if (email) {
          const planQuery2 = query(collection(db, 'marketingPlans'), where('clientId', '==', email));
          onSnapshot(planQuery2, (emailSnap) => {
            if (!emailSnap.empty && isMounted) {
              const planData = emailSnap.docs[0].data();
              setPlan(planData.plan ?? null);
              setUpdatedAt(planData.updatedAt ?? null);
              setUpdatedBy(planData.updatedBy || '');
            }
          });
        }
      }
    );
    
    // Also listen to clients collection for backward compatibility
    const unsub2 = onSnapshot(doc(db, 'clients', uid), (snap) => {
      if (snap.exists() && isMounted) {
        const data = snap.data() as ClientDoc;
        // Only use if marketingPlans collection doesn't have it
        getDocs(query(collection(db, 'marketingPlans'), where('clientId', '==', uid))).then(planSnap => {
          if (planSnap.empty && isMounted) {
            setPlan(data.marketingPlan ?? null);
            setUpdatedAt(data.marketingPlanUpdatedAt ?? null);
          }
        });
      }
    });
    
    return () => {
      isMounted = false;
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">Marketing Plan</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Your customized strategy and campaign roadmap</p>
        </motion.div>

        {/* Plan Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="shadow-card">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg gradient-hero flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">Your Marketing Plan</CardTitle>
                    {updatedAt?.seconds && (
                      <CardDescription className="text-xs sm:text-sm">
                        Last updated: {new Date(updatedAt.seconds * 1000).toLocaleString()}
                        {updatedBy && ` by ${updatedBy}`}
                      </CardDescription>
                    )}
                  </div>
                </div>
                {plan && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.print();
                      }}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // PDF export - in real app, use a library like jsPDF
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Marketing Plan</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 20px; }
                                  pre { white-space: pre-wrap; }
                                </style>
                              </head>
                              <body>
                                <h1>Marketing Plan</h1>
                                <pre>${plan}</pre>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: 'Marketing Plan',
                              text: 'View my marketing plan',
                              url: window.location.href,
                            });
                          } catch (error) {
                            // User cancelled
                          }
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : plan ? (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                  <TabsList>
                    <TabsTrigger value="current">Current Plan</TabsTrigger>
                    <TabsTrigger value="history">
                      <History className="h-4 w-4 mr-2" />
                      Version History
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="current" className="mt-4">
                    <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                      {plan}
                    </pre>
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-4">
                    {versions.length > 0 ? (
                      <div className="space-y-4">
                        {versions.map((version, idx) => (
                          <Card key={version.id} className={idx === 0 ? 'border-primary' : ''}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-sm">
                                    Version {versions.length - idx}
                                    {idx === 0 && (
                                      <Badge className="ml-2">Current</Badge>
                                    )}
                                  </CardTitle>
                                  {version.updatedAt?.seconds && (
                                    <CardDescription className="text-xs">
                                      Updated: {new Date(version.updatedAt.seconds * 1000).toLocaleString()}
                                      {version.updatedBy && ` by ${version.updatedBy}`}
                                    </CardDescription>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <pre className="whitespace-pre-wrap text-xs text-foreground font-sans leading-relaxed max-h-96 overflow-y-auto">
                                {version.plan}
                              </pre>
                            </CardContent>
                          </Card>
                        ))}
                        <p className="text-xs text-muted-foreground text-center">
                          Note: Full version history tracking coming soon
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No version history available
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <EmptyState
                  icon={<Clock className="h-8 w-8 text-muted-foreground" />}
                  title="Your marketing plan is being prepared"
                  description="Our team is crafting a customized strategy based on your onboarding answers. Your full marketing plan will appear here once it's ready."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
