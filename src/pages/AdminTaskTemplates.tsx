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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Copy, Trash2, CheckSquare } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: Array<{
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    category?: string;
  }>;
  category?: string;
  createdAt?: { seconds: number };
}

export default function AdminTaskTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: string;
    tasks: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }>;
  }>({
    name: '',
    description: '',
    category: '',
    tasks: [{ title: '', description: '', priority: 'medium' }],
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'taskTemplates'), orderBy('createdAt', 'desc')),
      snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskTemplate)))
    );
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || form.tasks.length === 0 || form.tasks.some(t => !t.title.trim())) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await addDoc(collection(db, 'taskTemplates'), {
        name: form.name,
        description: form.description,
        category: form.category,
        tasks: form.tasks.filter(t => t.title.trim()),
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success', description: 'Task template created' });
      setForm({ name: '', description: '', category: '', tasks: [{ title: '', description: '', priority: 'medium' }] });
      setOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteDoc(doc(db, 'taskTemplates', id));
      toast({ title: 'Success', description: 'Template deleted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Task Templates</h1>
              <p className="text-muted-foreground">Create reusable task templates</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Task Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Onboarding Tasks"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Template description"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="e.g., Onboarding, Marketing, etc."
                    />
                  </div>
                  <div>
                    <Label>Tasks *</Label>
                    <div className="space-y-3">
                      {form.tasks.map((task, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <Input
                              placeholder="Task title *"
                              value={task.title}
                              onChange={(e) => {
                                const newTasks = [...form.tasks];
                                newTasks[index].title = e.target.value;
                                setForm({ ...form, tasks: newTasks });
                              }}
                            />
                            <Textarea
                              placeholder="Task description"
                              value={task.description}
                              onChange={(e) => {
                                const newTasks = [...form.tasks];
                                newTasks[index].description = e.target.value;
                                setForm({ ...form, tasks: newTasks });
                              }}
                            />
                            <Select
                              value={task.priority}
                              onValueChange={(value: 'high' | 'medium' | 'low') => {
                                const newTasks = [...form.tasks];
                                newTasks[index].priority = value;
                                setForm({ ...form, tasks: newTasks });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low Priority</SelectItem>
                                <SelectItem value="medium">Medium Priority</SelectItem>
                                <SelectItem value="high">High Priority</SelectItem>
                              </SelectContent>
                            </Select>
                            {form.tasks.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setForm({ ...form, tasks: form.tasks.filter((_, i) => i !== index) });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setForm({ ...form, tasks: [...form.tasks, { title: '', description: '', priority: 'medium' }] });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="outline" className="mt-1">{template.category}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {template.tasks.slice(0, 3).map((task, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                    {template.tasks.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.tasks.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first task template to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}



