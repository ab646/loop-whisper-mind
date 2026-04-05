import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl text-on-surface">Loop</h1>
          <p className="font-display text-base text-mint italic">Reset your password.</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-on-surface text-sm leading-relaxed">
              Check your email for a password reset link.
            </p>
            <Link to="/login" className="text-mint text-sm hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
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
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </motion.button>
            <Link to="/login" className="block text-center text-on-surface-variant text-sm hover:text-mint">
              Back to login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
