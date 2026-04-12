import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCreateLoop } from "@/hooks/useCreateLoop";
import { analytics } from "@/lib/analytics";
import { resend } from "@/lib/resend";
import { ExplainScreen1 } from "@/components/onboarding/ExplainScreen1";
import { ExplainScreen2 } from "@/components/onboarding/ExplainScreen2";
import { ExplainScreen3 } from "@/components/onboarding/ExplainScreen3";

const SEED_OPTIONS = [
  { label: "Work stuff I can't stop replaying", initialText: "I keep replaying something that happened at work." },
  { label: "A relationship that's eating at me", initialText: "There's something going on in a relationship that I can't stop thinking about." },
  { label: "A decision I keep going back and forth on", initialText: "I'm stuck on a decision and I keep going back and forth." },
  { label: "Just... everything, all at once", initialText: "I feel overwhelmed — everything is hitting me at once and I can't sort through it." },
];

type StepDef =
  | { type: "explain"; screen: 1 | 2 | 3 }
  | { type: "text"; title: string; subtitle: string; field: string; placeholder: string }
  | { type: "seed"; title: string; subtitle: string };

const steps: StepDef[] = [
  { type: "explain", screen: 1 },
  { type: "explain", screen: 2 },
  { type: "explain", screen: 3 },
  {
    type: "text",
    title: "What should I call you?",
    subtitle: "First name works. Nothing fancy.",
    field: "display_name",
    placeholder: "Your name",
  },
  {
    type: "seed",
    title: "What's been on your mind?",
    subtitle: "Pick one, or tell me in your own words.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [selectedSeed, setSelectedSeed] = useState<number | null>(null);
  const [customSeedText, setCustomSeedText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { createEntry } = useCreateLoop();

  const current = steps[step];

  // Track onboarding started on mount
  useEffect(() => {
    analytics.onboardingStarted();
  }, []);

  const canProceed = () => {
    if (current.type === "text") return displayName.trim().length > 0;
    if (current.type === "seed") {
      if (selectedSeed !== null && selectedSeed < SEED_OPTIONS.length) return true;
      if (selectedSeed === SEED_OPTIONS.length) return customSeedText.trim().length > 0;
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      analytics.onboardingStepCompleted(step, steps[step].type);
      setStep(step + 1);
      return;
    }

    // Final step — save profile & navigate to first reflection
    analytics.onboardingCompleted(step);
    setLoading(true);

    if (!user?.id) {
      toast.error("Session not ready — please try again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        onboarding_complete: true,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to save preferences");
      setLoading(false);
      return;
    }

    // Add to Resend audience + send welcome email (fire-and-forget)
    if (user.email) {
      resend.createContact({
        email: user.email,
        firstName: displayName,
      }).catch(() => { /* best-effort */ });

      resend.sendEmail({
        to: user.email,
        subject: "Welcome to Loop Mind 🌿",
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#090b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#090b0b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202626;border-radius:16px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f3f3;">Welcome, ${displayName} 🌿</p>
          <p style="margin:0 0 20px;font-size:15px;color:#8a9a9a;line-height:1.6;">You just took the first step toward breaking the loop. Loop Mind is your space to untangle what's stuck on repeat.</p>
          <p style="margin:0 0 28px;font-size:15px;color:#8a9a9a;line-height:1.6;">Write when it feels heavy. We'll help you see the patterns.</p>
          <a href="https://app.loopmind.care" style="display:inline-block;background:linear-gradient(135deg,#bfd8d8,#8ab8b8);color:#090b0b;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">Open Loop Mind</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).catch((err) => console.warn("Welcome email skipped:", err));
    }

    // Resolve initial text
    let initialText = "";
    if (selectedSeed !== null && selectedSeed < SEED_OPTIONS.length) {
      initialText = SEED_OPTIONS[selectedSeed].initialText;
    } else if (selectedSeed === SEED_OPTIONS.length) {
      initialText = customSeedText;
    }

    await refreshProfile();

    // Create the first loop entry if seed text was selected
    if (initialText.trim()) {
      const result = await createEntry({ content: initialText });
      const entryId = result?.entryId;
      setLoading(false);
      if (entryId) {
        navigate(`/journal/${entryId}`);
      } else {
        navigate("/");
      }
    } else {
      setLoading(false);
      navigate("/");
    }
  };

  const handleSwipe = (_: any, { offset, velocity }: any) => {
    if (current.type !== "explain") return;
    if (offset.x < -50 || velocity.x < -500) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    } else if ((offset.x > 50 || velocity.x > 500) && step > 0) {
      setStep((s) => Math.max(s - 1, 0));
    }
  };

  const handleSelectSeed = (index: number) => {
    setSelectedSeed(index === selectedSeed ? null : index);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div
      className="relative h-[100dvh] mesh-gradient-bg flex flex-col px-6 overflow-hidden"
      style={{ marginTop: 'calc(env(safe-area-inset-top) * -1)' }}
    >
      {/* Progress dots + sign out */}
      <div className="pt-[max(env(safe-area-inset-top),12px)] pb-4 flex items-center justify-between shrink-0">
        <div className="flex gap-2 flex-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-mint" : "bg-surface-high"
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="text-on-surface-variant text-xs ml-4 hover:text-mint"
        >
          Sign out
        </button>
      </div>

      <div
        className="scroll-container flex-1 min-h-0 px-1"
        style={{
          paddingBottom:
            'max(calc(var(--keyboard-height, 0px) + 112px), calc(env(safe-area-inset-bottom) + 112px))',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            drag={current.type === "explain" ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleSwipe}
            className="min-h-full flex flex-col justify-center"
          >
            {current.type === "explain" && current.screen === 1 && <ExplainScreen1 />}
            {current.type === "explain" && current.screen === 2 && <ExplainScreen2 />}
            {current.type === "explain" && current.screen === 3 && <ExplainScreen3 />}

            {current.type === "text" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h1 className="font-display text-2xl text-on-surface leading-tight">
                    {current.title}
                  </h1>
                  <p className="text-on-surface-variant text-sm">{current.subtitle}</p>
                </div>
                <input
                  autoFocus
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={current.placeholder}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                  className="w-full rounded-xl surface-high px-4 py-4 text-on-surface text-lg font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
                />
              </div>
            )}

            {current.type === "seed" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="font-display text-2xl text-on-surface leading-tight">
                    {current.title}
                  </h1>
                  <p className="text-on-surface-variant text-sm">{current.subtitle}</p>
                </div>

                <div className="space-y-3">
                  {SEED_OPTIONS.map((opt, i) => (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSelectSeed(i)}
                      className={`w-full rounded-xl px-4 py-3 text-left text-sm font-body transition-all ${
                        selectedSeed === i
                          ? "surface-container ring-1 ring-mint/40 text-on-surface"
                          : "surface-high text-on-surface border border-transparent"
                      }`}
                    >
                      {opt.label}
                    </motion.button>
                  ))}

                  {/* Something else */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectSeed(SEED_OPTIONS.length)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm font-body transition-all ${
                      selectedSeed === SEED_OPTIONS.length
                        ? "surface-container ring-1 ring-mint/40 text-on-surface"
                        : "surface-high text-on-surface border border-transparent"
                    }`}
                  >
                    Something else
                  </motion.button>

                  <AnimatePresence>
                    {selectedSeed === SEED_OPTIONS.length && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <textarea
                          autoFocus
                          rows={3}
                          value={customSeedText}
                          onChange={(e) => setCustomSeedText(e.target.value)}
                          placeholder="What's been looping?"
                          className="w-full rounded-xl surface-high px-4 py-4 text-on-surface text-base font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant resize-none"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action */}
      <div
        className="absolute inset-x-0 z-10 px-6 pt-4"
        style={{
          bottom: 'max(var(--keyboard-height, 0px), env(safe-area-inset-bottom))',
          paddingBottom: '16px',
          background: 'linear-gradient(to top, hsl(var(--surface)) 82%, hsl(var(--surface) / 0))',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          disabled={!canProceed() || loading}
          className="w-full rounded-xl orb-gradient py-3.5 text-primary-foreground font-body font-semibold text-sm uppercase tracking-wider disabled:opacity-40"
        >
          {loading
            ? "Saving..."
            : step === steps.length - 1
            ? "Start reflecting"
            : "Continue"}
        </motion.button>

        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full text-center text-on-surface-variant text-sm mt-3 hover:text-mint"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}