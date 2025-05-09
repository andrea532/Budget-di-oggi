import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { BudgetProvider } from "@/contexts/BudgetContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";

// Lazy-loaded components
const HomePage = lazy(() => import("@/pages/HomePage"));
const TransactionsPage = lazy(() => import("@/pages/StatsPage"));
const SavingsPage = lazy(() => import("@/pages/SavingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center w-full min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/statistics" component={StatisticsPage} />
      <ProtectedRoute path="/savings" component={SavingsPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WebSocketProvider>
      <AuthProvider>
        <BudgetProvider>
          <div className="max-w-md mx-auto bg-white min-h-screen shadow-lg">
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
            <Toaster />
          </div>
        </BudgetProvider>
      </AuthProvider>
    </WebSocketProvider>
  );
}

export default App;
