import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { StaticLogo } from "@/components/LoopLogo";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/lib/native-auth";
import { toast } from "sonner";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const navigate = useNavigate();

  // Scroll focused input into view when native keyboard opens
  const scrollOnFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, []);

  // Show confirm password after first password is entered in signup mode
  useEffect(() => {
    if (mode === "signup" && password.length >= 6) {
      setShowConfirm(true);
    } else if (mode === "login") {
      setShowConfirm(false);
      setConfirmPassword("");
    }
  }, [password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      if (password !== confirmPassword) {
        toast.error("Passwords don't match");
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          setMode("login");
          toast.info("Looks like you already have an account — sign in below.");
        } else {
          toast.error(error.message);
        }
      } else {
        setShowConfirmation(true);
      }
    } else {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
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
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || `Failed to sign in with ${provider}`);
      setSocialLoading(null);
    }
  };

  const isLogin = mode === "login";

  // Fix #2: Confirmation screen after signup
  if (showConfirmation) {
    return (
      <div className="h-screen mesh-gradient-bg flex flex-col items-center justify-center px-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-6 text-center"
        >
          <StaticLogo size={80} />
          <h1 className="font-display text-2xl text-on-surface">Check your inbox</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            We sent a confirmation link to <strong className="text-on-surface">{email}</strong>.
            Click it to activate your account.
          </p>
          <p className="text-on-surface-variant text-xs">
            Didn't get it?{" "}
            <button
              onClick={async () => {
                await supabase.auth.resend({ type: "signup", email });
                toast.success("Confirmation email resent");
              }}
              className="text-mint hover:underline"
            >
              Resend
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] mesh-gradient-bg flex flex-col items-center px-6 overflow-y-auto py-6 pt-[max(env(safe-area-inset-top),24px)]" style={{ paddingBottom: 'max(var(--keyboard-height, 0px), calc(env(safe-area-inset-bottom) + 24px))' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-5"
      >
        <div className="flex flex-col items-center space-y-2">
          <StaticLogo size={96} />
          <h1 className="font-display text-3xl text-on-surface">Loop Mind</h1>
          <AnimatePresence mode="wait">
            <motion.p
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="font-display text-base text-mint italic"
            >
              {isLogin ? "Welcome back." : "Talk it out. See the pattern."}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Social login */}
        <div className="space-y-2">
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

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSocialLogin("apple")}
            disabled={!!socialLoading}
            className="w-full rounded-xl surface-high border border-border/40 px-4 py-3.5 flex items-center justify-center gap-3 text-on-surface font-body font-semibold text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {socialLoading === "apple" ? "Connecting..." : "Continue with Apple"}
          </motion.button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/30" />
          <span className="text-on-surface-variant text-xs font-body uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 h-px bg-border/30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={scrollOnFocus}
              required
              className="w-full rounded-xl surface-high border border-border/40 px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="label-uppercase text-[10px]">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={scrollOnFocus}
              required
              minLength={mode === "signup" ? 6 : undefined}
              className="w-full rounded-xl surface-high border border-border/40 px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            />
          </div>

          {/* Confirm password for signup */}
          <AnimatePresence>
            {mode === "signup" && showConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <label className="label-uppercase text-[10px]">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={scrollOnFocus}
                  required
                  minLength={6}
                  className="w-full rounded-xl surface-high border border-border/40 px-4 py-3 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
                  placeholder="Re-enter your password"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-destructive text-xs font-body">Passwords don't match</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isLogin && (
            <Link to="/forgot-password" className="block text-right text-mint text-sm font-body hover:underline py-3 px-2 min-h-[44px]">
              Forgot password?
            </Link>
          )}

          <div className="pt-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading || (mode === "signup" && showConfirm && password !== confirmPassword)}
              className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {loading
                ? isLogin ? "Signing in..." : "Creating account..."
                : isLogin ? "Sign In" : "Get Started"}
            </motion.button>
          </div>
        </form>

        <p className="text-center text-on-surface-variant text-sm font-body">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(isLogin ? "signup" : "login")}
            className="text-mint hover:underline font-semibold"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

      </motion.div>
    </div>
  );
}