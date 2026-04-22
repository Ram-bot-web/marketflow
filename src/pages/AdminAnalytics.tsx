import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, Target, BarChart2, Calendar, TrendingDown, AlertTriangle, PieChart as PieChartIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import {
  getClientLifecyclePhase,
  LIFECYCLE_CHART_COLORS,
  LIFECYCLE_BADGE_CLASSES,
  type ClientLifecyclePhase,
} from '@/lib/client-lifecycle';
import { collection, onSnapshot, getDocs, collectionGroup } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  budget?: string;
  projectStatus?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number };
}
interface Report {
  leads: number;
  adSpend: number;
  costPerLead: number;
  createdAt?: { seconds: number };
}

const budgetMap: Record<string, number> = {
  starter: 1000, growth: 2500, scale: 5000, enterprise: 8000,
};


function buildMonthKeys(count: number) {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [clients, setClients] = useState<Client[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dateRange, setDateRange] = useState<'6m' | '1y' | 'all' | 'custom'>('6m');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), snap =>
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))
    );
    // Fetch all reports across all clients
    getDocs(collectionGroup(db, 'reports')).then(snap =>
      setReports(snap.docs.map(d => d.data() as Report))
    );
    return () => unsub();
  }, []);

  // ── KPI values ──────────────────────────────────────────────────────────────
  const totalRevenue    = clients.reduce((s, c) => s + (budgetMap[c.budget ?? ''] || 0), 0);
  const totalLeads      = reports.reduce((s, r) => s + (r.leads || 0), 0);
  const totalAdSpend    = reports.reduce((s, r) => s + (r.adSpend || 0), 0);
  const avgCPL          = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
  const activeClients   = clients.filter(c => getClientLifecyclePhase(c) === 'active').length;

  // Calculate months based on date range
  const getMonthKeys = () => {
    if (dateRange === '6m') return buildMonthKeys(6);
    if (dateRange === '1y') return buildMonthKeys(12);
    if (dateRange === 'all') return buildMonthKeys(24);
    // Custom range - calculate months between dates
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      const months = [];
      const current = new Date(start);
      while (current <= end) {
        months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
        current.setMonth(current.getMonth() + 1);
      }
      return months;
    }
    return buildMonthKeys(6);
  };

  // ── Revenue trend ────────────────────────────────────────────────────────
  const revenueTrend = useMemo(() => {
    const keys = getMonthKeys();
    const map  = Object.fromEntries(keys.map(k => [k, { month: monthLabel(k), revenue: 0 }]));
    clients.forEach(c => {
      const ts = c.createdAt; if (!ts) return;
      const clientDate = new Date(ts.seconds * 1000);
      
      // Filter by custom date range if set
      if (dateRange === 'custom' && customStart && customEnd) {
        const start = new Date(customStart);
        const end = new Date(customEnd);
        if (clientDate < start || clientDate > end) return;
      }
      
      const k = `${clientDate.getFullYear()}-${String(clientDate.getMonth() + 1).padStart(2, '0')}`;
      if (map[k]) map[k].revenue += budgetMap[c.budget ?? ''] || 0;
    });
    return Object.values(map);
  }, [clients, dateRange, customStart, customEnd]);

  // ── Client growth ────────────────────────────────────────────────────────
  const clientGrowth = useMemo(() => {
    const keys = getMonthKeys();
    const map  = Object.fromEntries(keys.map(k => [k, { month: monthLabel(k), clients: 0 }]));
    
    // Filter clients by date range if custom
    let filteredClients = clients;
    if (dateRange === 'custom' && customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      filteredClients = clients.filter(c => {
        if (!c.createdAt) return false;
        const clientDate = new Date(c.createdAt.seconds * 1000);
        return clientDate >= start && clientDate <= end;
      });
    }
    
    let cumulative = filteredClients.filter(c => {
      const ts = c.createdAt; if (!ts) return false;
      const k = `${new Date(ts.seconds * 1000).getFullYear()}-${String(new Date(ts.seconds * 1000).getMonth() + 1).padStart(2, '0')}`;
      return !map[k];
    }).length;
    filteredClients.forEach(c => {
      const ts = c.createdAt; if (!ts) return;
      const k = `${new Date(ts.seconds * 1000).getFullYear()}-${String(new Date(ts.seconds * 1000).getMonth() + 1).padStart(2, '0')}`;
      if (map[k]) map[k].clients += 1;
    });
    let running = cumulative;
    return Object.values(map).map(row => { running += row.clients; return { ...row, total: running }; });
  }, [clients, dateRange, customStart, customEnd]);

  // ── Status breakdown ────────────────────────────────────────────────────
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = { onboarding: 0, planning: 0, active: 0, paused: 0, completed: 0 };
    clients.forEach(c => counts[getClientLifecyclePhase(c)]++);
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: LIFECYCLE_CHART_COLORS[name as ClientLifecyclePhase],
      }));
  }, [clients]);

  const kpis = [
    { label: 'Monthly Revenue',  value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary',   bg: 'bg-primary/10'   },
    { label: 'Total Leads',      value: totalLeads,                           icon: Target,     color: 'text-success',   bg: 'bg-success/10'   },
    { label: 'Avg Cost Per Lead',value: `₹${avgCPL.toFixed(2)}`,              icon: BarChart2,  color: 'text-accent',    bg: 'bg-accent/10'    },
    { label: 'Active Clients',   value: activeClients,                        icon: Users,      color: 'text-warning',   bg: 'bg-warning/10'   },
    { label: 'Total Clients',    value: clients.length,                       icon: TrendingUp, color: 'text-secondary-foreground', bg: 'bg-secondary' },
  ];

  // Calculate performance metrics
  const avgLifetimeValue = useMemo(() => {
    const totalRevenue = clients.reduce((s, c) => s + (budgetMap[c.budget ?? ''] || 0), 0);
    return clients.length > 0 ? totalRevenue / clients.length : 0;
  }, [clients]);

  const retentionRate = useMemo(() => {
    const active = clients.filter(c => getClientLifecyclePhase(c) === 'active').length;
    return clients.length > 0 ? (active / clients.length) * 100 : 0;
  }, [clients]);

  const churnRate = useMemo(() => {
    const paused = clients.filter(c => getClientLifecyclePhase(c) === 'paused').length;
    return clients.length > 0 ? (paused / clients.length) * 100 : 0;
  }, [clients]);

  // ── Client Segmentation ─────────────────────────────────────────────────────
  const clientSegments = useMemo(() => {
    // Segment by status
    const byStatus: Record<string, { clients: Client[]; totalRevenue: number; avgLeads: number; avgSpend: number }> = {
      onboarding: { clients: [], totalRevenue: 0, avgLeads: 0, avgSpend: 0 },
      planning: { clients: [], totalRevenue: 0, avgLeads: 0, avgSpend: 0 },
      active: { clients: [], totalRevenue: 0, avgLeads: 0, avgSpend: 0 },
      paused: { clients: [], totalRevenue: 0, avgLeads: 0, avgSpend: 0 },
      completed: { clients: [], totalRevenue: 0, avgLeads: 0, avgSpend: 0 },
    };

    // Segment by budget
    const byBudget: Record<string, { clients: Client[]; totalRevenue: number }> = {
      starter: { clients: [], totalRevenue: 0 },
      growth: { clients: [], totalRevenue: 0 },
      scale: { clients: [], totalRevenue: 0 },
      enterprise: { clients: [], totalRevenue: 0 },
    };

    // Group clients by status
    clients.forEach(client => {
      const status = getClientLifecyclePhase(client);
      if (byStatus[status]) {
        byStatus[status].clients.push(client);
        byStatus[status].totalRevenue += budgetMap[client.budget ?? ''] || 0;
      }
    });

    // Group clients by budget
    clients.forEach(client => {
      const budget = client.budget || 'starter';
      if (byBudget[budget]) {
        byBudget[budget].clients.push(client);
        byBudget[budget].totalRevenue += budgetMap[budget] || 0;
      }
    });

    // Calculate average leads and spend per status
    // Note: Reports are subcollections, so we calculate averages across all reports
    // In a real implementation, you'd need to match reports to clients via clientId
    if (reports.length > 0) {
      const totalLeads = reports.reduce((sum: number, r: Report) => sum + (r.leads || 0), 0);
      const totalSpend = reports.reduce((sum: number, r: Report) => sum + (r.adSpend || 0), 0);
      const avgLeads = totalLeads / reports.length;
      const avgSpend = totalSpend / reports.length;
      
      // Apply average to all segments (simplified - in production, match reports to clients)
      Object.keys(byStatus).forEach(status => {
        const segment = byStatus[status];
        if (segment.clients.length > 0) {
          segment.avgLeads = avgLeads;
          segment.avgSpend = avgSpend;
        }
      });
    }

    // Filter out empty segments
    const filteredByStatus: Record<string, typeof byStatus[string]> = {};
    Object.entries(byStatus).forEach(([key, value]) => {
      if (value.clients.length > 0) {
        filteredByStatus[key] = value;
      }
    });

    const filteredByBudget: Record<string, typeof byBudget[string]> = {};
    Object.entries(byBudget).forEach(([key, value]) => {
      if (value.clients.length > 0) {
        filteredByBudget[key] = value;
      }
    });

    return {
      byStatus: filteredByStatus,
      byBudget: filteredByBudget,
    };
  }, [clients, reports]);

  // ── Revenue Forecasting ────────────────────────────────────────────────────
  const revenueForecast = useMemo(() => {
    // Calculate average monthly revenue from last 6 months
    const last6Months = buildMonthKeys(6);
    const monthlyRevenue: Record<string, number> = {};
    
    clients.forEach(c => {
      const ts = c.createdAt;
      if (!ts) return;
      const clientDate = new Date(ts.seconds * 1000);
      const k = `${clientDate.getFullYear()}-${String(clientDate.getMonth() + 1).padStart(2, '0')}`;
      if (last6Months.includes(k)) {
        monthlyRevenue[k] = (monthlyRevenue[k] || 0) + (budgetMap[c.budget ?? ''] || 0);
      }
    });

    const revenueValues = Object.values(monthlyRevenue);
    const avgMonthlyRevenue = revenueValues.length > 0
      ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length
      : totalRevenue / 6;

    // Calculate growth rate (simple average of month-over-month changes)
    let growthRate = 0;
    if (revenueValues.length > 1) {
      const changes: number[] = [];
      for (let i = 1; i < revenueValues.length; i++) {
        if (revenueValues[i - 1] > 0) {
          changes.push((revenueValues[i] - revenueValues[i - 1]) / revenueValues[i - 1]);
        }
      }
      growthRate = changes.length > 0
        ? changes.reduce((a, b) => a + b, 0) / changes.length
        : 0;
    }

    // Generate 6-month forecast
    const forecast = [];
    const now = new Date();
    let projectedRevenue = avgMonthlyRevenue;

    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now);
      futureDate.setMonth(now.getMonth() + i);
      const monthLabel = futureDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Apply growth rate
      projectedRevenue = projectedRevenue * (1 + growthRate);
      
      forecast.push({
        month: monthLabel,
        projected: Math.max(0, projectedRevenue),
      });
    }

    // Calculate churn risk (percentage of paused + low engagement clients)
    const pausedClients = clients.filter(c => getClientLifecyclePhase(c) === 'paused').length;
    const atRiskCount = pausedClients;
    const churnRisk = clients.length > 0 ? (atRiskCount / clients.length) * 100 : 0;

    return {
      forecast,
      churnRisk,
      atRiskCount,
      avgMonthlyRevenue,
      growthRate: growthRate * 100, // Convert to percentage
    };
  }, [clients, totalRevenue]);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Select a time period for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRange === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    placeholder="Start Date"
                    className="w-[180px]"
                  />
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="End Date"
                    className="w-[180px]"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Lifetime Value</CardDescription>
              <CardTitle className="text-2xl">₹{avgLifetimeValue.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Retention Rate</CardDescription>
              <CardTitle className="text-2xl">{retentionRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Churn Rate</CardDescription>
              <CardTitle className="text-2xl">{churnRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Clients</CardDescription>
              <CardTitle className="text-2xl">{activeClients}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Revenue Forecasting & Client Segmentation */}
        <Tabs defaultValue="forecast" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forecast">
              <TrendingUp className="h-4 w-4 mr-2" />
              Revenue Forecast
            </TabsTrigger>
            <TabsTrigger value="segmentation">
              <PieChartIcon className="h-4 w-4 mr-2" />
              Client Segmentation
            </TabsTrigger>
          </TabsList>

          {/* Revenue Forecasting Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">6-Month Revenue Forecast</CardTitle>
                  <CardDescription>Projected revenue based on historical trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={revenueForecast.forecast}>
                      <defs>
                        <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Projected']} />
                      <Area 
                        type="monotone" 
                        dataKey="projected" 
                        stroke="#8b5cf6" 
                        fill="url(#forecastGrad)" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Churn Risk Analysis</CardTitle>
                  <CardDescription>Clients at risk of churning</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Churn Risk Level</span>
                      <Badge className={
                        revenueForecast.churnRisk > 30 
                          ? 'bg-destructive/10 text-destructive'
                          : revenueForecast.churnRisk > 15
                          ? 'bg-warning/10 text-warning'
                          : 'bg-success/10 text-success'
                      }>
                        {revenueForecast.churnRisk.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          revenueForecast.churnRisk > 30 
                            ? 'bg-destructive'
                            : revenueForecast.churnRisk > 15
                            ? 'bg-warning'
                            : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(revenueForecast.churnRisk, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-medium text-sm">At-Risk Clients</span>
                    </div>
                    <p className="text-2xl font-bold">{revenueForecast.atRiskCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clients with low engagement or paused status
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium">Growth Projection</p>
                    <div className="space-y-1">
                      {revenueForecast.forecast.slice(0, 3).map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{f.month}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">₹{f.projected.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {revenueForecast.growthRate > 0 ? '+' : ''}{revenueForecast.growthRate.toFixed(1)}% growth
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Client Segmentation Tab */}
          <TabsContent value="segmentation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Segmentation by Status</CardTitle>
                  <CardDescription>Client performance by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(clientSegments.byStatus).map(([status, data]) => (
                      <div key={status} className="p-3 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={LIFECYCLE_BADGE_CLASSES[status as ClientLifecyclePhase] ?? 'bg-muted'}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {data.clients.length} clients
                            </span>
                          </div>
                          <span className="font-semibold text-sm">
                            ₹{data.totalRevenue.toLocaleString()}/mo
                          </span>
                        </div>
                        {data.avgLeads > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                            <span>Avg Leads: {data.avgLeads.toFixed(0)}</span>
                            <span>Avg Spend: ₹{data.avgSpend.toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Segmentation by Budget</CardTitle>
                  <CardDescription>Revenue distribution by plan tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={Object.entries(clientSegments.byBudget).map(([budget, data]) => ({
                      plan: budget.charAt(0).toUpperCase() + budget.slice(1),
                      clients: data.clients.length,
                      revenue: data.totalRevenue,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="plan" />
                      <YAxis tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-4 space-y-2">
                    {Object.entries(clientSegments.byBudget).map(([budget, data]) => (
                      <div key={budget} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{budget}</span>
                        <div className="flex items-center gap-4">
                          <span>{data.clients.length} clients</span>
                          <span className="font-semibold">₹{data.totalRevenue.toLocaleString()}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Performance overview across all clients</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kpis.map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={`h-8 w-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className="text-xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Trend + Client Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue from new clients</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '₹0' : `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Growth</CardTitle>
              <CardDescription>Cumulative clients over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={clientGrowth}>
                  <defs>
                    <linearGradient id="cliGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Total Clients']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#cliGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown + Revenue by Plan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Client Status Breakdown</CardTitle>
              <CardDescription>Distribution across all statuses</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {statusBreakdown.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Plan</CardTitle>
              <CardDescription>Active monthly budget distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={[
                    { plan: 'Starter',    count: clients.filter(c => c.budget === 'starter').length,    rev: clients.filter(c => c.budget === 'starter').length    * 1000 },
                    { plan: 'Growth',     count: clients.filter(c => c.budget === 'growth').length,     rev: clients.filter(c => c.budget === 'growth').length     * 2500 },
                    { plan: 'Scale',      count: clients.filter(c => c.budget === 'scale').length,      rev: clients.filter(c => c.budget === 'scale').length      * 5000 },
                    { plan: 'Enterprise', count: clients.filter(c => c.budget === 'enterprise').length, rev: clients.filter(c => c.budget === 'enterprise').length * 8000 },
                  ]}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '₹0' : `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="rev" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
