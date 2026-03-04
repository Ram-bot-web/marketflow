import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Search, ChevronRight, Users, TrendingUp, DollarSign,
  Clock, CheckCircle2, PauseCircle, Target, Activity,
  Filter, Download, Mail, Tag, Calendar, MoreVertical,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { calculateHealthScore, getHealthScoreColor } from '@/lib/client-health';
import { adminClientPath } from '@/lib/routes';

interface Client {
  id: string;
  name?: string;
  email: string;
  businessName: string;
  budget: string;
  projectStatus?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number } | null;
  updatedAt?: { seconds: number } | null;
}

const statusColors: Record<string, string> = {
  onboarding: 'bg-warning/10 text-warning',
  planning:   'bg-primary/10 text-primary',
  active:     'bg-success/10 text-success',
  paused:     'bg-muted text-muted-foreground',
  completed:  'bg-secondary text-secondary-foreground',
};

const budgetMap: Record<string, number> = {
  starter:    1000,
  growth:     2500,
  scale:      5000,
  enterprise: 8000,
};

function getClientStatus(client: Client): string {
  if (!client.onboardingCompleted) return 'onboarding';
  switch (client.projectStatus) {
    case 'Strategy':
    case 'Planning':  return 'planning';
    case 'Active':    return 'active';
    case 'Paused':    return 'paused';
    case 'Completed': return 'completed';
    default:          return 'planning';
  }
}

function buildChartData(clients: Client[]) {
  const map: Record<string, { month: string; revenue: number; count: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = {
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: 0,
      count: 0,
    };
  }
  clients.forEach(c => {
    const ts = c.createdAt;
    if (!ts || !('seconds' in ts)) return;
    const d = new Date(ts.seconds * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (map[key]) {
      map[key].revenue += budgetMap[c.budget] || 0;
      map[key].count   += 1;
    }
  });
  return Object.values(map);
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [clients, setClients]       = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  
  // Advanced filtering
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterBudget, setFilterBudget] = useState<string>('all');
  const [filterIndustry, setFilterIndustry] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'week' | 'month' | 'quarter' | 'year'>('all');
  const [filterTags, setFilterTags] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const list: Client[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Client, 'id'>),
      }));
      setClients(list);
    });
    return () => unsub();
  }, []);

  const filteredClients = useMemo(() => {
    let filtered = [...clients];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.businessName?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (filterStatuses.length > 0) {
      filtered = filtered.filter(c => {
        const status = getClientStatus(c);
        return filterStatuses.includes(status);
      });
    }
    
    // Budget filter
    if (filterBudget !== 'all') {
      filtered = filtered.filter(c => c.budget === filterBudget);
    }
    
    // Industry filter
    if (filterIndustry !== 'all') {
      filtered = filtered.filter(c => c.industry === filterIndustry);
    }
    
    // Tags filter
    if (filterTags.length > 0) {
      filtered = filtered.filter(c => {
        if (!c.tags || c.tags.length === 0) return false;
        return filterTags.some(tag => c.tags?.includes(tag));
      });
    }
    
    // Date range filter
    if (filterDateRange !== 'all') {
      const now = Date.now();
      let cutoffDate = 0;
      
      switch (filterDateRange) {
        case 'week':
          cutoffDate = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = now - (30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          cutoffDate = now - (90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = now - (365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      filtered = filtered.filter(c => {
        const createdDate = c.createdAt?.seconds 
          ? c.createdAt.seconds * 1000 
          : 0;
        return createdDate >= cutoffDate;
      });
    }
    
    return filtered;
  }, [clients, searchQuery, filterStatuses, filterBudget, filterIndustry, filterTags, filterDateRange]);
  
  // Get unique industries and tags
  const industries = useMemo(() => {
    const unique = new Set<string>();
    clients.forEach(c => {
      if (c.industry) unique.add(c.industry);
    });
    return Array.from(unique).sort();
  }, [clients]);
  
  const allTags = useMemo(() => {
    const unique = new Set<string>();
    clients.forEach(c => {
      if (c.tags) {
        c.tags.forEach(tag => unique.add(tag));
      }
    });
    return Array.from(unique).sort();
  }, [clients]);
  
  // Bulk actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedClients.size === 0) {
      toast({ title: 'No clients selected', variant: 'destructive' });
      return;
    }
    
    try {
      const batch = writeBatch(db);
      selectedClients.forEach(clientId => {
        const clientRef = doc(db, 'clients', clientId);
        batch.update(clientRef, { projectStatus: newStatus });
      });
      await batch.commit();
      
      toast({ 
        title: 'Success', 
        description: `Updated status for ${selectedClients.size} client(s)` 
      });
      setSelectedClients(new Set());
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to update client statuses',
        variant: 'destructive'
      });
    }
  };
  
  const handleBulkExport = () => {
    if (selectedClients.size === 0) {
      toast({ title: 'No clients selected', variant: 'destructive' });
      return;
    }
    
    const selectedClientData = filteredClients.filter(c => selectedClients.has(c.id));
    const csvContent = [
      ['Name', 'Email', 'Business Name', 'Status', 'Budget', 'Industry', 'Tags'].join(','),
      ...selectedClientData.map(c => [
        c.name || '',
        c.email,
        c.businessName,
        getClientStatus(c),
        c.budget || '',
        c.industry || '',
        (c.tags || []).join(';')
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: 'Export successful', description: 'Client data exported to CSV' });
  };

  const handleUpdateClientTags = async (clientId: string, newTag: string) => {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const client = clients.find(c => c.id === clientId);
      
      if (!client) return;

      let updatedTags: string[] = [];
      
      if (newTag.trim()) {
        // Add new tag
        const existingTags = client.tags || [];
        if (!existingTags.includes(newTag.trim())) {
          updatedTags = [...existingTags, newTag.trim()];
        } else {
          // Remove tag if it already exists
          updatedTags = existingTags.filter(t => t !== newTag.trim());
        }
      } else {
        // Clear all tags
        updatedTags = [];
      }

      await updateDoc(clientRef, { tags: updatedTags });
      toast({ 
        title: 'Success', 
        description: newTag.trim() 
          ? (client.tags?.includes(newTag.trim()) ? 'Tag removed' : 'Tag added')
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
  
  // Calculate health scores (simplified - would need actual task/report data)
  const clientHealthScores = useMemo(() => {
    const scores = new Map<string, ReturnType<typeof calculateHealthScore>>();
    filteredClients.forEach(client => {
      // Simplified calculation - in production, fetch actual metrics
      const healthScore = calculateHealthScore({
        engagementLevel: 70, // Would calculate from actual data
        taskCompletionRate: 75,
        reportSubmissionFrequency: 80,
        responseTime: 70,
      });
      scores.set(client.id, healthScore);
    });
    return scores;
  }, [filteredClients]);

  const totalRevenue = useMemo(
    () => clients.reduce((sum, c) => sum + (budgetMap[c.budget] || 0), 0),
    [clients]
  );
  
  const activeCampaigns = useMemo(
    () => clients.filter(c => getClientStatus(c) === 'active').length,
    [clients]
  );

  const statusCounts = useMemo(() => ({
    onboarding: clients.filter(c => getClientStatus(c) === 'onboarding').length,
    planning:   clients.filter(c => getClientStatus(c) === 'planning').length,
    active:     clients.filter(c => getClientStatus(c) === 'active').length,
    paused:     clients.filter(c => getClientStatus(c) === 'paused').length,
    completed:  clients.filter(c => getClientStatus(c) === 'completed').length,
  }), [clients]);

  const recentClients = useMemo(() =>
    [...clients]
      .filter(c => c.createdAt && 'seconds' in c.createdAt)
      .sort((a, b) => (b.createdAt as { seconds: number }).seconds - (a.createdAt as { seconds: number }).seconds)
      .slice(0, 5),
    [clients]
  );

  const chartData = useMemo(() => buildChartData(clients), [clients]);

  const topStats = [
    { title: 'Total Clients',    value: clients.length,             icon: Users,      color: 'bg-primary/10 text-primary' },
    { title: 'Active Campaigns', value: activeCampaigns,            icon: TrendingUp, color: 'bg-success/10 text-success' },
    { title: 'Monthly Revenue',  value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-accent/10 text-accent' },
  ];

  const statusBreakdown = [
    { label: 'Onboarding', count: statusCounts.onboarding, icon: Clock,         color: 'text-warning',            bg: 'bg-warning/10' },
    { label: 'Planning',   count: statusCounts.planning,   icon: Target,        color: 'text-primary',            bg: 'bg-primary/10' },
    { label: 'Active',     count: statusCounts.active,     icon: Activity,      color: 'text-success',            bg: 'bg-success/10' },
    { label: 'Paused',     count: statusCounts.paused,     icon: PauseCircle,   color: 'text-muted-foreground',   bg: 'bg-muted' },
    { label: 'Completed',  count: statusCounts.completed,  icon: CheckCircle2,  color: 'text-secondary-foreground', bg: 'bg-secondary' },
  ];

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage clients and monitor campaigns</p>
        </motion.div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topStats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statusBreakdown.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{s.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue Chart + Recent Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue from new clients — last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v === 0 ? '₹0' : `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Clients</CardTitle>
              <CardDescription>Latest registrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentClients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No clients yet.</p>
              )}
              {recentClients.map(client => {
                const status = getClientStatus(client);
                const label  = client.businessName || client.email;
                return (
                  <Link
                    key={client.id}
                    to={adminClientPath(client.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    <Badge className={`ml-2 text-xs flex-shrink-0 ${statusColors[status]}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>All Clients</CardTitle>
                <CardDescription>
                  {filteredClients.length} of {clients.length} clients
                </CardDescription>
              </div>
              {selectedClients.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions ({selectedClients.size})
                      <MoreVertical className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                      Set Status: Active
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('paused')}>
                      Set Status: Paused
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('onboarding')}>
                      Set Status: Onboarding
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleBulkExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export to CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Advanced Filters */}
              <div className="flex flex-wrap gap-2">
                <Select 
                  value={filterBudget} 
                  onValueChange={setFilterBudget}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Budgets</SelectItem>
                    {Object.keys(budgetMap).map(budget => (
                      <SelectItem key={budget} value={budget}>{budget}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {industries.length > 0 && (
                  <Select 
                    value={filterIndustry} 
                    onValueChange={setFilterIndustry}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                <Select 
                  value={filterDateRange} 
                  onValueChange={(v) => setFilterDateRange(v as typeof filterDateRange)}
                >
                  <SelectTrigger className="w-[140px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                
                {(filterStatuses.length > 0 || filterTags.length > 0 || filterBudget !== 'all' || filterIndustry !== 'all' || filterDateRange !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStatuses([]);
                      setFilterBudget('all');
                      setFilterIndustry('all');
                      setFilterDateRange('all');
                      setFilterTags([]);
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
              
              {/* Status Filters */}
              <div className="flex flex-wrap gap-2">
                {['onboarding', 'planning', 'active', 'paused', 'completed'].map(status => (
                  <Button
                    key={status}
                    variant={filterStatuses.includes(status) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFilterStatuses(prev => 
                        prev.includes(status)
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      );
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {selectedClients.size > 0 && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedClients.size} client{selectedClients.size !== 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedClients(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClients(new Set(filteredClients.map(c => c.id)));
                        } else {
                          setSelectedClients(new Set());
                        }
                      }}
                      aria-label="Select all clients"
                    />
                  </TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredClients.map((client) => {
                  const status = getClientStatus(client);
                  const isSelected = selectedClients.has(client.id);
                  const lastActive = client.updatedAt?.seconds 
                    ? new Date(client.updatedAt.seconds * 1000)
                    : client.createdAt?.seconds
                    ? new Date(client.createdAt.seconds * 1000)
                    : null;
                  
                  return (
                    <TableRow key={client.id} className={isSelected ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedClients);
                            if (checked) {
                              newSelected.add(client.id);
                            } else {
                              newSelected.delete(client.id);
                            }
                            setSelectedClients(newSelected);
                          }}
                          aria-label={`Select ${client.businessName || client.email}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name || client.businessName || '—'}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{client.businessName}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[status]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {clientHealthScores.has(client.id) && (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <Badge className={getHealthScoreColor(clientHealthScores.get(client.id)!.level)}>
                                    {clientHealthScores.get(client.id)!.score}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-semibold">Health Score: {clientHealthScores.get(client.id)!.score}/100</p>
                                  <p className="text-xs">Level: {clientHealthScores.get(client.id)!.level}</p>
                                  {clientHealthScores.get(client.id)!.factors.length > 0 && (
                                    <div className="text-xs">
                                      <p className="font-medium mt-2">Factors:</p>
                                      <ul className="list-disc list-inside">
                                        {clientHealthScores.get(client.id)!.factors.map((factor, i) => (
                                          <li key={i}>{factor}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell>₹{(budgetMap[client.budget] || 0).toLocaleString()}/mo</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {client.tags && client.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {client.tags.slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {client.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{client.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              // Open tag management dialog
                              const newTag = prompt('Add a tag (or leave empty to remove all tags):');
                              if (newTag !== null) {
                                handleUpdateClientTags(client.id, newTag.trim());
                              }
                            }}
                          >
                            <Tag className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lastActive ? (
                          <TooltipProvider>
                            <UITooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground cursor-help">
                                  {lastActive.toLocaleDateString()}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{lastActive.toLocaleString()}</p>
                              </TooltipContent>
                            </UITooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={adminClientPath(client.id)}>
                            View <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredClients.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">No clients found.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
