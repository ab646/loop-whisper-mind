import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { StaticLogo } from "@/components/LoopLogo";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/lib/native-auth";
import { toast } from "sonner";

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-body">
      {met ? <Check size={12} className="text-mint" /> : <X size={12} className="text-on-surface-variant/50" />}
      <span className={met ? "text-mint" : "text-on-surface-variant/70"}>{label}</span>
    </div>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/onboarding");
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setSocialLoading(provider);
    try {
      const result = await signInWithOAuth(provider);
      if (result.error) {
        toast.error(result.error.message || `Failed to sign in with ${provider}`);
        setSocialLoading(null);
        return;
      }
      if (result.redirected) return;
      navigate("/onboarding");
    } catch (e: any) {
      toast.error(e.message || `Failed to sign in with ${provider}`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="h-[100dvh] mesh-gradient-bg flex flex-col items-center px-6 overflow-y-auto pt-[max(env(safe-area-inset-top),24px)]" style={{ paddingBottom: 'max(var(--keyboard-height, 0px), calc(env(safe-area-inset-bottom) + 24px))' }}>
      {/* Spacer — top */}
      <div className="flex-1 min-h-4" />

      {/* Hero — centered in remaining space */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center space-y-2"
      >
        <StaticLogo size={64} className="sm:w-24 sm:h-24" />
        <h1 className="font-display text-2xl sm:text-3xl text-on-surface">Loop Mind</h1>
        <p className="font-display text-sm sm:text-base text-mint italic">
          Talk it out. See the pattern.
        </p>
      </motion.div>

      {/* Spacer — bottom */}
      <div className="flex-1 min-h-4" />

      {/* Form — anchored to bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm space-y-4 pb-6"
      >
        {/* Social login buttons */}
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSocialLogin("google")}
            disabled={!!socialLoading}
            className="w-full rounded-xl surface-high border border-border/40 px-4 py-3.5 flex items-center justify-center gap-3 text-on-surface font-body font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {socialLoading === "google" ? "Connecting..." : "Continue with Google"}
          </motion.button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-on-surface-variant text-xs font-body uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3">
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl surface-high border border-border/40 px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">PASSWORD</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl surface-high border border-border/40 px-4 py-3 pr-12 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <PasswordRule met={password.length >= 6} label="At least 6 characters" />
                <PasswordRule met={/[A-Z]/.test(password)} label="One uppercase letter" />
                <PasswordRule met={/[0-9]/.test(password)} label="One number" />
              </div>
            )}
          </div>

          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Get Started"}
            </motion.button>
          </div>
        </form>

        <p className="text-center text-on-surface-variant text-sm font-body py-3">
          Already have an account?{" "}
          <Link to="/login" className="text-mint hover:underline py-3 px-2 inline-block min-h-[44px] leading-[44px]">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
