import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DollarSign, Plus, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';
import { auth } from '@/lib/firebase';

interface Invoice {
  id: string;
  clientName: string;
  clientEmail?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  month: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt?: { seconds: number };
}
interface Client { id: string; email?: string; businessName?: string; }

const STATUS_CONFIG = {
  pending: { color: 'bg-warning/10 text-warning',     icon: Clock,         label: 'Pending'  },
  paid:    { color: 'bg-success/10 text-success',     icon: CheckCircle2,  label: 'Paid'     },
  overdue: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle, label: 'Overdue' },
};

export default function AdminBilling() {
  const { toast }                       = useToast();
  const [invoices,  setInvoices]        = useState<Invoice[]>([]);
  const [clients,   setClients]         = useState<Client[]>([]);
  const [open,      setOpen]            = useState(false);
  const [saving,    setSaving]          = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ clientName: '', clientEmail: '', amount: '', status: 'pending', month: '', dueDate: '', notes: '' });

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')),
      snap => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))));
    const u2 = onSnapshot(collection(db, 'clients'),
      snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client))));
    return () => { u1(); u2(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'invoices'), {
        ...form,
        amount:    parseFloat(form.amount) || 0,
        createdAt: serverTimestamp(),
      });
      
      // Find client ID if possible
      const client = clients.find(c => c.businessName === form.clientName || c.email === form.clientEmail);
      
      // Log activity
      await logActivity({
        type: 'invoice_created',
        title: `Invoice created for ${form.clientName}`,
        subtitle: `Amount: ₹${parseFloat(form.amount) || 0}, Month: ${form.month || 'N/A'}`,
        clientId: client?.id || '',
        metadata: { amount: parseFloat(form.amount) || 0, month: form.month },
      });
      
      setForm({ clientName: '', clientEmail: '', amount: '', status: 'pending', month: '', dueDate: '', notes: '' });
      setOpen(false);
      toast({ title: 'Invoice created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create invoice.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    await updateDoc(doc(db, 'invoices', id), { status: 'paid', paidDate: new Date().toLocaleDateString() });
    
    // Log activity
    if (invoice) {
      const client = clients.find(c => c.businessName === invoice.clientName || c.email === invoice.clientEmail);
      await logActivity({
        type: 'invoice_paid',
        title: `Invoice paid: ${invoice.clientName}`,
        subtitle: `Amount: ₹${invoice.amount}, Month: ${invoice.month || 'N/A'}`,
        clientId: client?.id || '',
        metadata: { invoiceId: id, amount: invoice.amount },
      });
    }
    
    toast({ title: 'Marked as paid' });
  };
  const markOverdue = async (id: string) => {
    await updateDoc(doc(db, 'invoices', id), { status: 'overdue' });
    toast({ title: 'Marked as overdue' });
  };

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(i => i.status === filterStatus);

  const totalPaid    = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-muted-foreground">Track invoices and payments</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Invoice</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Client Name</Label>
                    <Select onValueChange={v => {
                      const c = clients.find(cl => cl.id === v);
                      setForm({ ...form, clientName: c?.businessName || '', clientEmail: c?.email || '' });
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.businessName || c.email}</SelectItem>)}
                        <SelectItem value="__manual">Enter manually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Amount (₹)</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Client Name (manual)</Label>
                  <Input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Business name" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Month</Label>
                    <Input value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} placeholder="e.g. Feb 2025" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {saving ? 'Creating…' : 'Create Invoice'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Collected',  value: `₹${totalPaid.toLocaleString()}`,    color: 'text-success bg-success/10',         icon: CheckCircle2 },
            { label: 'Pending',    value: `₹${totalPending.toLocaleString()}`,  color: 'text-warning bg-warning/10',         icon: Clock },
            { label: 'Overdue',    value: `₹${totalOverdue.toLocaleString()}`,  color: 'text-destructive bg-destructive/10', icon: AlertCircle },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoices</CardTitle>
            <div className="flex gap-2 mt-2">
              {['all', 'pending', 'paid', 'overdue'].map(s => (
                <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm" onClick={() => setFilterStatus(s)} className="capitalize h-7 text-xs">
                  {s}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(inv => {
                  const cfg  = STATUS_CONFIG[inv.status];
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{inv.clientName}</p>
                        <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                      </TableCell>
                      <TableCell className="text-sm">{inv.month}</TableCell>
                      <TableCell className="text-right font-medium">₹{inv.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inv.dueDate || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {inv.status !== 'paid'    && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(inv.id)}>Mark Paid</Button>}
                          {inv.status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => markOverdue(inv.id)}>Overdue</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground text-sm">No invoices found.</p>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
