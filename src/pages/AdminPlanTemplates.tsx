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
import { Plus, Copy, Trash2, BookOpen, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface PlanTemplate {
  id: string;
  name: string;
  description?: string;
  plan: string;
  category?: string;
  createdAt?: { seconds: number };
}

export default function AdminPlanTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: string;
    plan: string;
  }>({
    name: '',
    description: '',
    category: '',
    plan: '',
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'planTemplates'), orderBy('createdAt', 'desc')),
      snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanTemplate)))
    );
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.plan.trim()) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await addDoc(collection(db, 'planTemplates'), {
        name: form.name,
        description: form.description,
        category: form.category,
        plan: form.plan,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success', description: 'Plan template created' });
      setForm({ name: '', description: '', category: '', plan: '' });
      setOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteDoc(doc(db, 'planTemplates', id));
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
              <h1 className="text-2xl font-bold">Plan Templates</h1>
              <p className="text-muted-foreground">Create reusable marketing plan templates</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Plan Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., E-commerce Marketing Plan"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Template description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="e.g., E-commerce, SaaS, Local Business, etc."
                    />
                  </div>
                  <div>
                    <Label>Plan Content *</Label>
                    <Textarea
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                      placeholder="Enter the marketing plan content..."
                      rows={15}
                      className="font-mono text-sm"
                    />
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
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.plan.substring(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {template.plan.length} characters
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(template.plan);
                        toast({ title: 'Copied', description: 'Plan content copied to clipboard' });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {templates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first plan template to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}



