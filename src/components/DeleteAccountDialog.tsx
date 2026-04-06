import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle, ChevronRight } from "lucide-react";

const REASONS = [
  "I don't find it useful",
  "Privacy concerns",
  "Too many notifications",
  "Found a better alternative",
  "Just taking a break",
  "Other",
];

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (reason: string, details: string) => Promise<void>;
  deleting: boolean;
}

export default function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirmDelete,
  deleting,
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");

  const reset = () => {
    setStep(1);
    setSelectedReason("");
    setDetails("");
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleDelete = async () => {
    await onConfirmDelete(selectedReason, details);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl surface-low border-border max-w-[360px] p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Are you sure? */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-5"
            >
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle size={28} className="text-destructive" />
                </div>
                <DialogTitle className="text-on-surface text-lg">
                  Delete your account?
                </DialogTitle>
                <DialogDescription className="text-on-surface-variant text-sm">
                  This will permanently delete all your entries, reflections, and profile data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenChange(false)}
                  className="flex-1 rounded-xl surface-high py-3 text-sm font-semibold text-on-surface"
                >
                  Keep Account
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-3 text-sm font-semibold"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Why are you leaving? */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-4"
            >
              <DialogHeader className="text-center">
                <DialogTitle className="text-on-surface text-lg">
                  We'd love your feedback
                </DialogTitle>
                <DialogDescription className="text-on-surface-variant text-sm">
                  Why are you deleting your account? This helps us improve.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`w-full rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between transition-colors ${
                      selectedReason === reason
                        ? "bg-destructive/10 text-destructive border border-destructive/30"
                        : "surface-high text-on-surface border border-transparent"
                    }`}
                  >
                    {reason}
                    {selectedReason === reason && (
                      <ChevronRight size={16} className="text-destructive" />
                    )}
                  </button>
                ))}
              </div>

              {selectedReason && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <textarea
                    placeholder="Anything else you'd like to share? (optional)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none"
                  />
                </motion.div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl surface-high py-3 text-sm font-semibold text-on-surface"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedReason}
                  className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-3 text-sm font-semibold disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Final confirmation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-5"
            >
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-2">
                  <Trash2 size={28} className="text-destructive" />
                </div>
                <DialogTitle className="text-on-surface text-lg">
                  Final confirmation
                </DialogTitle>
                <DialogDescription className="text-on-surface-variant text-sm">
                  Type <span className="font-semibold text-destructive">DELETE</span> to confirm account deletion.
                </DialogDescription>
              </DialogHeader>

              <ConfirmInput onConfirmed={handleDelete} deleting={deleting} onBack={() => setStep(2)} />
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmInput({
  onConfirmed,
  deleting,
  onBack,
}: {
  onConfirmed: () => void;
  deleting: boolean;
  onBack: () => void;
}) {
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toUpperCase() === "DELETE";

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder='Type "DELETE"'
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-destructive/30 text-center tracking-widest font-semibold"
        autoFocus
      />
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-xl surface-high py-3 text-sm font-semibold text-on-surface"
        >
          Back
        </button>
        <button
          onClick={onConfirmed}
          disabled={!confirmed || deleting}
          className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-3 text-sm font-semibold disabled:opacity-40"
        >
          {deleting ? "Deleting..." : "Delete Forever"}
        </button>
      </div>
    </div>
  );
}
