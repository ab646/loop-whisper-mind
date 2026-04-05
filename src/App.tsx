import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import ChatPage from "./pages/ChatPage";
import RecordingPage from "./pages/RecordingPage";
import InsightsPage from "./pages/InsightsPage";
import ThemeExplorationPage from "./pages/ThemeExplorationPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <div className="max-w-md mx-auto relative min-h-screen">
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/recording" element={<RecordingPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/theme/:id" element={<ThemeExplorationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
