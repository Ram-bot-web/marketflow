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
import { Plus, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  fields: Array<{
    label: string;
    type: 'number' | 'text' | 'textarea';
    required: boolean;
  }>;
  category?: string;
  createdAt?: { seconds: number };
}

export default function AdminReportTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    description: string;
    category: string;
    fields: Array<{ label: string; type: 'number' | 'text' | 'textarea'; required: boolean }>;
  }>({
    name: '',
    description: '',
    category: '',
    fields: [{ label: '', type: 'number', required: true }],
  });

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'reportTemplates'), orderBy('createdAt', 'desc')),
      snap => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportTemplate)))
    );
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || form.fields.length === 0 || form.fields.some(f => !f.label.trim())) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await addDoc(collection(db, 'reportTemplates'), {
        name: form.name,
        description: form.description,
        category: form.category,
        fields: form.fields.filter(f => f.label.trim()),
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success', description: 'Report template created' });
      setForm({ 
        name: '', 
        description: '', 
        category: '', 
        fields: [{ label: '', type: 'number', required: true }] 
      });
      setOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteDoc(doc(db, 'reportTemplates', id));
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
              <h1 className="text-2xl font-bold">Report Templates</h1>
              <p className="text-muted-foreground">Create reusable report templates</p>
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
                  <DialogTitle>Create Report Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Monthly Performance Report"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
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
                      placeholder="e.g., Performance, Analytics, etc."
                    />
                  </div>
                  <div>
                    <Label>Report Fields *</Label>
                    <div className="space-y-3">
                      {form.fields.map((field, index) => (
                        <Card key={index} className="p-3">
                          <div className="space-y-2">
                            <Input
                              placeholder="Field label *"
                              value={field.label}
                              onChange={(e) => {
                                const newFields = [...form.fields];
                                newFields[index].label = e.target.value;
                                setForm({ ...form, fields: newFields });
                              }}
                            />
                            <div className="flex items-center gap-2">
                              <Select
                                value={field.type}
                                onValueChange={(value: 'number' | 'text' | 'textarea') => {
                                  const newFields = [...form.fields];
                                  newFields[index].type = value;
                                  setForm({ ...form, fields: newFields });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="textarea">Textarea</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newFields = [...form.fields];
                                  newFields[index].required = !newFields[index].required;
                                  setForm({ ...form, fields: newFields });
                                }}
                              >
                                {field.required ? 'Required' : 'Optional'}
                              </Button>
                              {form.fields.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setForm({ ...form, fields: form.fields.filter((_, i) => i !== index) });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setForm({ ...form, fields: [...form.fields, { label: '', type: 'number', required: true }] });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
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
                    {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1">
                    {template.fields.slice(0, 3).map((field, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{field.label}</span>
                        {field.required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>
                    ))}
                    {template.fields.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{template.fields.length - 3} more
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
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first report template to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}



