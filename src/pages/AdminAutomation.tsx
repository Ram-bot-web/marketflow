import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Calendar,
  DollarSign,
  Bell,
  UserCheck,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  autoGenerateMonthlyInvoices,
  checkAndSendPaymentReminders,
  autoGenerateTasksFromWeeklyPlan,
} from '@/lib/automation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AutomationTask {
  id: string;
  name: string;
  description: string;
  icon: typeof Zap;
  action: () => Promise<{ created?: number; skipped?: number; remindersSent?: number; overdueUpdated?: number }>;
  frequency: 'manual' | 'daily' | 'monthly';
  lastRun?: Date;
}

export default function AdminAutomation() {
  const { toast } = useToast();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const automationTasks: AutomationTask[] = [
    {
      id: 'generate-invoices',
      name: 'Generate Monthly Invoices',
      description: 'Auto-generate invoices for all active clients for the current month',
      icon: DollarSign,
      action: async () => {
        const result = await autoGenerateMonthlyInvoices();
        return result;
      },
      frequency: 'monthly',
    },
    {
      id: 'payment-reminders',
      name: 'Check Payment Reminders',
      description: 'Check for overdue invoices and send payment reminders',
      icon: Bell,
      action: async () => {
        const result = await checkAndSendPaymentReminders();
        return result;
      },
      frequency: 'daily',
    },
  ];

  const handleRun = async (task: AutomationTask) => {
    setRunning(task.id);
    try {
      const result = await task.action();
      setResults({ ...results, [task.id]: { ...result, timestamp: new Date() } });
      
      let message = '';
      if (task.id === 'generate-invoices') {
        message = `Created ${result.created || 0} invoice${result.created !== 1 ? 's' : ''}, skipped ${result.skipped || 0}`;
      } else if (task.id === 'payment-reminders') {
        message = `Sent ${result.remindersSent || 0} reminder${result.remindersSent !== 1 ? 's' : ''}, updated ${result.overdueUpdated || 0} overdue invoice${result.overdueUpdated !== 1 ? 's' : ''}`;
      }

      toast({
        title: 'Automation completed',
        description: message || 'Task completed successfully.',
      });
    } catch (error) {
      console.error('Error running automation:', error);
      toast({
        title: 'Error',
        description: 'Failed to run automation. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setRunning(null);
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    const config = {
      manual: { label: 'Manual', color: 'bg-secondary text-secondary-foreground' },
      daily: { label: 'Daily', color: 'bg-primary/10 text-primary' },
      monthly: { label: 'Monthly', color: 'bg-accent/10 text-accent' },
    };
    const cfg = config[frequency as keyof typeof config] || config.manual;
    return <Badge className={cfg.color}>{cfg.label}</Badge>;
  };

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Automation Center</h1>
              <p className="text-muted-foreground">
                Manage automated tasks and workflows
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              About Automations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These automations can be run manually or set up to run automatically via Firebase Cloud Functions.
              For scheduled automations (daily/monthly), you'll need to deploy Firebase Functions. See the
              documentation in <code className="text-xs bg-muted px-1 py-0.5 rounded">AUTOMATION_SUGGESTIONS.md</code> for setup instructions.
            </p>
          </CardContent>
        </Card>

        {/* Automation Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automationTasks.map((task) => {
            const Icon = task.icon;
            const result = results[task.id];
            const isRunning = running === task.id;

            return (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{task.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {getFrequencyBadge(task.frequency)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-2">{task.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result && (
                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-medium">Last run: {result.timestamp?.toLocaleString()}</span>
                      </div>
                      {task.id === 'generate-invoices' && (
                        <div className="text-xs text-muted-foreground pl-6">
                          Created: {result.created || 0} | Skipped: {result.skipped || 0}
                        </div>
                      )}
                      {task.id === 'payment-reminders' && (
                        <div className="text-xs text-muted-foreground pl-6">
                          Reminders: {result.remindersSent || 0} | Overdue: {result.overdueUpdated || 0}
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    onClick={() => handleRun(task)}
                    disabled={isRunning}
                    className="w-full"
                    variant={task.frequency === 'manual' ? 'default' : 'outline'}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Automation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Automations</CardTitle>
            <CardDescription>
              Automations that run automatically based on events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  name: 'Task Generation from Weekly Plans',
                  status: 'active',
                  description: 'Auto-generates tasks when weekly plans are saved',
                  trigger: 'Weekly plan saved/updated',
                },
                {
                  name: 'Onboarding Task Assignment',
                  status: 'active',
                  description: 'Auto-assigns initial tasks when onboarding is completed',
                  trigger: 'Onboarding completed',
                },
                {
                  name: 'Client Status Transitions',
                  status: 'active',
                  description: 'Auto-updates client status based on workflow rules',
                  trigger: 'Client data changes',
                },
              ].map((auto, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border border-border rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{auto.name}</span>
                      <Badge className="bg-success/10 text-success">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{auto.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Trigger: <span className="font-medium">{auto.trigger}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


