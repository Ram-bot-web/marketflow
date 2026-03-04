import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, BarChart3, ArrowRight, CheckCircle, Clock, AlertCircle, 
  TrendingUp, TrendingDown, Activity, Loader2, DollarSign, Calendar, Circle, Target, Trophy
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SkeletonStats, SkeletonCard, SkeletonList } from '@/components/ui/skeleton-loader';
import { useEffect, useState, useMemo } from 'react';
import { auth, db } from '@/lib/firebase';
import { R } from '@/lib/routes';
import { 
  doc, onSnapshot, collection, query, where, orderBy
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const quickActions = [
  {
    title: 'Marketing Plan',
    description: 'View your strategy and weekly roadmap',
    icon: FileText,
    href: R.PLAN,
    color: 'bg-primary/10 text-primary',
  },
  {
    title: 'View Results',
    description: 'Check your campaign performance',
    icon: BarChart3,
    href: R.RESULTS,
    color: 'bg-success/10 text-success',
  },
];

interface ClientData {
  businessName?: string;
  onboardingCompleted?: boolean;
  projectStatus?: string;
  status?: string;
}

interface Report {
  id: string;
  month: string;
  leads: number;
  adSpend: number;
  createdAt?: { seconds: number };
}


interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  ts: number;
}

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  week?: string;
  clientId?: string;
}

interface WeeklyPlan {
  id: string;
  clientId: string;
  weeks: Array<{
    weekNumber: number;
    weekLabel: string;
    tasks: string[];
  }>;
}

export default function Dashboard() {
  const [userName, setUserName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<{ leads?: number; spend?: number }>({});

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    setUserName(user.displayName || 'User');

    // Real-time client data
    const unsub1 = onSnapshot(doc(db, 'clients', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ClientData;
        setClientData(data);
        setBusinessName(data.businessName || '');
      }
      setLoading(false);
    });

    // Real-time reports
    const unsub2 = onSnapshot(
      query(collection(db, 'clients', user.uid, 'reports'), orderBy('createdAt', 'desc')),
      (snap) => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
      }
    );

    // Recent activities (client-specific)
    // Note: This requires a Firestore index on (clientId, ts)
    const unsub4 = onSnapshot(
      query(
        collection(db, 'activities'),
        where('clientId', '==', user.uid),
        orderBy('ts', 'desc')
      ),
      (snap) => {
        const items = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || '',
            title: data.title || '',
            subtitle: data.subtitle || '',
            ts: data.ts || Date.now(),
          } as ActivityItem;
        });
        setActivities(items.slice(0, 5)); // Latest 5 activities
      },
      (error) => {
        // Handle index error gracefully - activities are optional
        console.warn('Activities query error (index may be needed):', error);
        setActivities([]);
      }
    );

    // Fetch tasks for this client
    // Note: This requires a Firestore index on (clientId, createdAt)
    const unsub5 = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        const taskData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
        setTasks(taskData);
        console.log('Tasks loaded:', taskData.length, taskData);
      },
      (error) => {
        console.warn('Tasks query error (index may be needed):', error);
        setTasks([]);
      }
    );

    // Fetch weekly plan for this client
    const unsub6 = onSnapshot(
      query(
        collection(db, 'weeklyPlans'),
        where('clientId', '==', user.uid)
      ),
      (snap) => {
        if (!snap.empty) {
          const planData = snap.docs[0].data() as WeeklyPlan;
          const weeklyPlanData = { id: snap.docs[0].id, ...planData };
          setWeeklyPlan(weeklyPlanData);
          console.log('Weekly plan loaded:', weeklyPlanData);
        } else {
          console.log('No weekly plan found for client:', user.uid);
          setWeeklyPlan(null);
        }
      },
      (error) => {
        console.warn('Weekly plan query error:', error);
        setWeeklyPlan(null);
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub4();
      unsub5();
      unsub6();
    };
  }, []);

  // Load goals from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(doc(db, 'clients', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGoals({
          leads: data.monthlyGoalLeads || 0,
          spend: data.monthlyGoalSpend || 0,
        });
      }
    });

    return () => unsub();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const totalReports = reports.length;
    const latestReport = reports[0];
    const totalAdSpend = reports.reduce((sum, r) => sum + (r.adSpend || 0), 0);
    const totalLeads = reports.reduce((sum, r) => sum + (r.leads || 0), 0);
    
    // Current month stats
    const now = new Date();
    const currentMonthReports = reports.filter(r => {
      if (!r.createdAt?.seconds) return false;
      const reportDate = new Date(r.createdAt.seconds * 1000);
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    });
    const currentMonthAdSpend = currentMonthReports.reduce((sum, r) => sum + (r.adSpend || 0), 0);
    const currentMonthLeads = currentMonthReports.reduce((sum, r) => sum + (r.leads || 0), 0);

    // Previous month stats
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthReports = reports.filter(r => {
      if (!r.createdAt?.seconds) return false;
      const reportDate = new Date(r.createdAt.seconds * 1000);
      return reportDate.getMonth() === prevMonth.getMonth() && reportDate.getFullYear() === prevMonth.getFullYear();
    });
    const prevMonthAdSpend = prevMonthReports.reduce((sum, r) => sum + (r.adSpend || 0), 0);
    const prevMonthLeads = prevMonthReports.reduce((sum, r) => sum + (r.leads || 0), 0);

    // Calculate growth percentages
    const leadsGrowth = prevMonthLeads > 0 
      ? ((currentMonthLeads - prevMonthLeads) / prevMonthLeads) * 100 
      : currentMonthLeads > 0 ? 100 : 0;
    const spendGrowth = prevMonthAdSpend > 0 
      ? ((currentMonthAdSpend - prevMonthAdSpend) / prevMonthAdSpend) * 100 
      : currentMonthAdSpend > 0 ? 100 : 0;

    // Task completion stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const taskCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalReports,
      latestReportMonth: latestReport?.month || 'No reports yet',
      totalAdSpend,
      totalLeads,
      avgCostPerLead: totalLeads > 0 ? totalAdSpend / totalLeads : 0,
      totalTasks,
      completedTasks,
      taskCompletionPercentage,
      currentMonthAdSpend,
      currentMonthLeads,
      prevMonthAdSpend,
      prevMonthLeads,
      leadsGrowth,
      spendGrowth,
    };
  }, [reports, tasks]);

  // Chart data for monthly expense (ad spend)
  const chartData = useMemo(() => {
    // Sort reports chronologically and prepare chart data
    const sortedReports = [...reports].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateA - dateB;
    });

    return sortedReports.map(r => ({
      month: r.month || 'Unknown',
      expense: r.adSpend || 0,
      leads: r.leads || 0,
    }));
  }, [reports]);

  // Dynamic project tasks based on actual data
  const projectTasks = useMemo(() => {
    const tasks = [];
    
    // Onboarding task
    tasks.push({
      title: 'Complete onboarding questionnaire',
      status: clientData?.onboardingCompleted ? 'completed' : 'pending',
    });

    // Marketing plan task
    const hasPlan = clientData?.projectStatus && clientData.projectStatus !== 'Strategy';
    tasks.push({
      title: 'Review marketing strategy',
      status: hasPlan ? 'completed' : 'pending',
    });

    // Reports task
    if (stats.totalReports > 0) {
      tasks.push({
        title: `View campaign results (${stats.totalReports} report${stats.totalReports !== 1 ? 's' : ''})`,
        status: 'completed',
      });
    } else {
      tasks.push({
        title: 'View campaign results',
        status: 'pending',
      });
    }

    return tasks;
  }, [clientData, stats]);

  // Calculate onboarding progress
  const onboardingProgress = useMemo(() => {
    if (!clientData) return 0;
    let progress = 0;
    if (clientData.onboardingCompleted) progress += 33;
    if (clientData.projectStatus && clientData.projectStatus !== 'Strategy') progress += 33;
    if (stats.totalReports > 0) progress += 34;
    return progress;
  }, [clientData, stats]);

  // Get project status badge
  const getStatusBadge = () => {
    if (!clientData) return { label: 'Loading...', color: 'bg-muted text-muted-foreground' };
    
    if (!clientData.onboardingCompleted) {
      return { label: 'Onboarding', color: 'bg-warning/10 text-warning' };
    }
    
    switch (clientData.projectStatus) {
      case 'Strategy':
      case 'Planning':
        return { label: 'Planning', color: 'bg-primary/10 text-primary' };
      case 'Active':
        return { label: 'Active', color: 'bg-success/10 text-success' };
      case 'Paused':
        return { label: 'Paused', color: 'bg-muted text-muted-foreground' };
      case 'Completed':
        return { label: 'Completed', color: 'bg-secondary text-secondary-foreground' };
      default:
        return { label: 'Active', color: 'bg-primary/10 text-primary' };
    }
  };

  const statusBadge = getStatusBadge();

  // Format activity time
  const formatActivityTime = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    const hr = Math.floor(diff / 3600000);
    const day = Math.floor(diff / 86400000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (day < 30) return `${day}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  // Calculate weekly plan completion percentages
  const weeklyPlanProgress = useMemo(() => {
    if (!weeklyPlan || !weeklyPlan.weeks || weeklyPlan.weeks.length === 0) {
      return null;
    }

    return weeklyPlan.weeks.map(week => {
      // Get tasks for this week (actual created tasks)
      const weekTasks = tasks.filter(t => t.week === week.weekLabel);
      
      // Get planned tasks from weekly plan
      const plannedTasks = week.tasks || [];
      
      // Combine actual tasks with planned tasks
      // If a planned task has a corresponding actual task, use the actual task
      // Otherwise, show the planned task as a string
      const allTasks: Array<Task | string> = plannedTasks.map((plannedTaskTitle) => {
        const matchingTask = weekTasks.find(t => t.title === plannedTaskTitle);
        return matchingTask || plannedTaskTitle;
      });
      
      // Add any tasks that don't match planned tasks (in case admin added extra tasks)
      weekTasks.forEach(task => {
        if (!plannedTasks.includes(task.title)) {
          allTasks.push(task);
        }
      });
      
      const totalTasks = weekTasks.length > 0 ? weekTasks.length : plannedTasks.length;
      const completedTasks = weekTasks.filter(t => t.status === 'done').length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...week,
        totalTasks,
        completedTasks,
        completionPercentage,
        tasks: allTasks,
        plannedTasks,
      };
    });
  }, [weeklyPlan, tasks]);


  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 sm:space-y-6">
          <SkeletonCard className="h-32" />
          <SkeletonStats count={4} />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="shadow-card overflow-hidden">
            <div className="gradient-hero p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground mb-1 sm:mb-2">
                    Welcome back, {userName.split(' ')[0]}!
                  </h1>
                  <p className="text-sm sm:text-base text-primary-foreground/80">
                    {businessName} • {statusBadge.label}
                  </p>
                </div>
                <Button variant="secondary" asChild className="w-full sm:w-auto">
                  <Link to={R.ONBOARDING}>Edit Profile</Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Performance Summary Widget */}
        {stats.totalReports > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.02 }}
          >
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Performance Summary</CardTitle>
                <CardDescription>Current month vs previous month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Leads</span>
                      <div className="flex items-center gap-2">
                        {stats.leadsGrowth >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`text-sm font-medium ${stats.leadsGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {stats.leadsGrowth >= 0 ? '+' : ''}{stats.leadsGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{stats.currentMonthLeads}</span>
                      <span className="text-sm text-muted-foreground">vs {stats.prevMonthLeads} last month</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ad Spend</span>
                      <div className="flex items-center gap-2">
                        {stats.spendGrowth >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`text-sm font-medium ${stats.spendGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {stats.spendGrowth >= 0 ? '+' : ''}{stats.spendGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">₹{stats.currentMonthAdSpend.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">vs ₹{stats.prevMonthAdSpend.toLocaleString()} last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Goal Tracking */}
        {(goals.leads > 0 || goals.spend > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.03 }}
          >
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Monthly Goals
                </CardTitle>
                <CardDescription>Track your progress towards monthly targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {goals.leads > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Leads Goal</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stats.currentMonthLeads}</span>
                        <span className="text-xs text-muted-foreground">/ {goals.leads}</span>
                        {stats.currentMonthLeads >= goals.leads && (
                          <Trophy className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min((stats.currentMonthLeads / goals.leads) * 100, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {stats.currentMonthLeads >= goals.leads 
                        ? '🎉 Goal achieved!' 
                        : `${goals.leads - stats.currentMonthLeads} leads remaining`}
                    </p>
                  </div>
                )}
                {goals.spend > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Spend Goal</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">₹{stats.currentMonthAdSpend.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">/ ₹{goals.spend.toLocaleString()}</span>
                        {stats.currentMonthAdSpend >= goals.spend && (
                          <Trophy className="h-4 w-4 text-warning" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min((stats.currentMonthAdSpend / goals.spend) * 100, 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {stats.currentMonthAdSpend >= goals.spend 
                        ? '🎉 Goal achieved!' 
                        : `₹${(goals.spend - stats.currentMonthAdSpend).toLocaleString()} remaining`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className={`grid grid-cols-2 ${stats.totalReports > 0 && stats.totalTasks > 0 ? 'sm:grid-cols-5' : stats.totalReports > 0 || stats.totalTasks > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3 sm:gap-4`}>
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Reports</p>
                    <p className="text-xl font-bold">{stats.totalReports}</p>
                  </div>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Campaign Reports</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                {stats.latestReportMonth !== 'No reports yet' && (
                  <p className="text-xs text-muted-foreground mt-2">Latest: {stats.latestReportMonth}</p>
                )}
              </CardContent>
            </Card>

            {stats.totalReports > 0 && (
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Expense</p>
                      <p className="text-xl font-bold">₹{stats.totalAdSpend.toLocaleString()}</p>
                    </div>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-warning" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total Ad Spend</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  {stats.totalLeads > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ₹{stats.avgCostPerLead.toFixed(2)} per lead
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p className="text-sm font-semibold">{statusBadge.label}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Project phase</p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Progress</p>
                    <p className="text-xl font-bold">{onboardingProgress}%</p>
                  </div>
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Onboarding Progress</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                </div>
                <Progress value={onboardingProgress} className="mt-2 h-1.5" />
              </CardContent>
            </Card>

            {stats.totalTasks > 0 && (
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Task Completion</p>
                      <p className="text-xl font-bold">{stats.taskCompletionPercentage}%</p>
                    </div>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-success" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Task Completion Rate</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <Progress value={stats.taskCompletionPercentage} className="mt-2 h-1.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.completedTasks} of {stats.totalTasks} completed
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Monthly Expense Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <Card className="shadow-card">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Monthly Expense Report</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Ad spend over time
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={R.RESULTS}>View Details</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Ad Spend']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar 
                      dataKey="expense" 
                      name="Ad Spend" 
                      fill="#f59e0b" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
                {stats.totalAdSpend > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Ad Spend:</span>
                      <span className="font-semibold text-foreground">
                        ₹{stats.totalAdSpend.toLocaleString()}
                      </span>
                    </div>
                    {stats.totalLeads > 0 && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Total Leads:</span>
                        <span className="font-semibold text-foreground">
                          {stats.totalLeads.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Weekly Plan */}
        {weeklyPlan && weeklyPlanProgress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="shadow-card">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Weekly Plan Progress
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Track your weekly tasks and completion
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={R.PLAN}>View Full Plan</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                {weeklyPlanProgress.map((week, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm sm:text-base">{week.weekLabel}</h3>
                      <Badge 
                        variant={week.completionPercentage === 100 ? "default" : "secondary"}
                        className={week.completionPercentage === 100 ? "bg-success/10 text-success" : ""}
                      >
                        {week.completionPercentage}% Complete
                      </Badge>
                    </div>
                    <Progress value={week.completionPercentage} className="h-2" />
                    <div className="space-y-2">
                      {week.tasks.length > 0 ? (
                        week.tasks.map((task, taskIndex) => {
                          // Handle both Task objects and string task titles
                          const taskTitle = typeof task === 'string' ? task : task.title;
                          const taskStatus = typeof task === 'string' ? 'todo' : task.status;
                          const taskId = typeof task === 'string' ? `planned-${index}-${taskIndex}` : (task.id || taskIndex);
                          
                          return (
                            <div key={taskId} className="flex items-center gap-2 text-sm">
                              {taskStatus === 'done' ? (
                                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                              ) : taskStatus === 'in_progress' ? (
                                <Clock className="h-4 w-4 text-warning flex-shrink-0" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className={taskStatus === 'done' ? 'line-through text-muted-foreground' : ''}>
                                {taskTitle}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">No tasks assigned yet</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      {week.completedTasks} of {week.totalTasks} tasks completed
                      {week.plannedTasks && week.plannedTasks.length > 0 && week.totalTasks === 0 && (
                        <span className="ml-2 text-warning">({week.plannedTasks.length} planned)</span>
                      )}
                    </div>
                  </div>
                ))}
                {weeklyPlanProgress.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No weekly plan available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
              >
                <Link to={action.href}>
                  <Card className="shadow-card hover:shadow-elevated transition-shadow group cursor-pointer h-full">
                    <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                          <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm sm:text-base">{action.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                      <CardDescription className="flex items-center justify-between text-xs sm:text-sm">
                        <span>{action.description}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Project Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="shadow-card">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div>
                  <CardTitle className="text-base sm:text-lg">Project Status</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your onboarding progress</CardDescription>
                </div>
                <Badge className={`${statusBadge.color} hover:opacity-80 w-fit`}>
                  {statusBadge.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {projectTasks.map((task, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-secondary/50"
                    >
                      {task.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
                      )}
                      {task.status === 'in-progress' && (
                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
                      )}
                      {task.status === 'pending' && (
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm sm:text-base flex-1 ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        {activities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="shadow-card">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Recent Activity</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Latest updates on your account</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={R.RESULTS}>View All</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{activity.subtitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatActivityTime(activity.ts)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
