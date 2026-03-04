import { useEffect, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare, Send, Search, HelpCircle, FileText, Clock, User
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, updateDoc, doc } from 'firebase/firestore';
import { SkeletonCard } from '@/components/ui/skeleton-loader';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'client' | 'admin';
  createdAt: { seconds: number };
  read: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: { seconds: number };
  updatedAt: { seconds: number };
  lastMessage?: string;
  unreadCount?: number;
}

const FAQ_ITEMS = [
  {
    question: 'How do I view my marketing plan?',
    answer: 'Navigate to the Marketing Plan page from the sidebar to view your customized strategy and roadmap.',
  },
  {
    question: 'How do I track my campaign results?',
    answer: 'Go to the Results page to see your monthly reports, performance metrics, and campaign analytics.',
  },
  {
    question: 'How do I update my goals?',
    answer: 'Visit your Profile page and navigate to the Goals tab to set or update your monthly targets for leads and ad spend.',
  },
  {
    question: 'How do I view my invoices?',
    answer: 'All your invoices are available in the Invoices page. You can view payment history and download invoices.',
  },
  {
    question: 'What should I do if I have questions?',
    answer: 'You can send a message to your admin through the Messages page, or create a support ticket for urgent issues.',
  },
];

export default function Messages() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'messages' | 'tickets' | 'faq'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Load messages
    const unsub1 = onSnapshot(
      query(
        collection(db, 'messages'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'asc')
      ),
      (snap) => {
        const items = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            text: data.text || '',
            senderId: data.senderId || '',
            senderName: data.senderName || 'Admin',
            senderType: data.senderType || 'admin',
            createdAt: data.createdAt || { seconds: Date.now() / 1000 },
            read: data.read || false,
          } as Message;
        });
        setMessages(items);
        setLoading(false);
        
        // Mark messages as read
        items.forEach(msg => {
          if (!msg.read && msg.senderType === 'admin') {
            updateDoc(doc(db, 'messages', msg.id), { read: true });
          }
        });
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    );

    // Load support tickets
    const unsub2 = onSnapshot(
      query(
        collection(db, 'supportTickets'),
        where('clientId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      ),
      (snap) => {
        const items = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            subject: data.subject || '',
            status: data.status || 'open',
            priority: data.priority || 'medium',
            createdAt: data.createdAt || { seconds: Date.now() / 1000 },
            updatedAt: data.updatedAt || { seconds: Date.now() / 1000 },
            lastMessage: data.lastMessage || '',
            unreadCount: data.unreadCount || 0,
          } as SupportTicket;
        });
        setTickets(items);
      },
      (error) => {
        console.error('Error fetching tickets:', error);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        clientId: user.uid,
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email || 'Client',
        senderType: 'client',
        createdAt: serverTimestamp(),
        read: false,
      });

      setNewMessage('');
      toast({ title: 'Message sent', description: 'Your message has been sent to the admin' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleCreateTicket = async (subject: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, 'supportTickets'), {
        clientId: user.uid,
        subject,
        status: 'open',
        priority,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCount: 0,
      });

      toast({ title: 'Ticket created', description: 'Your support ticket has been created' });
      setViewMode('tickets');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create ticket', variant: 'destructive' });
    }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(msg =>
      msg.text.toLowerCase().includes(query) ||
      msg.senderName.toLowerCase().includes(query)
    );
  }, [messages, searchQuery]);

  const formatTime = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: { seconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-warning/10 text-warning',
      in_progress: 'bg-primary/10 text-primary',
      resolved: 'bg-success/10 text-success',
      closed: 'bg-muted text-muted-foreground',
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: 'bg-destructive/10 text-destructive',
      medium: 'bg-warning/10 text-warning',
      low: 'bg-secondary/10 text-secondary-foreground',
    };
    return colors[priority] || colors.medium;
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
            Messages & Support
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Communicate with your admin team and get support
          </p>
        </motion.div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="tickets">
              <FileText className="h-4 w-4 mr-2" />
              Support Tickets
            </TabsTrigger>
            <TabsTrigger value="faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Direct Messages</CardTitle>
                    <CardDescription>Chat with your admin team</CardDescription>
                  </div>
                  <div className="relative w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <SkeletonCard />
                ) : filteredMessages.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8 text-muted-foreground" />}
                    title="No messages yet"
                    description="Start a conversation by sending a message below"
                  />
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {filteredMessages.map((message) => {
                      const isClient = message.senderType === 'client';
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isClient ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isClient && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          <div className={`max-w-[70%] ${isClient ? 'order-2' : ''}`}>
                            <div className={`rounded-lg p-3 ${
                              isClient
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              <p className="text-sm">{message.text}</p>
                            </div>
                            <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${
                              isClient ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{message.senderName}</span>
                              <span>•</span>
                              <span>{formatTime(message.createdAt)}</span>
                            </div>
                          </div>
                          {isClient && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 order-1">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Message Input */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={3}
                      className="resize-none"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Support Tickets</CardTitle>
                    <CardDescription>Create and track support requests</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      const subject = prompt('Enter ticket subject:');
                      if (subject) {
                        handleCreateTicket(subject);
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    New Ticket
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                    title="No support tickets"
                    description="Create a ticket to get help with any issues"
                  />
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{ticket.subject}</h3>
                                <Badge className={getStatusColor(ticket.status)}>
                                  {ticket.status.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant="outline" className={getPriorityColor(ticket.priority)}>
                                  {ticket.priority}
                                </Badge>
                              </div>
                              {ticket.lastMessage && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {ticket.lastMessage}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Created {formatDate(ticket.createdAt)}
                                </span>
                                {ticket.unreadCount && ticket.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {ticket.unreadCount} unread
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>Find answers to common questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {FAQ_ITEMS.map((faq, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-base">{faq.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">Still have questions?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Send a message to your admin or create a support ticket for personalized assistance.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('messages')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Admin
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}


