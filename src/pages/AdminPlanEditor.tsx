import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BookOpen, ArrowLeft, Save, ChevronRight, Loader2, Calendar } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, onSnapshot, doc, getDoc, updateDoc, setDoc, serverTimestamp, query, where, getDocs, addDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';
import { R } from '@/lib/routes';

interface Client {
  id: string;
  email?: string;
  businessName?: string;
  onboardingCompleted?: boolean;
  marketingPlan?: string;
  marketingPlanUpdatedAt?: { seconds: number };
  marketingPlanUpdatedBy?: string;
}

// ── List view (/admin/plan-editor) ──────────────────────────────────────────
function PlanEditorList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [plansMap, setPlansMap] = useState<Record<string, { plan: string; updatedAt?: { seconds: number } }>>({});

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'clients'), snap =>
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))
    );
    // Load marketing plans from dedicated collection
    const unsub2 = onSnapshot(collection(db, 'marketingPlans'), snap => {
      const map: Record<string, { plan: string; updatedAt?: { seconds: number } }> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[data.clientId] = {
          plan: data.plan || '',
          updatedAt: data.updatedAt,
        };
      });
      setPlansMap(map);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const withPlan    = clients.filter(c => c.marketingPlan || plansMap[c.id]?.plan);
  const withoutPlan = clients.filter(c => !c.marketingPlan && !plansMap[c.id]?.plan);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Marketing Plan Editor
          </h1>
          <p className="text-muted-foreground">Create and update marketing plans for each client</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{withPlan.length}</p><p className="text-xs text-muted-foreground">Plans Created</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-2xl font-bold">{withoutPlan.length}</p><p className="text-xs text-muted-foreground">Plans Pending</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Clients</CardTitle>
            <CardDescription>Click "Edit Plan" to open the plan editor for a client</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{c.businessName || '—'}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell>
                      {(c.marketingPlan || plansMap[c.id]?.plan)
                        ? <Badge className="bg-success/10 text-success text-xs">Plan Created</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">No Plan Yet</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.marketingPlanUpdatedAt?.seconds
                        ? new Date(c.marketingPlanUpdatedAt.seconds * 1000).toLocaleDateString()
                        : plansMap[c.id]?.updatedAt?.seconds
                        ? new Date(plansMap[c.id].updatedAt.seconds * 1000).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`${R.ADMIN_PLAN_EDITOR}/${c.id}`}>
                          Edit Plan <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {clients.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">No clients registered yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ── Editor view (/admin/plan-editor/:clientId) ───────────────────────────────
function PlanEditorDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate     = useNavigate();
  const { toast }    = useToast();

  const [client,  setClient]  = useState<Client | null>(null);
  const [plan,    setPlan]    = useState('');
  const [weeklyPlan, setWeeklyPlan] = useState<Array<{ weekNumber: number; weekLabel: string; tasks: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [activeTab, setActiveTab] = useState('plan');

  useEffect(() => {
    if (!clientId) return;
    (async () => {
      const clientSnap = await getDoc(doc(db, 'clients', clientId));
      if (clientSnap.exists()) {
        const data = { id: clientSnap.id, ...clientSnap.data() } as Client;
        setClient(data);
        
        // Try to load from marketingPlans collection first, fallback to clients collection
        const planQuery = query(collection(db, 'marketingPlans'), where('clientId', '==', clientId));
        const planSnap = await getDocs(planQuery);
        if (!planSnap.empty) {
          const planData = planSnap.docs[0].data();
          setPlan(planData.plan || '');
        } else {
          // Fallback to clients collection
          setPlan(data.marketingPlan || '');
        }

        // Load weekly plan
        const weeklyPlanQuery = query(collection(db, 'weeklyPlans'), where('clientId', '==', clientId));
        const weeklyPlanSnap = await getDocs(weeklyPlanQuery);
        if (!weeklyPlanSnap.empty) {
          const weeklyPlanData = weeklyPlanSnap.docs[0].data();
          setWeeklyPlan(weeklyPlanData.weeks || []);
        } else {
          // Initialize with default weeks if no plan exists
          setWeeklyPlan([
            { weekNumber: 1, weekLabel: 'Week 1', tasks: [] },
            { weekNumber: 2, weekLabel: 'Week 2', tasks: [] },
            { weekNumber: 3, weekLabel: 'Week 3', tasks: [] },
            { weekNumber: 4, weekLabel: 'Week 4', tasks: [] },
          ]);
        }
      }
      setLoading(false);
    })();
  }, [clientId]);

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      // Save to dedicated marketingPlans collection
      const planQuery = query(collection(db, 'marketingPlans'), where('clientId', '==', clientId));
      const planSnap = await getDocs(planQuery);
      
      if (!planSnap.empty) {
        // Update existing plan
        await updateDoc(planSnap.docs[0].ref, {
          plan: plan,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || 'admin',
        });
      } else {
        // Create new plan document
        await setDoc(doc(collection(db, 'marketingPlans')), {
          clientId: clientId,
          plan: plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || 'admin',
        });
      }
      
      // Also update clients collection for backward compatibility
      await updateDoc(doc(db, 'clients', clientId), {
        marketingPlan: plan,
        marketingPlanUpdatedAt: serverTimestamp(),
        marketingPlanUpdatedBy: auth.currentUser?.email || 'admin',
      });
      
      // Log activity
      await logActivity({
        type: 'plan_updated',
        title: `Marketing plan updated for ${client?.businessName || client?.email || 'client'}`,
        subtitle: `Plan edited by ${auth.currentUser?.email || 'admin'}`,
        clientId: clientId,
      });
      
      toast({ title: 'Plan saved', description: 'Marketing plan updated successfully.' });
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({ title: 'Error', description: 'Failed to save plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeeklyPlan = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      // Save weekly plan
      const weeklyPlanQuery = query(collection(db, 'weeklyPlans'), where('clientId', '==', clientId));
      const weeklyPlanSnap = await getDocs(weeklyPlanQuery);
      
      if (!weeklyPlanSnap.empty) {
        // Update existing weekly plan
        await updateDoc(weeklyPlanSnap.docs[0].ref, {
          weeks: weeklyPlan,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || 'admin',
        });
      } else {
        // Create new weekly plan
        await addDoc(collection(db, 'weeklyPlans'), {
          clientId: clientId,
          weeks: weeklyPlan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || 'admin',
        });
      }
      
      // Log activity
      await logActivity({
        type: 'plan_updated',
        title: `Weekly plan updated for ${client?.businessName || client?.email || 'client'}`,
        subtitle: `Weekly plan edited by ${auth.currentUser?.email || 'admin'}`,
        clientId: clientId,
      });

      // Auto-generate tasks from weekly plan
      try {
        const { autoGenerateTasksFromWeeklyPlan } = await import('@/lib/automation');
        const weeklyPlanData = {
          id: weeklyPlanSnap.empty ? 'new' : weeklyPlanSnap.docs[0].id,
          clientId: clientId,
          weeks: weeklyPlan,
        };
        const result = await autoGenerateTasksFromWeeklyPlan(clientId, weeklyPlanData);
        if (result.created > 0) {
          toast({ 
            title: 'Weekly plan saved', 
            description: `Weekly plan updated and ${result.created} task${result.created > 1 ? 's' : ''} auto-generated.` 
          });
        } else {
          toast({ title: 'Weekly plan saved', description: 'Weekly plan updated successfully.' });
        }
      } catch (error) {
        console.error('Error auto-generating tasks:', error);
        toast({ title: 'Weekly plan saved', description: 'Weekly plan updated successfully.' });
      }
    } catch (error) {
      console.error('Error saving weekly plan:', error);
      toast({ title: 'Error', description: 'Failed to save weekly plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addWeek = () => {
    const nextWeekNumber = weeklyPlan.length > 0 
      ? Math.max(...weeklyPlan.map(w => w.weekNumber)) + 1 
      : 1;
    setWeeklyPlan([...weeklyPlan, { weekNumber: nextWeekNumber, weekLabel: `Week ${nextWeekNumber}`, tasks: [] }]);
  };

  const removeWeek = (index: number) => {
    setWeeklyPlan(weeklyPlan.filter((_, i) => i !== index));
  };

  const addTask = (weekIndex: number) => {
    const updated = [...weeklyPlan];
    updated[weekIndex].tasks.push('');
    setWeeklyPlan(updated);
  };

  const updateTask = (weekIndex: number, taskIndex: number, value: string) => {
    const updated = [...weeklyPlan];
    updated[weekIndex].tasks[taskIndex] = value;
    setWeeklyPlan(updated);
  };

  const removeTask = (weekIndex: number, taskIndex: number) => {
    const updated = [...weeklyPlan];
    updated[weekIndex].tasks = updated[weekIndex].tasks.filter((_, i) => i !== taskIndex);
    setWeeklyPlan(updated);
  };

  if (loading) return <DashboardLayout isAdmin><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  if (!client)  return <DashboardLayout isAdmin><div className="text-center py-12"><p className="text-muted-foreground">Client not found.</p><Button asChild className="mt-4"><Link to={R.ADMIN_PLAN_EDITOR}>Back</Link></Button></div></DashboardLayout>;

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6 max-w-3xl">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to={R.ADMIN_PLAN_EDITOR} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> All Plans
          </Link>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{client.businessName || '—'}</h1>
              <p className="text-muted-foreground text-sm">{client.email} — Marketing Plan</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan">Marketing Plan</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Plan</TabsTrigger>
          </TabsList>
          
          <TabsContent value="plan" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Marketing Plan</CardTitle>
                <CardDescription>
                  This plan is visible to the client on their Marketing Plan page.
                  {client.marketingPlanUpdatedAt?.seconds && (
                    <span className="ml-2">Last updated: {new Date(client.marketingPlanUpdatedAt.seconds * 1000).toLocaleString()}</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  placeholder={`Write the marketing plan for ${client.businessName || 'this client'}...

Example:
## Strategy Overview
...

## Week 1
- Audience research
- Content calendar setup

## Week 2
- Launch Instagram campaign
...`}
                  rows={20}
                  className="font-mono text-sm resize-y"
                />
                <p className="text-xs text-muted-foreground mt-2">{plan.length} characters</p>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Marketing Plan'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Plan
                    </CardTitle>
                    <CardDescription>
                      Create weekly tasks that will be visible to the client. Tasks can be created from this plan.
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addWeek} className="gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Add Week
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {weeklyPlan.map((week, weekIndex) => (
                  <Card key={weekIndex} className="border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Input
                            value={week.weekLabel}
                            onChange={(e) => {
                              const updated = [...weeklyPlan];
                              updated[weekIndex].weekLabel = e.target.value;
                              setWeeklyPlan(updated);
                            }}
                            className="w-32 font-semibold"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWeek(weekIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remove Week
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {week.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-center gap-2">
                          <Input
                            value={task}
                            onChange={(e) => updateTask(weekIndex, taskIndex, e.target.value)}
                            placeholder={`Task ${taskIndex + 1}`}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTask(weekIndex, taskIndex)}
                            className="text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTask(weekIndex)}
                        className="w-full"
                      >
                        + Add Task
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {weeklyPlan.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No weeks added yet. Click "Add Week" to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSaveWeeklyPlan} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Weekly Plan'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ── Route selector ───────────────────────────────────────────────────────────
export default function AdminPlanEditor() {
  const { clientId } = useParams<{ clientId?: string }>();
  return clientId ? <PlanEditorDetail /> : <PlanEditorList />;
}
