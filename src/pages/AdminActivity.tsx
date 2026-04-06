import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UserPlus, FileText, RefreshCw, CheckSquare, DollarSign, Layers, UserCheck, Search, Filter, Download, Calendar } from 'lucide-react';
import { db } from '@/lib/firebase';
import { adminClientPath } from '@/lib/routes';
import { collection, onSnapshot, getDocs, collectionGroup, query, orderBy, where, limit } from 'firebase/firestore';

interface Client {
  id: string;
  email?: string;
  businessName?: string;
  projectStatus?: string;
  onboardingCompleted?: boolean;
  createdAt?: { seconds: number };
  updatedAt?: { seconds: number };
}
interface Report {
  clientId: string;
  clientName?: string;
  month?: string;
  createdAt?: { seconds: number };
}
interface ActivityItem {
  id: string;
  type: 'registration' | 'report' | 'status_change' | string;
  title: string;
  subtitle: string;
  clientId: string;
  ts: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  registration:      { icon: UserPlus,    color: 'text-primary bg-primary/10',      label: 'New Client'       },
  report:            { icon: FileText,    color: 'text-success bg-success/10',      label: 'Report Added'     },
  status_change:     { icon: RefreshCw,   color: 'text-accent bg-accent/10',         label: 'Status Change'     },
  task_created:      { icon: CheckSquare, color: 'text-primary bg-primary/10',      label: 'Task Created'      },
  task_completed:    { icon: CheckSquare, color: 'text-success bg-success/10',      label: 'Task Completed'     },
  invoice_created:   { icon: DollarSign,  color: 'text-warning bg-warning/10',      label: 'Invoice Created'     },
  invoice_paid:       { icon: DollarSign,  color: 'text-success bg-success/10',      label: 'Invoice Paid'       },
  plan_created:      { icon: Layers,      color: 'text-primary bg-primary/10',      label: 'Plan Created'       },
  plan_updated:      { icon: Layers,      color: 'text-accent bg-accent/10',         label: 'Plan Updated'       },
  onboarding_completed: { icon: UserCheck, color: 'text-success bg-success/10',      label: 'Onboarding Done'     },
  // Legacy asset types (no longer used but may exist in database)
  asset_uploaded:    { icon: FileText,    color: 'text-muted-foreground bg-muted',   label: 'Asset Uploaded'      },
  asset_approved:    { icon: FileText,    color: 'text-muted-foreground bg-muted',   label: 'Asset Approved'     },
  asset_rejected:    { icon: FileText,    color: 'text-muted-foreground bg-muted',   label: 'Asset Rejected'     },
  // Default fallback for unknown types
  default:           { icon: FileText,    color: 'text-muted-foreground bg-muted',   label: 'Activity'           },
};

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(diff / 3600000);
  const day  = Math.floor(diff / 86400000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  if (hr  < 24)  return `${hr}h ago`;
  if (day < 30)  return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function AdminActivity() {
  const [clients, setClients] = useState<Client[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'clients'), snap =>
      setClients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Client)))
    );
    getDocs(collectionGroup(db, 'reports')).then(snap => {
      setReports(snap.docs.map(d => ({
        clientId: d.ref.parent.parent?.id ?? '',
        ...d.data(),
      } as Report)));
    });
    // Load activities from dedicated collection
    const unsub2 = onSnapshot(
      query(collection(db, 'activities'), orderBy('ts', 'desc'), limit(500)),
      snap => {
        const items = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type || 'registration',
            title: data.title || '',
            subtitle: data.subtitle || '',
            clientId: data.clientId || '',
            ts: data.ts || Date.now(),
          } as ActivityItem;
        });
        setActivities(items);
      }
    );
    return () => { unsub1(); unsub2(); };
  }, []);

  const clientMap = useMemo(
    () => Object.fromEntries(clients.map(c => [c.id, c.businessName || c.email || c.id])),
    [clients]
  );

  const feed = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    // Use activities from dedicated collection if available, otherwise fallback to computed
    if (activities.length > 0) {
      return activities.slice(0, 50);
    }

    // Fallback: compute from clients and reports (for backward compatibility)
    clients.forEach(c => {
      if (!c.createdAt?.seconds) return;
      items.push({
        id:       `reg-${c.id}`,
        type:     'registration',
        title:    `${c.businessName || c.email} registered`,
        subtitle: c.email ?? '',
        clientId: c.id,
        ts:       c.createdAt.seconds * 1000,
      });
    });

    reports.forEach((r, i) => {
      if (!r.createdAt?.seconds) return;
      items.push({
        id:       `rep-${r.clientId}-${i}`,
        type:     'report',
        title:    `${clientMap[r.clientId] || r.clientId} — ${r.month || 'report'} added`,
        subtitle: `Campaign report submitted`,
        clientId: r.clientId,
        ts:       r.createdAt.seconds * 1000,
      });
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 50);
  }, [clients, reports, clientMap, activities]);

  // Filter feed by search query
  const filteredFeed = useMemo(() => {
    if (!searchQuery.trim()) return feed;
    const query = searchQuery.toLowerCase();
    return feed.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.subtitle.toLowerCase().includes(query) ||
      (clientMap[item.clientId] || '').toLowerCase().includes(query)
    );
  }, [feed, searchQuery, clientMap]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    filteredFeed.forEach(item => {
      const dateKey = new Date(item.ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredFeed]);

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold">Activity Feed</h1>
              <p className="text-muted-foreground">Real-time events across all clients</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
          {[
            { label: 'Total Events', value: filteredFeed.length },
            { label: 'New Clients',  value: filteredFeed.filter(f => f.type === 'registration').length },
            { label: 'Reports',      value: filteredFeed.filter(f => f.type === 'report').length },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {Object.entries(grouped).length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No activity yet.</CardContent></Card>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{date}</p>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {items.map((item, i) => {
                    const cfg  = TYPE_CONFIG[item.type] || TYPE_CONFIG.default;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <Badge variant="outline" className="text-xs hidden sm:inline-flex">{cfg.label}</Badge>
                          <span className="text-xs text-muted-foreground">{relativeTime(item.ts)}</span>
                          <Link to={adminClientPath(item.clientId)} className="text-muted-foreground hover:text-foreground">
                            <FileText className="h-4 w-4" />
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
