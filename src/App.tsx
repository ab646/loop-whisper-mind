import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import RecordingPage from "./pages/RecordingPage";
import InsightsPage from "./pages/InsightsPage";
import ThemeExplorationPage from "./pages/ThemeExplorationPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/OnboardingPage";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen mesh-gradient-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="font-display text-2xl text-on-surface">Loop</h1>
          <p className="text-on-surface-variant text-sm animate-pulse-soft">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (session && profile?.onboarding_complete) return <Navigate to="/" replace />;
  if (session && profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="max-w-md mx-auto relative min-h-screen">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/recording" element={<ProtectedRoute><RecordingPage /></ProtectedRoute>} />
        <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
        <Route path="/theme/:id" element={<ProtectedRoute><ThemeExplorationPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
