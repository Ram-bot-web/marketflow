import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, Building, Mail, DollarSign, FileText, Plus,
  ChevronDown, Globe, Target, MessageSquare, Loader2, Save,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  doc, getDoc, collection, onSnapshot, addDoc, updateDoc,
  query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';
import { R } from '@/lib/routes';

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientData {
  uid?: string;
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
  projectStatus?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number };
  tags?: string[];
}

interface Report {
  id: string;
  month: string;
  leads: number;
  adSpend: number;
  costPerLead: number;
  notes?: string;
  createdAt?: { seconds: number };
}

interface Note {
  id: string;
  text: string;
  createdBy: string;
  createdByName?: string;
  createdAt?: { seconds: number };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const budgetLabels: Record<string, string> = {
  starter:    '₹500 – ₹1,000/mo',
  growth:     '₹1,000 – ₹3,000/mo',
  scale:      '₹3,000 – ₹5,000/mo',
  enterprise: '₹5,000+/mo',
};

const statusColors: Record<string, string> = {
  onboarding: 'bg-warning/10 text-warning',
  planning:   'bg-primary/10 text-primary',
  active:     'bg-success/10 text-success',
  paused:     'bg-muted text-muted-foreground',
  completed:  'bg-secondary text-secondary-foreground',
};

const statusOptions = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'planning',   label: 'Planning'   },
  { value: 'active',     label: 'Active'      },
  { value: 'paused',     label: 'Paused'      },
  { value: 'completed',  label: 'Completed'   },
];

const statusToDoc: Record<string, { projectStatus: string; onboardingCompleted: boolean }> = {
  onboarding: { projectStatus: 'Strategy',  onboardingCompleted: false },
  planning:   { projectStatus: 'Planning',  onboardingCompleted: true  },
  active:     { projectStatus: 'Active',    onboardingCompleted: true  },
  paused:     { projectStatus: 'Paused',    onboardingCompleted: true  },
  completed:  { projectStatus: 'Completed', onboardingCompleted: true  },
};

function getDisplayStatus(data: ClientData): string {
  if (!data.onboardingCompleted) return 'onboarding';
  switch (data.projectStatus) {
    case 'Strategy':
    case 'Planning':  return 'planning';
    case 'Active':    return 'active';
    case 'Paused':    return 'paused';
    case 'Completed': return 'completed';
    default:          return 'planning';
  }
}

function formatTs(ts?: { seconds: number }) {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleString();
}

function formatDate(ts?: { seconds: number }) {
  if (!ts?.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminClientDetail() {
  const { id }      = useParams<{ id: string }>();
  const { toast }   = useToast();

  const [clientData,    setClientData]    = useState<ClientData | null>(null);
  const [displayName,   setDisplayName]   = useState('');
  const [loading,       setLoading]       = useState(true);
  const [reports,       setReports]       = useState<Report[]>([]);
  const [notes,         setNotes]         = useState<Note[]>([]);
  const [status,        setStatus]        = useState('onboarding');
  const [savingStatus,  setSavingStatus]  = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [newReport,    setNewReport]    = useState({ month: '', leads: '', adSpend: '', notes: '' });
  const [addingReport, setAddingReport] = useState(false);

  const [newNote,    setNewNote]    = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // ── Fetch client + realtime reports/notes ─────────────────────────────────

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    (async () => {
      try {
        const [clientSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'clients', id)),
          getDoc(doc(db, 'users',   id)),
        ]);

        if (!clientSnap.exists()) { setLoading(false); return; }

        const data = clientSnap.data() as ClientData;
        setClientData(data);
        setStatus(getDisplayStatus(data));

        const name = userSnap.data()?.fullName || data.email || 'Unknown Client';
        setDisplayName(name);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();

    // Real-time reports
    const rUnsub = onSnapshot(
      query(collection(db, 'clients', id, 'reports'), orderBy('createdAt', 'desc')),
      (snap) => setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)))
    );

    // Real-time notes
    const nUnsub = onSnapshot(
      query(collection(db, 'clients', id, 'notes'), orderBy('createdAt', 'desc')),
      (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note)))
    );

    return () => { rUnsub(); nUnsub(); };
  }, [id]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setSavingStatus(true);
    try {
      const mapping = statusToDoc[newStatus];
      await updateDoc(doc(db, 'clients', id), {
        projectStatus:       mapping.projectStatus,
        onboardingCompleted: mapping.onboardingCompleted,
        updatedAt:           serverTimestamp(),
      });
      
      // Log activity
      await logActivity({
        type: 'status_change',
        title: `Status changed to "${newStatus}"`,
        subtitle: `Client: ${clientData?.businessName || clientData?.email || id}, Updated by ${auth.currentUser?.email || 'admin'}`,
        clientId: id,
        metadata: { newStatus, projectStatus: mapping.projectStatus },
      });
      
      setStatus(newStatus);
      toast({ title: 'Status updated', description: `Client is now "${newStatus}".` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setAddingReport(true);
    try {
      const leads    = parseInt(newReport.leads)    || 0;
      const adSpend  = parseFloat(newReport.adSpend) || 0;
      await addDoc(collection(db, 'clients', id, 'reports'), {
        month:       newReport.month,
        leads,
        adSpend,
        costPerLead: leads > 0 ? adSpend / leads : 0,
        notes:       newReport.notes,
        createdAt:   serverTimestamp(),
      });
      
      // Log activity
      await logActivity({
        type: 'report',
        title: `Report added: ${newReport.month}`,
        subtitle: `Leads: ${leads}, Ad Spend: ₹${adSpend}, Client: ${clientData?.businessName || clientData?.email || id}`,
        clientId: id,
        metadata: { month: newReport.month, leads, adSpend },
      });
      
      setNewReport({ month: '', leads: '', adSpend: '', notes: '' });
      toast({ title: 'Report added', description: `Monthly report for ${newReport.month} saved.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save report.', variant: 'destructive' });
    } finally {
      setAddingReport(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await addDoc(collection(db, 'clients', id, 'notes'), {
        text:          newNote.trim(),
        createdAt:     serverTimestamp(),
        createdBy:     auth.currentUser?.email || 'admin',
        createdByName: auth.currentUser?.displayName || 'Admin',
      });
      setNewNote('');
    } catch {
      toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateTags = async (clientId: string, newTag: string) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const currentTags = clientData?.tags || [];
      
      let updatedTags: string[] = [];
      
      if (newTag.trim()) {
        // Add new tag or remove if exists
        if (currentTags.includes(newTag.trim())) {
          updatedTags = currentTags.filter(t => t !== newTag.trim());
        } else {
          updatedTags = [...currentTags, newTag.trim()];
        }
      } else {
        // Clear all tags
        updatedTags = [];
      }

      await updateDoc(clientRef, { tags: updatedTags });
      
      // Update local state
      setClientData(prev => prev ? { ...prev, tags: updatedTags } : null);
      
      toast({ 
        title: 'Success', 
        description: newTag.trim() 
          ? (currentTags.includes(newTag.trim()) ? 'Tag removed' : 'Tag added')
          : 'All tags removed'
      });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update tags',
        variant: 'destructive'
      });
    }
  };

  // ── Chart data (chronological) ─────────────────────────────────────────

  const chartData = [...reports].reverse().map(r => ({
    month:    r.month,
    leads:    r.leads,
    adSpend:  r.adSpend,
  }));

  // ── Loading / Not Found ────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout isAdmin>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!clientData) {
    return (
      <DashboardLayout isAdmin>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Client Not Found</h1>
          <Button asChild><Link to={R.ADMIN}>Back to Dashboard</Link></Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={R.ADMIN} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Clients
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground">{clientData.businessName}</p>
            </div>
            <Badge className={`${statusColors[status]} text-sm px-3 py-1 w-fit`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
        </motion.div>

        {/* Row 1: Client Info | Status Update */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Client Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Client Information</CardTitle>
                <CardDescription>Contact and account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: Mail,      label: 'Email',    value: clientData.email },
                  { icon: Building,  label: 'Business', value: clientData.businessName },
                  { icon: Globe,     label: 'Website',  value: clientData.website },
                  { icon: Target,    label: 'Industry', value: clientData.industry },
                  { icon: DollarSign,label: 'Budget',   value: clientData.budget ? budgetLabels[clientData.budget] : '—' },
                  { icon: FileText,  label: 'Joined',   value: formatDate(clientData.createdAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="font-medium text-sm truncate">{value || '—'}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Update */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Update Status</CardTitle>
                <CardDescription>Change the client's project status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {savingStatus && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </p>
                )}

                {/* Goals from onboarding */}
                {clientData.goals && clientData.goals.length > 0 && (
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Marketing Goals</p>
                    <div className="flex flex-wrap gap-1.5">
                      {clientData.goals.map(g => (
                        <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Onboarding Details (collapsible) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowOnboarding(!showOnboarding)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Onboarding Details</CardTitle>
                  <CardDescription>Submitted by the client during onboarding</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showOnboarding ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>

            {showOnboarding && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Description',          value: clientData.description },
                    { label: 'Target Age',            value: clientData.audienceAge },
                    { label: 'Target Location',       value: clientData.audienceLocation },
                    { label: 'Interests & Behaviors', value: clientData.audienceInterests },
                    { label: 'Current Marketing',     value: clientData.currentMarketing },
                    { label: 'Competitors',           value: clientData.competitors },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-lg bg-secondary/50 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="leading-snug">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </motion.div>

        {/* Performance Chart (only when reports exist) */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campaign Performance</CardTitle>
                <CardDescription>Leads generated vs ad spend over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: number, name: string) =>
                        name === 'adSpend' ? [`₹${val.toLocaleString()}`, 'Ad Spend'] : [val, 'Leads']
                      }
                    />
                    <Legend formatter={(val) => val === 'adSpend' ? 'Ad Spend (₹)' : 'Leads'} />
                    <Bar  yAxisId="left"  dataKey="leads"   name="leads"   fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" dataKey="adSpend" name="adSpend" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Row 3: Add Report | Internal Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Add Monthly Report */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Add Monthly Report</CardTitle>
                    <CardDescription>Record campaign results</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddReport} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 space-y-1.5">
                      <Label htmlFor="month" className="text-sm">Month</Label>
                      <Input
                        id="month"
                        placeholder="e.g., February 2025"
                        value={newReport.month}
                        onChange={(e) => setNewReport({ ...newReport, month: e.target.value })}
                        className="h-10"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="leads" className="text-sm">Leads</Label>
                      <Input
                        id="leads"
                        type="number"
                        placeholder="0"
                        value={newReport.leads}
                        onChange={(e) => setNewReport({ ...newReport, leads: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="adSpend" className="text-sm">Ad Spend (₹)</Label>
                      <Input
                        id="adSpend"
                        type="number"
                        placeholder="0"
                        value={newReport.adSpend}
                        onChange={(e) => setNewReport({ ...newReport, adSpend: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="repNotes" className="text-sm">Notes</Label>
                    <Textarea
                      id="repNotes"
                      placeholder="Campaign notes and recommendations..."
                      value={newReport.notes}
                      onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <Button type="submit" className="w-full h-10" disabled={addingReport}>
                    {addingReport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {addingReport ? 'Saving…' : 'Save Report'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Internal Notes */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="flex flex-col h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                    <CardDescription>Admin-only — not visible to client</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                {/* Add note form */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <Textarea
                    placeholder="Write a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    className="text-sm flex-1 resize-none"
                  />
                  <Button type="submit" size="icon" className="h-auto flex-shrink-0" disabled={addingNote || !newNote.trim()}>
                    {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </form>

                {/* Notes list */}
                <div className="space-y-3 overflow-y-auto max-h-64">
                  {notes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
                  )}
                  {notes.map(note => (
                    <div key={note.id} className="p-3 rounded-lg border border-border text-sm space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs text-primary">{note.createdByName || note.createdBy}</span>
                        <span className="text-xs text-muted-foreground">{formatTs(note.createdAt)}</span>
                      </div>
                      <p className="text-foreground leading-snug">{note.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Previous Reports */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Monthly Reports</CardTitle>
                  <CardDescription>{reports.length} report{reports.length !== 1 ? 's' : ''} on record</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No reports yet. Add the first monthly report above.
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="p-4 rounded-lg border border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <h4 className="font-semibold">{report.month}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="text-success font-medium">{report.leads} leads</span>
                          <span className="text-muted-foreground">₹{report.adSpend?.toLocaleString()} spend</span>
                          <span className="text-primary">₹{(report.costPerLead ?? 0).toFixed(2)} CPL</span>
                        </div>
                      </div>
                      {report.notes && (
                        <p className="text-sm text-muted-foreground">{report.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}
