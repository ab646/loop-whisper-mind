import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Play } from "lucide-react";

type StepDef =
  | { type: "text"; title: string; subtitle: string; field: string; placeholder: string }
  | { type: "choice"; title: string; subtitle: string; field: string; options: { label: string; value: any; desc: string }[] }
  | { type: "video"; title: string; subtitle: string };

const steps: StepDef[] = [
  {
    type: "video",
    title: "How Loop works",
    subtitle: "A quick look at what happens when you reflect.",
  },
  {
    title: "What should we call you?",
    subtitle: "Just a first name is perfect.",
    type: "text",
    field: "display_name",
    placeholder: "Your name",
  },
  {
    title: "How do you prefer to reflect?",
    subtitle: "You can always change this later.",
    type: "choice",
    field: "voice_first_mode",
    options: [
      { label: "🎙 Voice first", value: true, desc: "Talk it out. I'll capture the essence." },
      { label: "⌨️ Text first", value: false, desc: "Type your thoughts. No pressure." },
    ],
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({
    display_name: "",
    voice_first_mode: false,
  });
  const [loading, setLoading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const current = steps[step];

  const canProceed = () => {
    if (current.type === "text") return (answers as any)[(current as any).field]?.trim();
    return true;
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    // Final step — save profile
    setLoading(true);

    if (!user?.id) {
      toast.error("Session not ready — please try again.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: answers.display_name,
        voice_first_mode: answers.voice_first_mode,
        onboarding_complete: true,
      })
      .eq("user_id", user.id);

    setLoading(false);
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      await refreshProfile();
      navigate("/");
    }
  };

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg flex flex-col px-6">
      {/* Progress */}
      <div className="pt-8 pb-4 flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-mint" : "bg-surface-high"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {current.type === "video" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="font-display text-2xl text-on-surface leading-tight">
                    {current.title}
                  </h1>
                  <p className="text-on-surface-variant text-sm">{current.subtitle}</p>
                </div>
                <div className="relative rounded-2xl overflow-hidden surface-low aspect-[9/16] max-h-[55vh] mx-auto">
                  <video
                    ref={videoRef}
                    src="/videos/onboarding-explainer.mp4"
                    playsInline
                    muted
                    onEnded={() => setVideoPlaying(false)}
                    className="w-full h-full object-cover"
                  />
                  {!videoPlaying && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handlePlayVideo}
                      className="absolute inset-0 flex items-center justify-center bg-background/30"
                    >
                      <div className="w-16 h-16 rounded-full orb-gradient flex items-center justify-center orb-shadow">
                        <Play size={28} className="text-primary-foreground ml-1" />
                      </div>
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {current.type === "text" && (
              <>
                <div className="space-y-2">
                  <h1 className="font-display text-2xl text-on-surface leading-tight">
                    {current.title}
                  </h1>
                  <p className="text-on-surface-variant text-sm">{current.subtitle}</p>
                </div>
                <input
                  autoFocus
                  value={answers[current.field] || ""}
                  onChange={(e) =>
                    setAnswers({ ...answers, [current.field]: e.target.value })
                  }
                  placeholder={current.placeholder}
                  className="w-full rounded-xl surface-high px-4 py-4 text-on-surface text-lg font-body outline-none focus:ring-1 focus:ring-mint placeholder:text-on-surface-variant"
                />
              </>
            )}

            {current.type === "choice" && (
              <>
                <div className="space-y-2">
                  <h1 className="font-display text-2xl text-on-surface leading-tight">
                    {current.title}
                  </h1>
                  <p className="text-on-surface-variant text-sm">{current.subtitle}</p>
                </div>
                <div className="space-y-3">
                  {current.options.map((opt) => {
                    const isSelected = answers[current.field] === opt.value;
                    return (
                      <motion.button
                        key={String(opt.value)}
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          setAnswers({ ...answers, [current.field]: opt.value })
                        }
                        className={`w-full rounded-xl p-4 text-left transition-colors ${
                          isSelected
                            ? "surface-container border border-mint/30"
                            : "surface-low border border-transparent"
                        }`}
                      >
                        <p className={`font-body font-semibold text-base ${isSelected ? "text-mint" : "text-on-surface"}`}>
                          {opt.label}
                        </p>
                        {opt.desc && (
                          <p className="text-on-surface-variant text-sm mt-1">{opt.desc}</p>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </>
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
            ? "Start Reflecting"
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
