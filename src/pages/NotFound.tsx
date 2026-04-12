import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex h-screen items-center justify-center mesh-gradient-bg px-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold text-on-surface">404</h1>
        <p className="text-lg text-on-surface-variant">This page isn't here.</p>
        <a
          href="/"
          className="inline-block rounded-xl bg-mint/10 text-mint px-6 py-3 text-sm font-semibold hover:bg-mint/20 transition-colors"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
