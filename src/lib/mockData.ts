 // Mock data for the MarketFlow application
 
 export interface Client {
   id: string;
   name: string;
   businessName: string;
   email: string;
   status: 'onboarding' | 'planning' | 'active' | 'paused' | 'completed';
   joinedDate: string;
   plan: string;
   monthlyBudget: number;
 }
 
 export interface Report {
   id: string;
   month: string;
   leads: number;
   adSpend: number;
   costPerLead: number;
   notes: string;
 }
 
 export const mockClients: Client[] = [
   {
     id: '1',
     name: 'Sarah Johnson',
     businessName: 'Fresh Bakes Co.',
     email: 'sarah@freshbakes.com',
     status: 'active',
     joinedDate: '2024-01-15',
     plan: 'Growth',
     monthlyBudget: 2500,
   },
   {
     id: '2',
     name: 'Michael Chen',
     businessName: 'TechStart Solutions',
     email: 'michael@techstart.io',
     status: 'planning',
     joinedDate: '2024-02-01',
     plan: 'Starter',
     monthlyBudget: 1000,
   },
   {
     id: '3',
     name: 'Emily Rodriguez',
     businessName: 'Bloom Wellness',
     email: 'emily@bloomwellness.com',
     status: 'active',
     joinedDate: '2023-11-20',
     plan: 'Enterprise',
     monthlyBudget: 5000,
   },
   {
     id: '4',
     name: 'David Park',
     businessName: 'Urban Eats',
     email: 'david@urbaneats.com',
     status: 'onboarding',
     joinedDate: '2024-02-10',
     plan: 'Growth',
     monthlyBudget: 2000,
   },
   {
     id: '5',
     name: 'Lisa Thompson',
     businessName: 'Coastal Realty',
     email: 'lisa@coastalrealty.com',
     status: 'completed',
     joinedDate: '2023-08-05',
     plan: 'Enterprise',
     monthlyBudget: 4500,
   },
 ];
 
 export const mockReports: Record<string, Report[]> = {
   '1': [
     { id: 'r1', month: 'January 2024', leads: 45, adSpend: 2100, costPerLead: 46.67, notes: 'Strong performance on Instagram. Consider increasing budget.' },
     { id: 'r2', month: 'December 2023', leads: 38, adSpend: 2000, costPerLead: 52.63, notes: 'Holiday season showed lower engagement.' },
   ],
   '2': [
     { id: 'r3', month: 'January 2024', leads: 22, adSpend: 950, costPerLead: 43.18, notes: 'LinkedIn campaigns performing well for B2B audience.' },
   ],
   '3': [
     { id: 'r4', month: 'January 2024', leads: 89, adSpend: 4800, costPerLead: 53.93, notes: 'Wellness trends driving high engagement.' },
     { id: 'r5', month: 'December 2023', leads: 72, adSpend: 4500, costPerLead: 62.50, notes: 'New Year resolution traffic spike expected.' },
   ],
 };
 
 export const mockCurrentUser = {
   id: '1',
   name: 'Sarah Johnson',
   businessName: 'Fresh Bakes Co.',
   email: 'sarah@freshbakes.com',
   role: 'client' as const,
 };
 
 export const mockAdminUser = {
   id: 'admin1',
   name: 'Alex Admin',
   email: 'alex@marketflow.com',
   role: 'admin' as const,
 };
 
 export const platformsList = [
   { name: 'Instagram', icon: 'instagram', status: 'active' },
   { name: 'Facebook', icon: 'facebook', status: 'active' },
   { name: 'Google Ads', icon: 'search', status: 'planned' },
   { name: 'TikTok', icon: 'video', status: 'planned' },
   { name: 'LinkedIn', icon: 'linkedin', status: 'inactive' },
 ];
 
 export const weeklyRoadmap = [
   { week: 'Week 1', tasks: ['Audience research', 'Content calendar setup', 'Ad creative briefing'] },
   { week: 'Week 2', tasks: ['Launch Instagram campaign', 'A/B testing ad copies', 'Monitor initial metrics'] },
   { week: 'Week 3', tasks: ['Optimize performing ads', 'Scale budget on winners', 'Retargeting setup'] },
   { week: 'Week 4', tasks: ['Monthly report preparation', 'Strategy review call', 'Next month planning'] },
 ];