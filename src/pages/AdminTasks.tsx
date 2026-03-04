import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { CheckSquare, Plus, Trash2, Circle, Loader2, Copy, FileText } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/activityLogger';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  createdAt?: { seconds: number };
  createdBy?: string;
  clientId?: string;
  week?: string;
  category?: string;
}

interface Client {
  id: string;
  email?: string;
  businessName?: string;
}

interface WeeklyPlan {
  id: string;
  clientId: string;
  weeks: Array<{
    weekNumber: number;
    weekLabel: string;
    tasks: string[];
  }>;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
}

const PRIORITY_COLORS = {
  high:   'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low:    'bg-secondary text-muted-foreground',
};
const STATUS_COLS: { key: Task['status']; label: string }[] = [
  { key: 'todo',        label: 'To Do'       },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done',        label: 'Done'        },
];

export default function AdminTasks() {
  const { toast } = useToast();
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [clients,   setClients]  = useState<Client[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [open,     setOpen]     = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState<{ 
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
    clientId: string;
    week: string;
  }>({ 
    title: '', 
    description: '', 
    priority: 'medium', 
    dueDate: '',
    clientId: '',
    week: ''
  });

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)))
    );
    const unsub2 = onSnapshot(
      collection(db, 'clients'),
      snap => setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))
    );
    const unsub3 = onSnapshot(
      collection(db, 'weeklyPlans'),
      snap => setWeeklyPlans(snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyPlan)))
    );
    const unsub4 = onSnapshot(
      collection(db, 'taskTemplates'),
      snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!form.clientId) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        title:       form.title.trim(),
        description: form.description.trim(),
        priority:    form.priority,
        status:      'todo',
        dueDate:     form.dueDate || null,
        clientId:    form.clientId,
        week:        form.week || null,
        createdAt:   serverTimestamp(),
        createdBy:   auth.currentUser?.email || 'admin',
      });
      
      // Log activity
      await logActivity({
        type: 'task_created',
        title: `Task created: ${form.title.trim()}`,
        subtitle: `Priority: ${form.priority}, Created by ${auth.currentUser?.email || 'admin'}`,
        clientId: form.clientId,
        metadata: { priority: form.priority, dueDate: form.dueDate, week: form.week },
      });
      
      setForm({ title: '', description: '', priority: 'medium', dueDate: '', clientId: '', week: '' });
      setOpen(false);
      toast({ title: 'Task created' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Create tasks from weekly plan
  const createTasksFromWeeklyPlan = async (clientId: string, weeklyPlan: WeeklyPlan) => {
    if (!weeklyPlan.weeks || weeklyPlan.weeks.length === 0) {
      toast({ title: 'Error', description: 'Weekly plan has no tasks.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let createdCount = 0;
      
      for (const week of weeklyPlan.weeks) {
        for (const taskTitle of week.tasks) {
          if (!taskTitle.trim()) continue;
          
          // Check if task already exists
          const existingTask = tasks.find(
            t => t.clientId === clientId && 
            t.title === taskTitle.trim() && 
            t.week === week.weekLabel
          );
          
          if (!existingTask) {
            await addDoc(collection(db, 'tasks'), {
              title: taskTitle.trim(),
              priority: 'medium',
              status: 'todo',
              clientId: clientId,
              week: week.weekLabel,
              createdAt: serverTimestamp(),
              createdBy: auth.currentUser?.email || 'admin',
            });
            createdCount++;
          }
        }
      }

      if (createdCount > 0) {
        await logActivity({
          type: 'task_created',
          title: `${createdCount} task${createdCount > 1 ? 's' : ''} created from weekly plan`,
          subtitle: `Client: ${clients.find(c => c.id === clientId)?.businessName || clientId}`,
          clientId: clientId,
          metadata: { taskCount: createdCount, fromWeeklyPlan: true },
        });
        toast({ title: 'Success', description: `${createdCount} task${createdCount > 1 ? 's' : ''} created from weekly plan.` });
      } else {
        toast({ title: 'Info', description: 'All tasks from weekly plan already exist.' });
      }
    } catch (error) {
      console.error('Error creating tasks from weekly plan:', error);
      toast({ title: 'Error', description: 'Failed to create tasks from weekly plan.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const moveStatus = async (task: Task, status: Task['status']) => {
    await updateDoc(doc(db, 'tasks', task.id), { status });
    
    // Log activity when task is completed
    if (status === 'done') {
      await logActivity({
        type: 'task_completed',
        title: `Task completed: ${task.title}`,
        subtitle: `Completed by ${auth.currentUser?.email || 'admin'}`,
        clientId: task.clientId || '',
        metadata: { taskId: task.id },
      });
      toast({ title: 'Task completed', description: `"${task.title}" marked as done.` });
    }
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
    toast({ title: 'Task deleted' });
  };

  // Filter tasks by selected client
  const filteredTasks = useMemo(() => {
    if (selectedClientId === 'all') return tasks;
    return tasks.filter(t => t.clientId === selectedClientId);
  }, [tasks, selectedClientId]);

  const byStatus = (s: Task['status']) => filteredTasks.filter(t => t.status === s);

  // Get client name helper
  const getClientName = (clientId?: string) => {
    if (!clientId) return 'No Client';
    const client = clients.find(c => c.id === clientId);
    return client?.businessName || client?.email || 'Unknown Client';
  };

  // Get weekly plan for selected client
  const clientWeeklyPlan = useMemo(() => {
    if (selectedClientId === 'all') return null;
    return weeklyPlans.find(wp => wp.clientId === selectedClientId);
  }, [weeklyPlans, selectedClientId]);

  // Update form clientId when dialog opens
  useEffect(() => {
    if (open && selectedClientId !== 'all') {
      setForm(prev => ({ ...prev, clientId: selectedClientId }));
    }
  }, [open, selectedClientId]);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Task Manager</h1>
              <p className="text-muted-foreground">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} 
                {selectedClientId !== 'all' ? ` for ${getClientName(selectedClientId)}` : ' (all clients)'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.businessName || client.email || client.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Client *</Label>
                  <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })} required>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.businessName || client.email || client.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Week (Optional)</Label>
                  <Select value={form.week || undefined} onValueChange={v => setForm({ ...form, week: v })}>
                    <SelectTrigger><SelectValue placeholder="Select week (optional)" /></SelectTrigger>
                    <SelectContent>
                      {clientWeeklyPlan?.weeks.map(week => (
                        <SelectItem key={week.weekNumber} value={week.weekLabel}>
                          {week.weekLabel}
                        </SelectItem>
                      ))}
                      {!clientWeeklyPlan && selectedClientId !== 'all' && (
                        <SelectItem value="Week 1">Week 1</SelectItem>
                      )}
                      {(!clientWeeklyPlan || clientWeeklyPlan.weeks.length === 0) && selectedClientId === 'all' && (
                        <SelectItem value="Week 1">Week 1</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional details..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as 'high' | 'medium' | 'low' })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {saving ? 'Creating…' : 'Create Task'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
            </div>
          </div>
          {clientWeeklyPlan && selectedClientId !== 'all' && (
            <div className="mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => createTasksFromWeeklyPlan(selectedClientId, clientWeeklyPlan)}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Tasks from Weekly Plan
              </Button>
            </div>
          )}
        </motion.div>

        {/* Kanban columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLS.map(col => (
            <div key={col.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm">{col.label}</h2>
                <Badge variant="secondary" className="text-xs">{byStatus(col.key).length}</Badge>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {byStatus(col.key).map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={task.status === 'done' ? 'opacity-60' : ''}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                            {task.clientId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Client: {getClientName(task.clientId)}
                              </p>
                            )}
                            {task.week && (
                              <p className="text-xs text-muted-foreground">{task.week}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground leading-snug">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>
                          )}
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1 pt-1">
                          {STATUS_COLS.filter(c => c.key !== col.key).map(c => (
                            <Button
                              key={c.key} variant="outline" size="sm"
                              className="h-6 text-xs flex-1"
                              onClick={() => moveStatus(task, c.key)}
                            >
                              <Circle className="h-2.5 w-2.5 mr-1" />
                              {c.label}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {byStatus(col.key).length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
