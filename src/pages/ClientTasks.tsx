import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Circle, Clock, Calendar, Filter, MessageSquare, Plus } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';

interface TaskComment {
  id: string;
  text: string;
  author: string;
  createdAt: { seconds: number };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string;
  week?: string;
  createdAt?: { seconds: number };
  comments?: TaskComment[];
}

export default function ClientTasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      }
    );

    return () => unsub();
  }, []);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterWeek !== 'all') {
      filtered = filtered.filter(t => t.week === filterWeek);
    }

    return filtered;
  }, [tasks, filterStatus, filterWeek]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, todo, completionPercentage };
  }, [tasks]);

  const uniqueWeeks = useMemo(() => {
    const weeks = new Set<string>();
    tasks.forEach(t => {
      if (t.week) weeks.add(t.week);
    });
    return Array.from(weeks).sort();
  }, [tasks]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
      toast({ 
        title: 'Success', 
        description: `Task marked as ${newStatus === 'done' ? 'completed' : newStatus}` 
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update task', variant: 'destructive' });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;

    try {
      const user = auth.currentUser;
      const newComment = {
        id: Date.now().toString(),
        text: commentText.trim(),
        author: user?.displayName || user?.email || 'Client',
        createdAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'tasks', selectedTask), {
        comments: arrayUnion(newComment),
      });

      toast({ title: 'Success', description: 'Comment added' });
      setCommentText('');
      setCommentDialogOpen(false);
      setSelectedTask(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const openCommentDialog = (taskId: string) => {
    setSelectedTask(taskId);
    setCommentDialogOpen(true);
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done': return CheckSquare;
      case 'in_progress': return Clock;
      default: return Circle;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done': return 'bg-success/10 text-success';
      case 'in_progress': return 'bg-primary/10 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">My Tasks</h1>
              <p className="text-muted-foreground">View and manage your assigned tasks</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Tasks</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-success">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">In Progress</p>
              <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Completion</p>
              <p className="text-2xl font-bold">{stats.completionPercentage}%</p>
              <Progress value={stats.completionPercentage} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              {uniqueWeeks.length > 0 && (
                <Select value={filterWeek} onValueChange={setFilterWeek}>
                  <SelectTrigger className="w-[150px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Weeks</SelectItem>
                    {uniqueWeeks.map(week => (
                      <SelectItem key={week} value={week}>{week}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium">No tasks found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {filterStatus !== 'all' || filterWeek !== 'all'
                    ? 'Try adjusting your filters'
                    : 'You don\'t have any tasks assigned yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const StatusIcon = getStatusIcon(task.status);
              return (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => {
                          if (task.status === 'done') {
                            handleStatusChange(task.id, 'todo');
                          } else if (task.status === 'todo') {
                            handleStatusChange(task.id, 'in_progress');
                          } else {
                            handleStatusChange(task.id, 'done');
                          }
                        }}
                      >
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(task.status).split(' ')[1]}`} />
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {task.priority && (
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            )}
                            <Badge variant="outline" className={getStatusColor(task.status)}>
                              {task.status === 'done' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                            </Badge>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {task.week && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {task.week}
                            </span>
                          )}
                          {task.dueDate && (
                            <span>Due: {formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Comment Dialog */}
        <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Add a comment or note about this task..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setCommentDialogOpen(false);
                setCommentText('');
                setSelectedTask(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddComment} disabled={!commentText.trim()}>
                Add Comment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

