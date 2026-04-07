import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
    title: "What should we call you?",
    subtitle: "Just a first name is perfect.",
    field: "display_name",
    placeholder: "Your name",
  },
  {
    type: "seed",
    title: "What's been on your mind?",
    subtitle: "Pick one, or tell us in your own words.",
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

  const current = steps[step];

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
      setStep(step + 1);
      return;
    }

    // Final step — save profile & navigate to first reflection
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

    setLoading(false);
    if (error) {
      toast.error("Failed to save preferences");
      return;
    }

    // Resolve initial text
    let initialText = "";
    if (selectedSeed !== null && selectedSeed < SEED_OPTIONS.length) {
      initialText = SEED_OPTIONS[selectedSeed].initialText;
    } else if (selectedSeed === SEED_OPTIONS.length) {
      initialText = customSeedText;
    }

    await refreshProfile();
    navigate("/");
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
    <div className="h-screen mesh-gradient-bg flex flex-col px-6 overflow-hidden">
      {/* Progress dots + sign out */}
      <div className="pt-3 pb-4 flex items-center justify-between">
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

      <div className="flex-1 flex flex-col justify-center scroll-container px-1">
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
      <div className="pb-10 pt-4">
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