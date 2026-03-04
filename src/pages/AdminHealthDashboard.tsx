import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, TrendingUp, TrendingDown, Activity, Heart, Users, AlertCircle, CheckCircle2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, getDocs, collectionGroup, query, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { calculateHealthScore } from '@/lib/client-health';
import { adminClientPath } from '@/lib/routes';

// Helper function to calculate client health from client data
function calculateClientHealth(params: {
  client: Client;
  tasks: Task[];
  reports: Report[];
}): ReturnType<typeof calculateHealthScore> & { level: 'critical' | 'low' | 'medium' | 'high' | 'excellent'; factors: string[] } {
  const totalTasks = params.tasks.length;
  const completedTasks = params.tasks.filter(t => t.status === 'done').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;
  
  const reportCount = params.reports.length;
  const reportFrequency = reportCount > 0 ? Math.min(100, reportCount * 20) : 0;
  
  const lastUpdate = params.client.updatedAt?.seconds;
  const now = Date.now() / 1000;
  const daysSinceUpdate = lastUpdate ? (now - lastUpdate) / (24 * 60 * 60) : 30;
  const responseTime = Math.max(0, 100 - (daysSinceUpdate * 5));
  
  const engagementLevel = params.client.onboardingCompleted ? 80 : 40;
  
  const score = calculateHealthScore({
    engagementLevel,
    taskCompletionRate,
    reportSubmissionFrequency: reportFrequency,
    responseTime,
  });
  
  // Map level to our format
  const levelMap: Record<string, 'critical' | 'low' | 'medium' | 'high' | 'excellent'> = {
    'at-risk': 'critical',
    'poor': 'low',
    'fair': 'medium',
    'good': 'high',
    'excellent': 'excellent',
  };
  
  return {
    ...score,
    level: levelMap[score.level] || 'medium',
    factors: score.factors,
  };
}
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Client {
  id: string;
  email?: string;
  businessName?: string;
  projectStatus?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
  budget?: string;
  industry?: string;
  tags?: string[];
}

interface Task {
  clientId: string;
  status: string;
  createdAt?: { seconds: number };
}

interface Report {
  clientId: string;
  createdAt?: { seconds: number };
}

export default function AdminHealthDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)));
    });

    getDocs(collection(db, 'tasks')).then(snap => {
      setTasks(snap.docs.map(d => ({ clientId: d.data().clientId || '', ...d.data() } as Task)));
    });

    getDocs(collectionGroup(db, 'reports')).then(snap => {
      setReports(snap.docs.map(d => ({
        clientId: d.ref.parent.parent?.id || '',
        ...d.data(),
      } as Report)));
    });

    return () => unsub1();
  }, []);

  // Calculate health scores for all clients
  const healthScores = useMemo(() => {
    const scores = new Map<string, ReturnType<typeof calculateClientHealth>>();
    
    clients.forEach(client => {
      const clientTasks = tasks.filter(t => t.clientId === client.id);
      const clientReports = reports.filter(r => r.clientId === client.id);
      
      const score = calculateClientHealth({
        client,
        tasks: clientTasks,
        reports: clientReports,
      });
      
      scores.set(client.id, score);
    });
    
    return scores;
  }, [clients, tasks, reports]);

  // Get at-risk clients
  const atRiskClients = useMemo(() => {
    return clients.filter(client => {
      const score = healthScores.get(client.id);
      return score && (score.score < 50 || score.level === 'critical' || score.level === 'low');
    });
  }, [clients, healthScores]);

  // Get healthy clients
  const healthyClients = useMemo(() => {
    return clients.filter(client => {
      const score = healthScores.get(client.id);
      return score && score.score >= 70 && score.level === 'excellent';
    });
  }, [clients, healthScores]);

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Filter by risk level
    if (filterRisk !== 'all') {
      filtered = filtered.filter(client => {
        const score = healthScores.get(client.id);
        if (!score) return false;
        
        switch (filterRisk) {
          case 'critical':
            return score.level === 'critical';
          case 'low':
            return score.level === 'low';
          case 'medium':
            return score.level === 'medium';
          case 'high':
            return score.level === 'high';
          case 'excellent':
            return score.level === 'excellent';
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const scoreA = healthScores.get(a.id)?.score || 0;
      const scoreB = healthScores.get(b.id)?.score || 0;
      
      if (sortBy === 'score') {
        return scoreB - scoreA;
      } else {
        return (a.businessName || a.email || '').localeCompare(b.businessName || b.email || '');
      }
    });

    return filtered;
  }, [clients, healthScores, filterRisk, sortBy]);

  // Health score trends (simplified - in real app, track historical scores)
  const healthTrends = useMemo(() => {
    const levels = ['critical', 'low', 'medium', 'high', 'excellent'];
    return levels.map(level => ({
      level,
      count: Array.from(healthScores.values()).filter(s => s.level === level).length,
    }));
  }, [healthScores]);

  const getHealthScoreColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-destructive/10 text-destructive',
      low: 'bg-warning/10 text-warning',
      medium: 'bg-secondary/10 text-secondary-foreground',
      high: 'bg-primary/10 text-primary',
      excellent: 'bg-success/10 text-success',
    };
    return colors[level] || colors.medium;
  };

  const getHealthIcon = (level: string) => {
    switch (level) {
      case 'critical':
      case 'low':
        return AlertTriangle;
      case 'medium':
        return Activity;
      case 'high':
      case 'excellent':
        return CheckCircle2;
      default:
        return Heart;
    }
  };

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Client Health Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor client engagement and identify at-risk clients
          </p>
        </motion.div>

        {/* Health Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">At-Risk Clients</p>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold text-destructive">{atRiskClients.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Score &lt; 50
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Healthy Clients</p>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">{healthyClients.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Score ≥ 70
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Avg Health Score</p>
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">
                {clients.length > 0
                  ? Math.round(Array.from(healthScores.values()).reduce((sum, s) => sum + s.score, 0) / clients.length)
                  : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Out of 100
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Total Clients</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Monitored
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Health Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Health Score Distribution</CardTitle>
            <CardDescription>Client health levels across all clients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={healthTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Health Score</SelectItem>
                  <SelectItem value="name">Client Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Clients Alert */}
        {atRiskClients.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle className="text-base text-destructive">
                  At-Risk Clients Requiring Attention
                </CardTitle>
              </div>
              <CardDescription>
                {atRiskClients.length} client{atRiskClients.length !== 1 ? 's' : ''} with health scores below 50
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {atRiskClients.slice(0, 5).map(client => {
                  const score = healthScores.get(client.id);
                  if (!score) return null;
                  return (
                    <div key={client.id} className="flex items-center justify-between p-2 bg-background rounded">
                      <div className="flex items-center gap-3">
                        <Link
                          to={adminClientPath(client.id)}
                          className="font-medium hover:underline"
                        >
                          {client.businessName || client.email || client.id}
                        </Link>
                        <Badge className={getHealthScoreColor(score.level)}>
                          {score.score}/100
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {score.factors.slice(0, 2).join(', ')}
                      </div>
                    </div>
                  );
                })}
                {atRiskClients.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{atRiskClients.length - 5} more at-risk clients
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Health Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Clients Health Scores</CardTitle>
            <CardDescription>
              {filteredClients.length} of {clients.length} clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Health Score</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Key Factors</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map(client => {
                    const score = healthScores.get(client.id);
                    if (!score) return null;
                    const HealthIcon = getHealthIcon(score.level);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <Link
                            to={adminClientPath(client.id)}
                            className="hover:underline"
                          >
                            {client.businessName || client.email || client.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <HealthIcon className={`h-4 w-4 ${getHealthScoreColor(score.level).split(' ')[1]}`} />
                            <span className="font-semibold">{score.score}/100</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getHealthScoreColor(score.level)}>
                            {score.level.charAt(0).toUpperCase() + score.level.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-xs truncate">
                            {score.factors.slice(0, 2).join(', ')}
                            {score.factors.length > 2 && ` +${score.factors.length - 2} more`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={adminClientPath(client.id)}>
                              View Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

