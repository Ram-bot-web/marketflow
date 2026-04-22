import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ChevronRight, TrendingUp, DollarSign, Target } from 'lucide-react';
import { db } from '@/lib/firebase';
import { adminClientPath } from '@/lib/routes';
import { collection, onSnapshot, collectionGroup } from 'firebase/firestore';

interface Client {
  id: string;
  email?: string;
  businessName?: string;
}

interface Report {
  id: string;
  clientId: string;
  clientName: string;
  month: string;
  leads: number;
  adSpend: number;
  costPerLead: number;
  notes?: string;
}

export default function AdminReports() {
  const [clients,     setClients]     = useState<Client[]>([]);
  const [reports,     setReports]     = useState<Report[]>([]);
  const [filterClient, setFilterClient] = useState('all');
  const [filterMonth,  setFilterMonth]  = useState('');
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
      setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)));
    });

    const unsubReports = onSnapshot(collectionGroup(db, 'reports'), (snap) => {
      const list: Report[] = snap.docs.map((d) => {
        const clientId = d.ref.parent.parent?.id ?? '';
        return { id: d.id, clientId, clientName: '', ...d.data() } as Report;
      });
      setReports(list);
    });

    return () => {
      unsubClients();
      unsubReports();
    };
  }, []);

  // Attach client names once both are loaded
  const enrichedReports = useMemo(() => {
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c.businessName || c.email || c.id]));
    return reports.map(r => ({ ...r, clientName: clientMap[r.clientId] || r.clientId }));
  }, [reports, clients]);

  const filtered = useMemo(() => enrichedReports.filter(r => {
    const matchClient = filterClient === 'all' || r.clientId === filterClient;
    const matchMonth  = !filterMonth || r.month.toLowerCase().includes(filterMonth.toLowerCase());
    const matchSearch = !search || r.clientName.toLowerCase().includes(search.toLowerCase()) || r.month.toLowerCase().includes(search.toLowerCase());
    return matchClient && matchMonth && matchSearch;
  }), [enrichedReports, filterClient, filterMonth, search]);

  const totalLeads    = filtered.reduce((s, r) => s + (r.leads    || 0), 0);
  const totalAdSpend  = filtered.reduce((s, r) => s + (r.adSpend  || 0), 0);
  const avgCPL        = totalLeads > 0 ? totalAdSpend / totalLeads : 0;

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-4 sm:space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-2xl font-bold">Reports Center</h1>
          <p className="text-muted-foreground">All campaign reports across every client</p>
        </motion.div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Leads',    value: totalLeads,                          icon: Target,    color: 'text-success bg-success/10' },
            { label: 'Total Ad Spend', value: `₹${totalAdSpend.toLocaleString()}`, icon: DollarSign,color: 'text-primary bg-primary/10' },
            { label: 'Avg CPL',        value: `₹${avgCPL.toFixed(2)}`,             icon: TrendingUp,color: 'text-accent bg-accent/10'   },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label} ({filtered.length} reports)</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Reports</CardTitle>
            <CardDescription>Filter by client or month</CardDescription>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.businessName || c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Filter by month (e.g. Feb)"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="w-56"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Ad Spend</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={`${r.clientId}-${r.id}`}>
                    <TableCell>
                      <span className="font-medium text-sm">{r.clientName}</span>
                    </TableCell>
                    <TableCell className="text-sm">{r.month}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-success/10 text-success">{r.leads}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">₹{(r.adSpend || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm text-primary">₹{(r.costPerLead || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.notes || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={adminClientPath(r.clientId)}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">No reports found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
