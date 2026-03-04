import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { adminClientPath } from '@/lib/routes';
import { collection, onSnapshot } from 'firebase/firestore';

interface Client {
  id: string;
  email?: string;
  businessName?: string;
  website?: string;
  industry?: string;
  description?: string;
  goals?: string[];
  budget?: string;
  audienceAge?: string;
  audienceLocation?: string;
  audienceInterests?: string;
  currentMarketing?: string;
  competitors?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number };
}

const ONBOARDING_STEPS = [
  { key: 'businessName', label: 'Business Name'      },
  { key: 'industry',     label: 'Industry'           },
  { key: 'description',  label: 'Business Description'},
  { key: 'goals',        label: 'Marketing Goals'    },
  { key: 'budget',       label: 'Budget Selected'    },
  { key: 'audienceAge',  label: 'Target Audience'    },
  { key: 'currentMarketing', label: 'Current Marketing' },
  { key: 'competitors',  label: 'Competitors'        },
];

function calcProgress(client: Client) {
  const filled = ONBOARDING_STEPS.filter(s => {
    const val = (client as Record<string, unknown>)[s.key];
    return Array.isArray(val) ? val.length > 0 : Boolean(val);
  }).length;
  return Math.round((filled / ONBOARDING_STEPS.length) * 100);
}

function formatDate(ts?: { seconds: number }) {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

export default function AdminOnboarding() {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), snap =>
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))
    );
    return () => unsub();
  }, []);

  const pending   = clients.filter(c => !c.onboardingCompleted);
  const completed = clients.filter(c =>  c.onboardingCompleted);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold">Onboarding Tracker</h1>
          <p className="text-muted-foreground">
            {pending.length} client{pending.length !== 1 ? 's' : ''} pending onboarding
          </p>
        </motion.div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Pending',   value: pending.length,   icon: Clock,          color: 'text-warning bg-warning/10'   },
            { label: 'Completed', value: completed.length,  icon: CheckCircle2,   color: 'text-success bg-success/10'   },
            { label: 'Total',     value: clients.length,   icon: AlertCircle,    color: 'text-primary bg-primary/10'   },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Clients */}
        {pending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Pending Onboarding
              </CardTitle>
              <CardDescription>Clients who have registered but haven't completed onboarding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pending.map((client, i) => {
                const progress = calcProgress(client);
                const stepsComplete = ONBOARDING_STEPS.filter(s => {
                  const val = (client as Record<string, unknown>)[s.key];
                  return Array.isArray(val) ? val.length > 0 : Boolean(val);
                });
                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-lg border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{client.businessName || '—'}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Joined {formatDate(client.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className="bg-warning/10 text-warning text-xs">{progress}% complete</Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={adminClientPath(client.id)}>
                            View <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <Progress value={progress} className="h-1.5" />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ONBOARDING_STEPS.map(step => {
                        const val = (client as Record<string, unknown>)[step.key];
                        const done = Array.isArray(val) ? val.length > 0 : Boolean(val);
                        return (
                          <div key={step.key} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md ${done ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'}`}>
                            {done
                              ? <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                              : <Clock className="h-3 w-3 flex-shrink-0" />
                            }
                            <span className="truncate">{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Completed Clients */}
        {completed.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Completed Onboarding
              </CardTitle>
              <CardDescription>Clients who have fully completed their onboarding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {completed.map(client => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="font-medium text-sm">{client.businessName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success/10 text-success text-xs">100%</Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={adminClientPath(client.id)}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {clients.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No clients registered yet.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
