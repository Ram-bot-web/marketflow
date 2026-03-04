import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Package, Plus, Trash2, Users, Loader2, Pencil } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features: string[];
  isActive: boolean;
}
interface Client { id: string; budget?: string; }

const DEFAULT_PLANS = [
  { name: 'Starter',    price: 1000, description: 'Great for small businesses just getting started', features: ['Instagram Ads', 'Facebook Ads', 'Monthly Report', 'Email Support'] },
  { name: 'Growth',     price: 2500, description: 'Ideal for growing businesses ready to scale', features: ['All Starter Features', 'Google Ads', 'A/B Testing', 'Bi-weekly Calls'] },
  { name: 'Scale',      price: 5000, description: 'For aggressive growth and market domination', features: ['All Growth Features', 'TikTok Ads', 'LinkedIn Ads', 'Dedicated Manager'] },
  { name: 'Enterprise', price: 8000, description: 'Full-scale marketing with unlimited support', features: ['All Scale Features', 'Custom Strategy', 'Weekly Calls', 'Priority Support'] },
];

export default function AdminPlanManager() {
  const { toast }                     = useToast();
  const [plans,   setPlans]           = useState<Plan[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [open,    setOpen]            = useState(false);
  const [editing, setEditing]         = useState<Plan | null>(null);
  const [saving,  setSaving]          = useState(false);
  const [featuresText, setFeaturesText] = useState('');
  const [form, setForm] = useState({ name: '', price: '', description: '', isActive: true });

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'plans'), orderBy('price', 'asc')),
      snap => setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as Plan))));
    const u2 = onSnapshot(collection(db, 'clients'),
      snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))));
    return () => { u1(); u2(); };
  }, []);

  // Seed default plans if empty
  useEffect(() => {
    if (plans.length === 0) {
      // Will auto-seed once component loads and plans are confirmed empty
    }
  }, [plans]);

  const seedDefaults = async () => {
    for (const p of DEFAULT_PLANS) {
      await addDoc(collection(db, 'plans'), { ...p, isActive: true, createdAt: serverTimestamp() });
    }
    toast({ title: 'Default plans created' });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', price: '', description: '', isActive: true });
    setFeaturesText('');
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({ name: plan.name, price: String(plan.price), description: plan.description || '', isActive: plan.isActive });
    setFeaturesText(plan.features.join('\n'));
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const features = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
    const data = { name: form.name, price: parseFloat(form.price) || 0, description: form.description, features, isActive: form.isActive };
    try {
      if (editing) {
        await updateDoc(doc(db, 'plans', editing.id), data);
        toast({ title: 'Plan updated' });
      } else {
        await addDoc(collection(db, 'plans'), { ...data, createdAt: serverTimestamp() });
        toast({ title: 'Plan created' });
      }
      setOpen(false);
    } catch {
      toast({ title: 'Error', description: 'Failed to save plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    await deleteDoc(doc(db, 'plans', id));
    toast({ title: 'Plan deleted' });
  };

  const clientsOnPlan = (planName: string) =>
    clients.filter(c => c.budget?.toLowerCase() === planName.toLowerCase()).length;

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" /> Plan Manager</h1>
            <p className="text-muted-foreground">Manage subscription plans and pricing</p>
          </div>
          <div className="flex gap-2">
            {plans.length === 0 && (
              <Button variant="outline" onClick={seedDefaults}>Seed Default Plans</Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New Plan</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? 'Edit Plan' : 'Create Plan'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Plan Name</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Growth" required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Monthly Price (₹)</Label>
                      <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Features (one per line)</Label>
                    <Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={"Instagram Ads\nFacebook Ads\nMonthly Report"} rows={5} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {saving ? 'Saving…' : editing ? 'Update Plan' : 'Create Plan'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No plans created yet. Start with the defaults or create your own.</p>
              <Button onClick={seedDefaults}>Seed Default Plans</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className={`h-full flex flex-col ${!plan.isActive ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <p className="text-2xl font-bold mt-1">₹{plan.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <Badge className={plan.isActive ? 'bg-success/10 text-success text-xs' : 'bg-muted text-muted-foreground text-xs'}>
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {plan.description && <CardDescription className="text-xs mt-1">{plan.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{clientsOnPlan(plan.name)} client{clientsOnPlan(plan.name) !== 1 ? 's' : ''}</span>
                    </div>
                    <ul className="space-y-1 flex-1">
                      {plan.features.map(f => (
                        <li key={f} className="text-xs flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => deletePlan(plan.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
