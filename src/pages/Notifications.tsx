import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bell, CheckCircle2, Circle, FileText, CheckSquare, DollarSign, 
  Calendar, Search, Filter, Mail, Settings
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  type: 'report' | 'plan' | 'task' | 'invoice' | 'general';
  title: string;
  subtitle: string;
  read: boolean;
  ts: number;
  clientId?: string;
}

export default function Notifications() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRead, setFilterRead] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'activities'),
        where('clientId', '==', user.uid),
        orderBy('ts', 'desc')
      ),
      (snap) => {
        const notifs: Notification[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type?.includes('report') ? 'report' :
                  data.type?.includes('plan') ? 'plan' :
                  data.type?.includes('task') ? 'task' :
                  data.type?.includes('invoice') ? 'invoice' : 'general',
            title: data.title || 'Notification',
            subtitle: data.subtitle || '',
            read: data.read || false,
            ts: data.ts || Date.now(),
            clientId: data.clientId,
          };
        });
        setNotifications(notifs);
      }
    );

    return () => unsub();
  }, []);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    if (filterType !== 'all') {
      filtered = filtered.filter(n => n.type === filterType);
    }

    if (filterRead !== 'all') {
      filtered = filtered.filter(n => 
        filterRead === 'read' ? n.read : !n.read
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.subtitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, filterType, filterRead, searchQuery]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'activities', id), { read: true });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark as read', variant: 'destructive' });
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(
        unread.map(n => updateDoc(doc(db, 'activities', n.id), { read: true }))
      );
      toast({ title: 'Success', description: 'All notifications marked as read' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'report': return FileText;
      case 'plan': return FileText;
      case 'task': return CheckSquare;
      case 'invoice': return DollarSign;
      default: return Bell;
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'report': return 'bg-primary/10 text-primary';
      case 'plan': return 'bg-success/10 text-success';
      case 'task': return 'bg-warning/10 text-warning';
      case 'invoice': return 'bg-accent/10 text-accent';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Notifications</h1>
              <p className="text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
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
                  <SelectItem value="report">Reports</SelectItem>
                  <SelectItem value="plan">Plans</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-2">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium">No notifications</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || filterType !== 'all' || filterRead !== 'all'
                    ? 'Try adjusting your filters'
                    : 'You\'re all caught up!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notif) => {
              const Icon = getTypeIcon(notif.type);
              return (
                <Card
                  key={notif.id}
                  className={`cursor-pointer transition-colors hover:bg-secondary/50 ${
                    !notif.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                  onClick={() => !notif.read && markAsRead(notif.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-lg ${getTypeColor(notif.type)} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`font-medium ${!notif.read ? 'font-semibold' : ''}`}>
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{notif.subtitle}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(notif.ts)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {notif.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}



