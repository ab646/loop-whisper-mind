import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { StaticLogo } from "@/components/LoopLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="flex flex-col items-center space-y-3">
          <StaticLogo size={80} />
          <h1 className="font-display text-3xl text-on-surface">Loop</h1>
          <p className="font-display text-base text-mint italic">Welcome back.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl surface-high px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl surface-high px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder="••••••••"
            />
          </div>

          <Link to="/forgot-password" className="block text-right text-mint text-sm font-body hover:underline">
            Forgot password?
          </Link>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </motion.button>
        </form>

        <p className="text-center text-on-surface-variant text-sm font-body">
          New here?{" "}
          <Link to="/signup" className="text-mint hover:underline">Create an account</Link>
        </p>
      </motion.div>
    </div>
  );
}
