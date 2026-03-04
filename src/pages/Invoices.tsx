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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DollarSign, Download, FileText, CheckCircle2, Clock, AlertCircle, Calendar, Filter, Printer
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  month?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt?: { seconds: number };
}

const STATUS_CONFIG = {
  pending: { color: 'bg-warning/10 text-warning', icon: Clock, label: 'Pending' },
  paid: { color: 'bg-success/10 text-success', icon: CheckCircle2, label: 'Paid' },
  overdue: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle, label: 'Overdue' },
};

export default function Invoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(
        collection(db, 'invoices'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching invoices:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      }
      // Sort by date (newest first)
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    return filtered;
  }, [invoices, filterStatus, sortBy]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const pending = invoices.filter(i => i.status === 'pending').length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
    const pendingAmount = invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0);

    return { total, pending, paid, overdue, totalAmount, paidAmount, pendingAmount };
  }, [invoices]);

  const handleDownloadPDF = (invoice: Invoice) => {
    // In a real app, this would generate/download a PDF
    toast({
      title: 'Download',
      description: `PDF download for invoice ${invoice.month || invoice.id} coming soon`,
    });
  };

  const handlePrint = (invoice: Invoice) => {
    // Create a print-friendly view
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${invoice.month || 'Invoice'}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .info { margin: 10px 0; }
              .total { font-size: 24px; font-weight: bold; margin-top: 20px; }
              .status { padding: 5px 10px; border-radius: 4px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice</h1>
              <p>Invoice #${invoice.id}</p>
            </div>
            <div class="info">
              <p><strong>Month:</strong> ${invoice.month || 'N/A'}</p>
              <p><strong>Amount:</strong> ₹₹{invoice.amount.toLocaleString()}</p>
              <p><strong>Status:</strong> <span class="status">${invoice.status.toUpperCase()}</span></p>
              ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${invoice.dueDate}</p>` : ''}
              ${invoice.paidDate ? `<p><strong>Paid Date:</strong> ${invoice.paidDate}</p>` : ''}
              ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
            </div>
            <div class="total">
              Total: ₹₹{invoice.amount.toLocaleString()}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Invoices
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage your invoices and payment history
          </p>
        </motion.div>

        {/* Stats Cards */}
        {!loading && invoices.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{stats.pendingAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                <p className="text-2xl font-bold text-success">{stats.paid}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  ₹{stats.paidAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {!loading && invoices.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date (Newest)</SelectItem>
                    <SelectItem value="amount">Amount (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty State */}
        {!loading && invoices.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your invoices will appear here once they are created
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invoices Table */}
        {!loading && filteredAndSortedInvoices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>
                  {filteredAndSortedInvoices.length} of {invoices.length} invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month/Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedInvoices.map((invoice) => {
                        const StatusIcon = STATUS_CONFIG[invoice.status].icon;
                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.month || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">
                                ₹{invoice.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={STATUS_CONFIG[invoice.status].color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {STATUS_CONFIG[invoice.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(invoice.dueDate)}
                            </TableCell>
                            <TableCell>
                              {invoice.paidDate ? formatDate(invoice.paidDate) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePrint(invoice)}
                                  className="h-8"
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadPDF(invoice)}
                                  className="h-8"
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}



