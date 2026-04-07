import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { Capacitor } from "@capacitor/core";
import type { KeyboardPlugin } from "@capacitor/keyboard";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
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
import CallbackPage from "./pages/CallbackPage";
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

// Fix #3: Guard onboarding route — require auth but NOT onboarding_complete
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
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
        <Route path="/callback" element={<CallbackPage />} />

        {/* Onboarding — guarded */}
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />

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

const App = () => {
  // Configure native keyboard — hide Safari accessory bar, native resize
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    import("@capacitor/keyboard").then(({ Keyboard }) => {
      Keyboard.setAccessoryBarVisible({ isVisible: false });
      Keyboard.setResizeMode({ mode: 'native' as any });
    }).catch(() => {});
  }, []);

  // Handle OAuth deep link callback on native platforms
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Listen for deep links (e.g. app.loop.journal://callback#access_token=...)
    const setupDeepLinks = async () => {
      await CapApp.addListener("appUrlOpen", async ({ url }) => {
        // Close the system browser after OAuth
        await Browser.close();

        // Extract tokens from the URL hash/query
        if (url.includes("access_token") || url.includes("code=")) {
          const hashParams = new URLSearchParams(
            url.includes("#") ? url.split("#")[1] : url.split("?")[1]
          );
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      });
    };

    setupDeepLinks();

    return () => {
      CapApp.removeAllListeners();
    };
  }, []);

  return (
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
};

export default App;