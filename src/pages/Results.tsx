import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, TrendingDown, TrendingUp, FileText, Loader2, Download, Calendar, Printer, Share2, Trophy, Target, BarChart2, PieChart } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, onSnapshot as onSnapshotDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Report {
  id: string;
  month: string;
  leads: number;
  adSpend: number;
  costPerLead: number;
  notes?: string;
  createdAt?: { seconds: number };
}

export default function Results() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'leads' | 'spend' | 'cpl'>('date');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [goals, setGoals] = useState<{ leads?: number; spend?: number }>({});
  const [viewMode, setViewMode] = useState<'overview' | 'comparison' | 'goals' | 'roi' | 'campaigns'>('overview');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }

    const unsub1 = onSnapshot(
      query(collection(db, 'clients', uid, 'reports'), orderBy('createdAt', 'desc')),
      (snap) => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
        setLoading(false);
      }
    );

    const unsub2 = onSnapshotDoc(doc(db, 'clients', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGoals({
          leads: data.monthlyGoalLeads || 0,
          spend: data.monthlyGoalSpend || 0,
        });
      }
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Filter and sort reports
  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...reports];
    
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'this-month':
          filterDate.setDate(1);
          break;
        case 'last-month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          filterDate.setDate(1);
          break;
        case 'last-3-months':
          filterDate.setMonth(filterDate.getMonth() - 3);
          break;
        case 'last-6-months':
          filterDate.setMonth(filterDate.getMonth() - 6);
          break;
        case 'this-year':
          filterDate.setMonth(0, 1);
          break;
      }
      
      filtered = filtered.filter(r => {
        if (!r.createdAt?.seconds) return false;
        const reportDate = new Date(r.createdAt.seconds * 1000);
        return reportDate >= filterDate;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        case 'leads':
          return b.leads - a.leads;
        case 'spend':
          return (b.adSpend ?? 0) - (a.adSpend ?? 0);
        case 'cpl':
          return (b.costPerLead ?? 0) - (a.costPerLead ?? 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [reports, sortBy, dateFilter]);

  const latestReport = filteredAndSortedReports[0] || reports[0];

  // Chart data in chronological order (oldest → newest)
  const chartData = useMemo(() => [...filteredAndSortedReports].reverse().map(r => ({
    month:   r.month,
    leads:   r.leads,
    adSpend: r.adSpend,
  })), [filteredAndSortedReports]);

  const stats = latestReport ? [
    { title: 'Total Leads',   value: latestReport.leads,                                icon: Users,        color: 'bg-primary/10 text-primary'  },
    { title: 'Ad Spend',      value: `₹${(latestReport.adSpend ?? 0).toLocaleString()}`,        icon: DollarSign,   color: 'bg-accent/10 text-accent'    },
    { title: 'Cost per Lead', value: `₹${(latestReport.costPerLead ?? 0).toFixed(2)}`,   icon: TrendingDown, color: 'bg-success/10 text-success'  },
  ] : [];

  // Comparison data (month-over-month, year-over-year)
  const comparisonData = useMemo(() => {
    if (filteredAndSortedReports.length < 2) return null;

    const sorted = [...filteredAndSortedReports].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateA - dateB;
    });

    const comparisons = [];
    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const previous = sorted[i - 1];
      
      const leadsChange = previous.leads > 0 
        ? ((current.leads - previous.leads) / previous.leads) * 100 
        : current.leads > 0 ? 100 : 0;
      
      const prevSpend = previous.adSpend ?? 0;
      const currSpend = current.adSpend ?? 0;
      const spendChange = prevSpend > 0 
        ? ((currSpend - prevSpend) / prevSpend) * 100 
        : currSpend > 0 ? 100 : 0;

      comparisons.push({
        month: current.month,
        previousMonth: previous.month,
        leads: {
          current: current.leads,
          previous: previous.leads,
          change: leadsChange,
        },
        spend: {
          current: currSpend,
          previous: prevSpend,
          change: spendChange,
        },
      });
    }

    // Find best and worst months
    const bestMonth = sorted.reduce((best, current) => 
      current.leads > best.leads ? current : best, sorted[0]);
    const worstMonth = sorted.reduce((worst, current) => 
      current.leads < worst.leads ? current : worst, sorted[0]);

    return {
      comparisons,
      bestMonth,
      worstMonth,
      yearOverYear: sorted.length >= 12 ? {
        currentYear: sorted.slice(-12).reduce((sum, r) => sum + r.leads, 0),
        previousYear: sorted.slice(-24, -12).reduce((sum, r) => sum + r.leads, 0),
      } : null,
    };
  }, [filteredAndSortedReports]);

  // Goal vs Actual data
  const goalComparison = useMemo(() => {
    if (!goals.leads && !goals.spend) return null;

    const currentMonth = new Date();
    const currentMonthReports = filteredAndSortedReports.filter(r => {
      if (!r.createdAt?.seconds) return false;
      const reportDate = new Date(r.createdAt.seconds * 1000);
      return reportDate.getMonth() === currentMonth.getMonth() && 
             reportDate.getFullYear() === currentMonth.getFullYear();
    });

    const actualLeads = currentMonthReports.reduce((sum, r) => sum + r.leads, 0);
    const actualSpend = currentMonthReports.reduce((sum, r) => sum + (r.adSpend ?? 0), 0);

    return {
      leads: {
        goal: goals.leads || 0,
        actual: actualLeads,
        percentage: goals.leads ? (actualLeads / goals.leads) * 100 : 0,
        achieved: goals.leads ? actualLeads >= goals.leads : false,
      },
      spend: {
        goal: goals.spend || 0,
        actual: actualSpend,
        percentage: goals.spend ? (actualSpend / goals.spend) * 100 : 0,
        achieved: goals.spend ? actualSpend >= goals.spend : false,
      },
    };
  }, [filteredAndSortedReports, goals]);

  // Export to CSV
  const handleExport = () => {
    const csvContent = [
      ['Month', 'Leads', 'Ad Spend', 'Cost Per Lead', 'Notes'].join(','),
      ...filteredAndSortedReports.map(r => [
        r.month,
        r.leads,
        r.adSpend ?? 0,
        (r.costPerLead ?? 0).toFixed(2),
        (r.notes || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Print-friendly view
  const handlePrint = () => {
    window.print();
  };

  // Share report
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Campaign Results Report',
          text: `View my campaign results: ${filteredAndSortedReports.length} reports`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">Results</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Track your campaign performance and ROI</p>
            </div>
            {!loading && reports.length > 0 && (
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
          
          {/* Filters */}
          {!loading && reports.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                  <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date (Newest)</SelectItem>
                  <SelectItem value="leads">Leads (High to Low)</SelectItem>
                  <SelectItem value="spend">Ad Spend (High to Low)</SelectItem>
                  <SelectItem value="cpl">CPL (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty state */}
        {!loading && reports.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">No results yet</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Your campaign results will appear here once your marketing team adds the first monthly report.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {!loading && reports.length > 0 && (
          <>
            {/* View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                {goals.leads || goals.spend ? (
                  <TabsTrigger value="goals">Goals vs Actual</TabsTrigger>
                ) : null}
                <TabsTrigger value="roi">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  ROI & Funnel
                </TabsTrigger>
                <TabsTrigger value="campaigns">
                  <Target className="h-4 w-4 mr-2" />
                  Campaigns
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* KPI Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {stats.map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                >
                  <Card className="shadow-card">
                    <CardContent className="p-4 sm:pt-6 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1.5">Latest: {latestReport.month}</p>
                        </div>
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                          <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                  ))}
                </div>

            {/* Performance Chart (only when ≥2 months of data) */}
            {filteredAndSortedReports.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Card className="shadow-card">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Performance Overview</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Lead generation trends over time</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                          formatter={(val: number, name: string) =>
                            name === 'adSpend' ? [`₹${val.toLocaleString()}`, 'Ad Spend'] : [val, 'Leads']
                          }
                        />
                        <Area type="monotone" dataKey="leads" name="leads" stroke="#6366f1" fill="url(#leadGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Monthly Reports list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="shadow-card">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">Monthly Reports</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Insights and results from your marketing team ({reports.length} report{reports.length !== 1 ? 's' : ''})
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    {filteredAndSortedReports.map(report => (
                      <div key={report.id} className="p-3 sm:p-4 rounded-lg border border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mb-2">
                          <h4 className="font-semibold text-sm sm:text-base text-foreground">{report.month}</h4>
                          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                            <span className="text-success font-medium">{report.leads} leads</span>
                            <span className="text-muted-foreground">₹{(report.adSpend ?? 0).toLocaleString()} spend</span>
                            <span className="text-primary">₹{(report.costPerLead ?? 0).toFixed(2)} CPL</span>
                          </div>
                        </div>
                        {report.notes && (
                          <p className="text-xs sm:text-sm text-muted-foreground">{report.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
              </TabsContent>

              {/* Comparison Tab */}
              <TabsContent value="comparison" className="space-y-4">
                {comparisonData ? (
                  <>
                    {/* Best/Worst Months */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Best Performing Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-2xl font-bold">{comparisonData.bestMonth.month}</p>
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Leads</p>
                                <p className="text-lg font-semibold text-success">{comparisonData.bestMonth.leads}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Ad Spend</p>
                                <p className="text-lg font-semibold">₹{(comparisonData.bestMonth.adSpend ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                            <Badge className="bg-success/10 text-success">Top Performer</Badge>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Lowest Performing Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-2xl font-bold">{comparisonData.worstMonth.month}</p>
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">Leads</p>
                                <p className="text-lg font-semibold text-destructive">{comparisonData.worstMonth.leads}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Ad Spend</p>
                                <p className="text-lg font-semibold">₹{(comparisonData.worstMonth.adSpend ?? 0).toLocaleString()}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-destructive">Needs Improvement</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Month-over-Month Comparison */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Month-over-Month Comparison</CardTitle>
                        <CardDescription>Compare each month with the previous month</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {comparisonData.comparisons.map((comp, idx) => (
                            <div key={idx} className="p-4 rounded-lg border border-border">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="font-semibold">{comp.month}</p>
                                  <p className="text-xs text-muted-foreground">vs {comp.previousMonth}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Leads</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{comp.leads.current}</span>
                                    <span className="text-xs text-muted-foreground">vs {comp.leads.previous}</span>
                                    {comp.leads.change !== 0 && (
                                      <div className={`flex items-center gap-1 ${comp.leads.change > 0 ? 'text-success' : 'text-destructive'}`}>
                                        {comp.leads.change > 0 ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        <span className="text-xs font-medium">
                                          {comp.leads.change > 0 ? '+' : ''}{comp.leads.change.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Ad Spend</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">₹{comp.spend.current.toLocaleString()}</span>
                                    <span className="text-xs text-muted-foreground">vs ₹{comp.spend.previous.toLocaleString()}</span>
                                    {comp.spend.change !== 0 && (
                                      <div className={`flex items-center gap-1 ${comp.spend.change > 0 ? 'text-success' : 'text-destructive'}`}>
                                        {comp.spend.change > 0 ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        <span className="text-xs font-medium">
                                          {comp.spend.change > 0 ? '+' : ''}{comp.spend.change.toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Year-over-Year */}
                    {comparisonData.yearOverYear && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Year-over-Year Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Last 12 Months</p>
                              <p className="text-2xl font-bold">{comparisonData.yearOverYear.currentYear}</p>
                              <p className="text-xs text-muted-foreground">Total Leads</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Previous 12 Months</p>
                              <p className="text-2xl font-bold">{comparisonData.yearOverYear.previousYear}</p>
                              <p className="text-xs text-muted-foreground">Total Leads</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Need at least 2 reports for comparison</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Goals vs Actual Tab */}
              <TabsContent value="goals" className="space-y-4">
                {goalComparison ? (
                  <div className="space-y-4">
                    {goals.leads > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Leads Goal
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Progress</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{goalComparison.leads.actual}</span>
                              <span className="text-xs text-muted-foreground">/ {goalComparison.leads.goal}</span>
                              {goalComparison.leads.achieved && (
                                <Trophy className="h-4 w-4 text-warning" />
                              )}
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(goalComparison.leads.percentage, 100)} 
                            className="h-2"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className={goalComparison.leads.achieved ? 'text-success font-medium' : 'text-muted-foreground'}>
                              {goalComparison.leads.achieved 
                                ? '🎉 Goal achieved!' 
                                : `${goalComparison.leads.goal - goalComparison.leads.actual} leads remaining`}
                            </span>
                            <span className="text-muted-foreground">
                              {goalComparison.leads.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {goals.spend > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Ad Spend Goal
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Progress</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">₹{goalComparison.spend.actual.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground">/ ₹{goalComparison.spend.goal.toLocaleString()}</span>
                              {goalComparison.spend.achieved && (
                                <Trophy className="h-4 w-4 text-warning" />
                              )}
                            </div>
                          </div>
                          <Progress 
                            value={Math.min(goalComparison.spend.percentage, 100)} 
                            className="h-2"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className={goalComparison.spend.achieved ? 'text-success font-medium' : 'text-muted-foreground'}>
                              {goalComparison.spend.achieved 
                                ? '🎉 Goal achieved!' 
                                : `₹${(goalComparison.spend.goal - goalComparison.spend.actual).toLocaleString()} remaining`}
                            </span>
                            <span className="text-muted-foreground">
                              {goalComparison.spend.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="font-medium">No goals set</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Set your monthly goals in Profile & Settings to track your progress here
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ROI & Conversion Funnel Tab */}
              <TabsContent value="roi" className="space-y-4">
                {filteredAndSortedReports.length > 0 ? (
                  <>
                    {/* ROI Calculations */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(() => {
                        const totalSpend = filteredAndSortedReports.reduce((sum, r) => sum + (r.adSpend ?? 0), 0);
                        const totalLeads = filteredAndSortedReports.reduce((sum, r) => sum + r.leads, 0);
                        // Assume average lead value (in real app, this would come from client data)
                        const avgLeadValue = 50; // ₹50 per lead (example)
                        const totalRevenue = totalLeads * avgLeadValue;
                        const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
                        const roas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;

                        return (
                          <>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">ROI</CardTitle>
                                <CardDescription>Return on Investment</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-2">
                                  <span className={`text-2xl font-bold ${roi >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                                  </span>
                                  {roi >= 0 ? (
                                    <TrendingUp className="h-5 w-5 text-success" />
                                  ) : (
                                    <TrendingDown className="h-5 w-5 text-destructive" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Revenue: ₹{totalRevenue.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Spend: ₹{totalSpend.toLocaleString()}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">ROAS</CardTitle>
                                <CardDescription>Return on Ad Spend</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">₹{roas.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  For every ₹1 spent, you get ₹{roas.toFixed(2)} back
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Total Value</CardTitle>
                                <CardDescription>Estimated revenue from leads</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {totalLeads} leads × ₹{avgLeadValue}/lead
                                </p>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}
                    </div>

                    {/* Conversion Funnel */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Conversion Funnel</CardTitle>
                        <CardDescription>Visual representation of your marketing funnel</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const totalSpend = filteredAndSortedReports.reduce((sum, r) => sum + (r.adSpend ?? 0), 0);
                          const totalLeads = filteredAndSortedReports.reduce((sum, r) => sum + r.leads, 0);
                          // Simplified funnel stages (in real app, these would come from actual data)
                          const impressions = totalSpend * 1000; // Estimate: ₹1 = 1000 impressions
                          const clicks = impressions * 0.02; // 2% CTR
                          const conversions = totalLeads; // Leads = conversions
                          const customers = conversions * 0.3; // 30% conversion rate

                          const funnelData = [
                            { stage: 'Impressions', value: impressions, percentage: 100 },
                            { stage: 'Clicks', value: clicks, percentage: (clicks / impressions) * 100 },
                            { stage: 'Leads', value: conversions, percentage: (conversions / impressions) * 100 },
                            { stage: 'Customers', value: customers, percentage: (customers / impressions) * 100 },
                          ];

                          return (
                            <div className="space-y-4">
                              {funnelData.map((stage, idx) => (
                                <div key={stage.stage} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{stage.stage}</span>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm font-semibold">
                                        {stage.value >= 1000 
                                          ? `${(stage.value / 1000).toFixed(1)}k`
                                          : Math.round(stage.value).toLocaleString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {stage.percentage.toFixed(2)}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="h-8 bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary transition-all duration-500 flex items-center justify-end pr-2"
                                      style={{ width: `${stage.percentage}%` }}
                                    >
                                      {stage.percentage > 5 && (
                                        <span className="text-xs text-primary-foreground font-medium">
                                          {stage.percentage.toFixed(1)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* ROI Trend Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">ROI Trend</CardTitle>
                        <CardDescription>Return on investment over time</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={chartData.map(r => {
                            const avgLeadValue = 50;
                            const revenue = r.leads * avgLeadValue;
                            const spend = r.adSpend ?? 0;
                            const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
                            return { ...r, roi };
                          })}>
                            <defs>
                              <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={v => `${v}%`} />
                            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'ROI']} />
                            <Area type="monotone" dataKey="roi" stroke="#22c55e" fill="url(#roiGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <EmptyState
                    icon={<BarChart2 className="h-8 w-8 text-muted-foreground" />}
                    title="No data for ROI analysis"
                    description="Add reports to see ROI calculations and conversion funnel"
                  />
                )}
              </TabsContent>

              {/* Campaign Comparison Tab */}
              <TabsContent value="campaigns" className="space-y-4">
                {filteredAndSortedReports.length > 0 ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Campaign Performance Comparison</CardTitle>
                        <CardDescription>Compare performance across different months</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="leads" fill="#6366f1" name="Leads" />
                            <Bar yAxisId="right" dataKey="adSpend" fill="#22c55e" name="Ad Spend (₹)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Campaign Ranking */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Performing Campaigns</CardTitle>
                        <CardDescription>Ranked by lead generation</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[...filteredAndSortedReports]
                            .sort((a, b) => b.leads - a.leads)
                            .slice(0, 5)
                            .map((report, idx) => (
                              <div key={report.id} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  idx === 0 ? 'bg-success/10 text-success' :
                                  idx === 1 ? 'bg-primary/10 text-primary' :
                                  idx === 2 ? 'bg-accent/10 text-accent' :
                                  'bg-secondary text-secondary-foreground'
                                }`}>
                                  <span className="font-bold text-sm">#{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-semibold">{report.month}</p>
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                    <span>{report.leads} leads</span>
                                    <span>₹{(report.adSpend ?? 0).toLocaleString()} spend</span>
                                    <span>₹{(report.costPerLead ?? 0).toFixed(2)} CPL</span>
                                  </div>
                                </div>
                                {idx === 0 && (
                                  <Trophy className="h-5 w-5 text-warning" />
                                )}
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Performance Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Performance Distribution</CardTitle>
                        <CardDescription>Lead generation distribution</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <RechartsPieChart>
                            <Pie
                              data={chartData.map(r => ({ name: r.month, value: r.leads }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <EmptyState
                    icon={<Target className="h-8 w-8 text-muted-foreground" />}
                    title="No campaign data"
                    description="Add reports to compare campaign performance"
                  />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

      </div>
    </DashboardLayout>
  );
}
