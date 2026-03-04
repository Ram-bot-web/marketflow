import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface AdminEntry {
  id: string;
  email: string;
  name: string;
  addedAt?: { seconds: number };
  addedBy?: string;
}

export default function AdminManage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const currentUserEmail = auth.currentUser?.email?.toLowerCase() ?? "";

  // Real-time listener for admins collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "admins"), (snap) => {
      const list: AdminEntry[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AdminEntry, "id">),
      }));
      setAdmins(list);
    });
    return () => unsub();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAdding(true);
    try {
      // Check if this email is already an admin
      const existing = query(
        collection(db, "admins"),
        where("email", "==", email)
      );
      const snap = await getDocs(existing);
      if (!snap.empty) {
        toast({
          title: "Already an admin",
          description: `${email} is already an admin.`,
          variant: "destructive",
        });
        setAdding(false);
        return;
      }

      await addDoc(collection(db, "admins"), {
        email,
        name: newName.trim() || email,
        addedAt: serverTimestamp(),
        addedBy: currentUserEmail,
      });

      toast({
        title: "Admin added",
        description: `${email} has been granted admin access. They will be redirected to the admin panel on their next login.`,
      });
      setNewEmail("");
      setNewName("");
      setDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to add admin. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAdmin = async (entry: AdminEntry) => {
    if (entry.email === currentUserEmail) {
      toast({
        title: "Cannot remove yourself",
        description: "You cannot remove your own admin access.",
        variant: "destructive",
      });
      return;
    }
    if (admins.length === 1) {
      toast({
        title: "Cannot remove last admin",
        description: "There must be at least one admin.",
        variant: "destructive",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "admins", entry.id));
      toast({
        title: "Admin removed",
        description: `${entry.email} no longer has admin access.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove admin.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (ts?: { seconds: number }) => {
    if (!ts) return "—";
    return new Date(ts.seconds * 1000).toLocaleDateString();
  };

  return (
    <DashboardLayout isAdmin>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Manage Admins
            </h1>
            <p className="text-muted-foreground">
              Add or remove admin accounts. Admins can access all client data
              and manage this panel.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin</DialogTitle>
                <DialogDescription>
                  Enter the email address of the person you want to grant admin
                  access. They will be redirected to the admin panel on their
                  next login.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddAdmin} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Display Name</Label>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Admin Name (optional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Email Address</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adding}>
                    {adding ? "Adding..." : "Grant Admin Access"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Admins Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Admins</CardTitle>
            <CardDescription>
              {admins.length} admin{admins.length !== 1 ? "s" : ""} with access
              to this panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Added By</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const isSelf = admin.email === currentUserEmail;
                  return (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{admin.name}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(admin.addedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {admin.addedBy === "setup" ? (
                          <Badge variant="secondary" className="text-xs">
                            Initial Setup
                          </Badge>
                        ) : (
                          admin.addedBy || "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveAdmin(admin)}
                          disabled={isSelf || admins.length === 1}
                          title={
                            isSelf
                              ? "Cannot remove yourself"
                              : "Remove admin access"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {admins.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">
                No admins found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
