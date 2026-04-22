import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { ErrorBoundary } from "@/components/error-boundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { setupSessionMonitoring, monitorAuthState } from "@/lib/session";

// Eager: small public entry routes (avoids dynamic import fetch issues on some hosts)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RequireClientOnboarding from "@/components/auth/RequireClientOnboarding";
import AdminRoute from "@/components/auth/AdminRoute";
import { R } from "@/lib/routes";

// Code-split: everything else (do not also static-import these pages — duplicates the graph)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Results = lazy(() => import("./pages/Results"));
const Plan = lazy(() => import("./pages/Plan"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ClientTasks = lazy(() => import("./pages/ClientTasks"));
const Invoices = lazy(() => import("./pages/Invoices"));
const ActivityTimeline = lazy(() => import("./pages/ActivityTimeline"));
const Calendar = lazy(() => import("./pages/Calendar"));
const AdminHealthDashboard = lazy(() => import("./pages/AdminHealthDashboard"));
const AdminTasks = lazy(() => import("./pages/AdminTasks"));
const AdminTaskTemplates = lazy(() => import("./pages/AdminTaskTemplates"));
const AdminPlanTemplates = lazy(() => import("./pages/AdminPlanTemplates"));
const AdminReportTemplates = lazy(() => import("./pages/AdminReportTemplates"));
const AdminActivity = lazy(() => import("./pages/AdminActivity"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const AdminPlanEditor = lazy(() => import("./pages/AdminPlanEditor"));
const AdminBilling = lazy(() => import("./pages/AdminBilling"));
const AdminPlanManager = lazy(() => import("./pages/AdminPlanManager"));
const AdminAutomation = lazy(() => import("./pages/AdminAutomation"));
const AdminOnboarding = lazy(() => import("./pages/AdminOnboarding"));
const AdminClientDetail = lazy(() => import("./pages/AdminClientDetail"));
const AdminManage = lazy(() => import("./pages/AdminManage"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Messages = lazy(() => import("./pages/Messages"));
const AdminSetup = lazy(() => import("./pages/AdminSetup"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    const cleanupSession = setupSessionMonitoring();
    const cleanupAuth = monitorAuthState(() => {});

    return () => {
      cleanupSession();
      cleanupAuth();
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="marketflow-theme">
        <TooltipProvider>
          <OfflineIndicator />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path={R.HOME} element={<Index />} />
                <Route path={R.LOGIN} element={<Login />} />
                <Route path={R.REGISTER} element={<Register />} />

                <Route
                  path={R.DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Dashboard />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.ONBOARDING}
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.PLAN}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Plan />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.RESULTS}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Results />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.PROFILE}
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.NOTIFICATIONS}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Notifications />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.TASKS}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <ClientTasks />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.MESSAGES}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Messages />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.INVOICES}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Invoices />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.ACTIVITY_TIMELINE}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <ActivityTimeline />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={R.CALENDAR}
                  element={
                    <ProtectedRoute>
                      <RequireClientOnboarding>
                        <Calendar />
                      </RequireClientOnboarding>
                    </ProtectedRoute>
                  }
                />

                <Route path={R.ADMIN_SETUP} element={<AdminSetup />} />

                <Route
                  path={R.ADMIN}
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path={`${R.ADMIN_CLIENT}/:id`}
                  element={
                    <AdminRoute>
                      <AdminClientDetail />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_MANAGE_ADMINS}
                  element={
                    <AdminRoute>
                      <AdminManage />
                    </AdminRoute>
                  }
                />

                <Route
                  path={R.ADMIN_ANALYTICS}
                  element={
                    <AdminRoute>
                      <AdminAnalytics />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_REPORTS}
                  element={
                    <AdminRoute>
                      <AdminReports />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_ONBOARDING}
                  element={
                    <AdminRoute>
                      <AdminOnboarding />
                    </AdminRoute>
                  }
                />

                <Route
                  path={R.ADMIN_ACTIVITY}
                  element={
                    <AdminRoute>
                      <AdminActivity />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_TASKS}
                  element={
                    <AdminRoute>
                      <AdminTasks />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_TASK_TEMPLATES}
                  element={
                    <AdminRoute>
                      <AdminTaskTemplates />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_PLAN_TEMPLATES}
                  element={
                    <AdminRoute>
                      <AdminPlanTemplates />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_REPORT_TEMPLATES}
                  element={
                    <AdminRoute>
                      <AdminReportTemplates />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_HEALTH}
                  element={
                    <AdminRoute>
                      <AdminHealthDashboard />
                    </AdminRoute>
                  }
                />

                <Route
                  path={R.ADMIN_PLAN_EDITOR}
                  element={
                    <AdminRoute>
                      <AdminPlanEditor />
                    </AdminRoute>
                  }
                />
                <Route
                  path={`${R.ADMIN_PLAN_EDITOR}/:clientId`}
                  element={
                    <AdminRoute>
                      <AdminPlanEditor />
                    </AdminRoute>
                  }
                />

                <Route
                  path={R.ADMIN_BILLING}
                  element={
                    <AdminRoute>
                      <AdminBilling />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_PLAN_MANAGER}
                  element={
                    <AdminRoute>
                      <AdminPlanManager />
                    </AdminRoute>
                  }
                />
                <Route
                  path={R.ADMIN_AUTOMATION}
                  element={
                    <AdminRoute>
                      <AdminAutomation />
                    </AdminRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
