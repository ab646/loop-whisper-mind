import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/login");
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      navigate("/");
    }
  };

  return (
    <div className="h-[100dvh] mesh-gradient-bg flex flex-col items-center justify-center px-6 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl text-on-surface">Loop Mind</h1>
          <p className="font-display text-base text-mint italic">Set a new password.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">NEW PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl surface-high px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder="At least 6 characters"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
