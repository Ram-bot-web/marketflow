import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Activity, Search, Download, Calendar, Filter, Clock
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  ts: number;
  metadata?: Record<string, any>;
}

export default function ActivityTimeline() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
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
            metadata: data.metadata || {},
          } as ActivityItem;
        });
        setActivities(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching activities:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredActivities = useMemo(() => {
    let filtered = [...activities];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle?.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(filterDate.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.ts);
        return itemDate >= filterDate;
      });
    }

    return filtered;
  }, [activities, searchQuery, filterType, dateRange]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    activities.forEach(a => types.add(a.type));
    return Array.from(types).sort();
  }, [activities]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Time', 'Type', 'Title', 'Subtitle'].join(','),
      ...filteredActivities.map(a => [
        new Date(a.ts).toLocaleDateString(),
        formatTime(a.ts),
        a.type,
        `"${a.title.replace(/"/g, '""')}"`,
        `"${(a.subtitle || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-timeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: 'Export successful', description: 'Activity log exported to CSV' });
  };

  const getActivityIcon = (type: string) => {
    // Return appropriate icon based on type
    return Activity;
  };

  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      report: 'bg-primary/10 text-primary',
      plan_updated: 'bg-success/10 text-success',
      task_created: 'bg-warning/10 text-warning',
      invoice_created: 'bg-accent/10 text-accent',
      status_change: 'bg-secondary/10 text-secondary-foreground',
    };
    return colorMap[type] || 'bg-muted text-muted-foreground';
  };

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    filteredActivities.forEach(activity => {
      const date = new Date(activity.ts);
      const dateKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    return groups;
  }, [filteredActivities]);

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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                Activity Timeline
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View all your account activities and updates
              </p>
            </div>
            {!loading && filteredActivities.length > 0 && (
              <Button onClick={handleExport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Filters */}
          {!loading && activities.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search activities..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[150px]">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 Days</SelectItem>
                      <SelectItem value="month">Last Month</SelectItem>
                      <SelectItem value="year">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty State */}
        {!loading && activities.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No activities yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your activities will appear here as they occur
              </p>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        {!loading && filteredActivities.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, items]) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {date}
                    </CardTitle>
                    <CardDescription>{items.length} activit{items.length !== 1 ? 'ies' : 'y'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {items.map((activity, idx) => {
                        const ActivityIcon = getActivityIcon(activity.type);
                        return (
                          <div
                            key={activity.id}
                            className="flex gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                          >
                            <div className={`h-10 w-10 rounded-lg ${getActivityColor(activity.type)} flex items-center justify-center flex-shrink-0`}>
                              <ActivityIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{activity.title}</p>
                                  {activity.subtitle && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {activity.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {activity.type.replace(/_/g, ' ')}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(activity.ts)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && activities.length > 0 && filteredActivities.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No activities found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}



