import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({ title = "Loop", showBack = false }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const hideSettings = ["/profile", "/login", "/signup", "/onboarding", "/forgot-password", "/reset-password", "/recording"].includes(location.pathname);

  return (
    <header className="flex items-center justify-center px-5 py-4 shrink-0 relative">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="absolute left-5 text-on-surface-variant"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="font-display text-xl text-on-surface font-semibold">{title}</h1>
      {!hideSettings && (
        <button
          onClick={() => navigate("/profile")}
          className="absolute right-5 text-on-surface-variant"
        >
          <Settings size={20} />
        </button>
      )}
    </header>
  );
}
