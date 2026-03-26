import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Mail, Building, Phone, Lock, Bell, Download, CreditCard, Shield, Target
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface ClientData {
  name?: string;
  email?: string;
  businessName?: string;
  phone?: string;
  budget?: string;
  projectStatus?: string;
  onboardingCompleted?: boolean;
}

export default function Profile() {
  const { toast } = useToast();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [monthlyGoalLeads, setMonthlyGoalLeads] = useState<number>(0);
  const [monthlyGoalSpend, setMonthlyGoalSpend] = useState<number>(0);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(true);
  const [emailNotificationTypes, setEmailNotificationTypes] = useState<string[]>(['all']);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'clients', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ClientData & { monthlyGoalLeads?: number; monthlyGoalSpend?: number };
        setClientData(data);
        setName(data.name || '');
        setBusinessName(data.businessName || '');
        setPhone(data.phone || '');
        setMonthlyGoalLeads(data.monthlyGoalLeads || 0);
        setMonthlyGoalSpend(data.monthlyGoalSpend || 0);
        setEmailNotificationsEnabled(data.emailNotificationsEnabled !== false);
        setEmailNotificationTypes(data.emailNotificationTypes || ['all']);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleUpdateProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'clients', user.uid), {
        name: name.trim(),
        businessName: businessName.trim(),
        phone: phone.trim(),
      });
      toast({ title: 'Success', description: 'Profile updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateGoals = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'clients', user.uid), {
        monthlyGoalLeads: monthlyGoalLeads || 0,
        monthlyGoalSpend: monthlyGoalSpend || 0,
      });
      toast({ title: 'Success', description: 'Monthly goals updated successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update goals', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) return;

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      toast({ title: 'Success', description: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast({ title: 'Error', description: 'Current password is incorrect', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Failed to update password', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const invoicesQuery = query(
        collection(db, 'invoices'),
        where('clientId', '==', user.uid)
      );
      const snapshot = await getDocs(invoicesQuery);
      
      if (snapshot.empty) {
        toast({ title: 'No invoices', description: 'You don\'t have any invoices yet' });
        return;
      }

      // In a real app, this would generate/download PDF invoices
      toast({ title: 'Download', description: 'Invoice download feature coming soon' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch invoices', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Card><CardContent className="p-6"><div className="h-8 bg-secondary animate-pulse rounded" /></CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your account information and preferences</p>
        </motion.div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="subscription">
              <CreditCard className="h-4 w-4 mr-2" />
              Subscription
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="h-4 w-4 mr-2" />
              Goals
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Update your business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={auth.currentUser?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleUpdateProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge>
                      {clientData?.projectStatus || 'Onboarding'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Budget</span>
                    <Badge variant="outline">
                      {clientData?.budget || 'Not set'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Onboarding</span>
                    <Badge variant={clientData?.onboardingCompleted ? 'default' : 'secondary'}>
                      {clientData?.onboardingCompleted ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>View your plan and billing information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Plan</span>
                    <Badge>{clientData?.budget || 'Standard'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Billing Cycle</span>
                    <span className="text-sm text-muted-foreground">Monthly</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleDownloadInvoice}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoices
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive email updates for important events</p>
                  </div>
                  <Switch 
                    checked={emailNotificationsEnabled}
                    onCheckedChange={async (checked) => {
                      setEmailNotificationsEnabled(checked);
                      const user = auth.currentUser;
                      if (user) {
                        try {
                          await updateDoc(doc(db, 'clients', user.uid), {
                            emailNotificationsEnabled: checked,
                          });
                          toast({ title: 'Success', description: 'Email preferences updated' });
                        } catch (error) {
                          toast({ title: 'Error', description: 'Failed to update preferences', variant: 'destructive' });
                          setEmailNotificationsEnabled(!checked);
                        }
                      }
                    }}
                  />
                </div>

                {emailNotificationsEnabled && (
                  <div className="space-y-4 p-4 border border-border rounded-lg">
                    <Label className="text-sm font-medium">Email Notification Types</Label>
                    <p className="text-xs text-muted-foreground mb-3">Select which types of notifications you want to receive via email</p>
                    
                    <div className="space-y-3">
                      {[
                        { id: 'all', label: 'All Notifications', description: 'Receive emails for all events' },
                        { id: 'invoice_created', label: 'Invoices', description: 'New invoices and payment reminders' },
                        { id: 'plan_updated', label: 'Plan Updates', description: 'Marketing plan changes' },
                        { id: 'task_assigned', label: 'Task Assignments', description: 'New tasks assigned to you' },
                        { id: 'report_added', label: 'Reports', description: 'New campaign reports' },
                      ].map((type) => (
                        <div key={type.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={type.id}
                            checked={emailNotificationTypes.includes('all') || emailNotificationTypes.includes(type.id)}
                            disabled={type.id === 'all' && emailNotificationTypes.includes('all')}
                            onCheckedChange={async (checked) => {
                              let newTypes: string[];
                              if (type.id === 'all') {
                                newTypes = checked ? ['all'] : [];
                              } else {
                                if (checked) {
                                  newTypes = emailNotificationTypes.includes('all')
                                    ? emailNotificationTypes.filter(t => t !== 'all').concat(type.id)
                                    : [...emailNotificationTypes, type.id];
                                } else {
                                  newTypes = emailNotificationTypes.filter(t => t !== type.id);
                                }
                              }
                              setEmailNotificationTypes(newTypes);
                              const user = auth.currentUser;
                              if (user) {
                                try {
                                  await updateDoc(doc(db, 'clients', user.uid), {
                                    emailNotificationTypes: newTypes,
                                  });
                                  toast({ title: 'Success', description: 'Email preferences updated' });
                                } catch (error) {
                                  toast({ title: 'Error', description: 'Failed to update preferences', variant: 'destructive' });
                                }
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label htmlFor={type.id} className="text-sm font-medium cursor-pointer">
                              {type.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Email notifications require email service configuration. 
                    Contact your administrator if emails are not being received.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

