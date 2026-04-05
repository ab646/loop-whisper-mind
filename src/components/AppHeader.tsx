import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
}

export function AppHeader({ title = "Loop", showBack = false }: AppHeaderProps) {
  const navigate = useNavigate();

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
    </header>
  );
}
