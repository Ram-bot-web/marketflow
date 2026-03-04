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
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle, FileText, Target
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import { R } from '@/lib/routes';
import { Link } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  status: string;
  dueDate?: string;
  week?: string;
  createdAt?: { seconds: number };
}

interface Report {
  id: string;
  month?: string;
  createdAt?: { seconds: number };
}

interface Invoice {
  id: string;
  month?: string;
  dueDate?: string;
  status: string;
}

interface CalendarEvent {
  date: Date;
  type: 'task' | 'report' | 'invoice' | 'milestone';
  title: string;
  status?: string;
  id: string;
  link?: string;
}

export default function Calendar() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub1 = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tasks:', error);
        setLoading(false);
      }
    );

    const unsub2 = onSnapshot(
      query(
        collection(db, 'clients', user.uid, 'reports'),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
      }
    );

    const unsub3 = onSnapshot(
      query(
        collection(db, 'invoices'),
        where('clientId', '==', user.uid)
      ),
      (snap) => {
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
      }
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  // Build calendar events
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Add tasks
    tasks.forEach(task => {
      if (task.dueDate) {
        try {
          const date = new Date(task.dueDate);
          if (!isNaN(date.getTime())) {
            events.push({
              date,
              type: 'task',
              title: task.title,
              status: task.status,
              id: task.id,
              link: R.TASKS,
            });
          }
        } catch (e) {
          // Invalid date
        }
      }
    });

    // Add reports (use month to estimate date)
    reports.forEach(report => {
      if (report.month) {
        try {
          const date = new Date(report.month + '-01');
          if (!isNaN(date.getTime())) {
            events.push({
              date,
              type: 'report',
              title: `Report: ${report.month}`,
              id: report.id,
              link: R.RESULTS,
            });
          }
        } catch (e) {
          // Invalid date
        }
      }
    });

    // Add invoices
    invoices.forEach(invoice => {
      if (invoice.dueDate) {
        try {
          const date = new Date(invoice.dueDate);
          if (!isNaN(date.getTime())) {
            events.push({
              date,
              type: 'invoice',
              title: `Invoice: ${invoice.month || 'Payment'}`,
              status: invoice.status,
              id: invoice.id,
              link: R.INVOICES,
            });
          }
        } catch (e) {
          // Invalid date
        }
      }
    });

    return events;
  }, [tasks, reports, invoices]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => {
      return event.date.getDate() === date.getDate() &&
             event.date.getMonth() === date.getMonth() &&
             event.date.getFullYear() === date.getFullYear();
    });
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    const days: Array<{ date: Date; isCurrentMonth: boolean; events: CalendarEvent[] }> = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const date = new Date(current);
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        events: getEventsForDate(date),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, calendarEvents]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventColor = (type: string, status?: string) => {
    if (type === 'task') {
      if (status === 'done') return 'bg-success/10 text-success border-success/20';
      if (status === 'in_progress') return 'bg-primary/10 text-primary border-primary/20';
      return 'bg-warning/10 text-warning border-warning/20';
    }
    if (type === 'invoice') {
      if (status === 'paid') return 'bg-success/10 text-success border-success/20';
      if (status === 'overdue') return 'bg-destructive/10 text-destructive border-destructive/20';
      return 'bg-warning/10 text-warning border-warning/20';
    }
    if (type === 'report') return 'bg-accent/10 text-accent border-accent/20';
    return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return CheckCircle2;
      case 'invoice':
        return AlertCircle;
      case 'report':
        return FileText;
      default:
        return Target;
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                Calendar
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View your tasks, reports, and important dates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Calendar Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonCard />
            ) : (
              <div className="space-y-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={idx}
                        className={`min-h-[100px] p-2 border border-border rounded-lg ${
                          !day.isCurrentMonth ? 'opacity-40' : ''
                        } ${isToday ? 'bg-primary/5 border-primary' : 'bg-card'}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                          {day.date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {day.events.slice(0, 3).map(event => {
                            const EventIcon = getEventIcon(event.type);
                            return (
                              <Link
                                key={event.id}
                                to={event.link || '#'}
                                className={`block text-xs p-1 rounded border ${getEventColor(event.type, event.status)} hover:opacity-80 transition-opacity`}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <EventIcon className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{event.title}</span>
                                </div>
                              </Link>
                            );
                          })}
                          {day.events.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{day.events.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border bg-warning/10 border-warning/20" />
                <span className="text-sm">Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border bg-accent/10 border-accent/20" />
                <span className="text-sm">Reports</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border bg-warning/10 border-warning/20" />
                <span className="text-sm">Invoices</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border bg-primary/5 border-primary" />
                <span className="text-sm">Today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events Summary */}
        {!loading && calendarEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {calendarEvents
                  .filter(event => {
                    const eventDate = event.date;
                    const today = new Date();
                    const weekFromNow = new Date();
                    weekFromNow.setDate(today.getDate() + 7);
                    return eventDate >= today && eventDate <= weekFromNow;
                  })
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .slice(0, 5)
                  .map(event => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-2 border border-border rounded hover:bg-secondary/50 transition-colors"
                      >
                        <div className={`h-8 w-8 rounded flex items-center justify-center ${getEventColor(event.type, event.status)}`}>
                          <EventIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.date.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}


