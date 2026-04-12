import { useEffect } from "react";
import { motion } from "framer-motion";
import { analytics } from "@/lib/analytics";
import { resend } from "@/lib/resend";
import { KeyRound, Download, Trash2, LogOut, ExternalLink, LifeBuoy, Mail, Eye, EyeOff, Lightbulb } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import FeedbackPanel from "@/components/feedback/FeedbackPanel";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();

  useEffect(() => { analytics.profileViewed(); }, []);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingConsent, setTogglingConsent] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdating(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setShowPasswordForm(false);
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    const { data, error } = await supabase
      .from("entries")
      .select("created_at, entry_type, content, tags, voice_duration, reflection")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to export data");
      setExporting(false);
      return;
    }

    const headers = ["Date", "Type", "Content", "Tags", "Voice Duration", "Main Loop", "One Question", "Facts", "Assumptions"];
    const csvRows = [
      headers.join(","),
      ...(data || []).map((e: any) =>
        [
          e.created_at,
          e.entry_type,
          `"${(e.content || "").replace(/"/g, '""')}"`,
          `"${(e.tags || []).join(", ")}"`,
          e.voice_duration || "",
          `"${(e.reflection?.mainLoop || "").replace(/"/g, '""')}"`,
          `"${(e.reflection?.oneQuestion || "").replace(/"/g, '""')}"`,
          `"${((e.reflection?.knownVsAssumed?.known || []) as string[]).join("; ").replace(/"/g, '""')}"`,
          `"${((e.reflection?.knownVsAssumed?.assumed || []) as string[]).join("; ").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loop-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast.success("Data exported");
  };

  const handleDeleteAccount = async (reason: string, details: string) => {
    if (!user) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { reason, details },
      });
      if (error) throw error;
      await signOut();
      toast.success("Account deleted");
      navigate("/login");
    } catch (e) {
      toast.error("Failed to delete account. Please try again.");
    }
    setDeleting(false);
  };

  const handleToggleMarketingConsent = async () => {
    if (!user || togglingConsent) return;
    setTogglingConsent(true);
    const newValue = !profile?.marketing_consent;
    const { error } = await supabase
      .from("profiles")
      .update({ marketing_consent: newValue })
      .eq("user_id", user.id);
    if (error) {
      toast.error("Failed to update preference");
    } else {
      await refreshProfile();
      // Sync to Resend (best-effort)
      resend.updateContact(user.email!, !newValue)
        .catch(() => { /* best-effort sync */ });
    }
    setTogglingConsent(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="h-full min-h-0 mesh-gradient-bg flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 scroll-container pt-6 px-5 space-y-6" style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 32px)' }}>
        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl surface-low p-5 flex items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full surface-high flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <h3 className="text-on-surface font-body text-lg font-semibold">
              {profile?.display_name || "User"}
            </h3>
            <p className="text-on-surface-variant text-sm">{user?.email ?? ""}</p>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Change Password */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <KeyRound size={18} className="text-on-surface-variant" />
              <span className="text-on-surface text-sm font-semibold">Change Password</span>
            </div>
            <span className="text-on-surface-variant">›</span>
          </motion.button>

          {showPasswordForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl surface-low p-5 space-y-3"
            >
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 pr-12 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl bg-background border border-border px-4 py-3 pr-12 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  aria-label={showConfirmPw ? "Hide confirm password" : "Show confirm password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleChangePassword}
                disabled={updating}
                className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50"
              >
                {updating ? "Updating..." : "Update Password"}
              </button>
            </motion.div>
          )}

          {/* Export Data */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={handleExportData}
            disabled={exporting}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Download size={18} className="text-on-surface-variant" />
              <span className="text-on-surface text-sm font-semibold">
                {exporting ? "Exporting..." : "Export Data"}
              </span>
            </div>
            <span className="text-on-surface-variant">›</span>
          </motion.button>

          {/* Marketing Emails */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-on-surface-variant" />
              <div>
                <span className="text-on-surface text-sm font-semibold">Tips & Updates</span>
                <p className="text-on-surface-variant text-xs mt-0.5">Occasional emails about thought patterns</p>
              </div>
            </div>
            <button
              onClick={handleToggleMarketingConsent}
              disabled={togglingConsent}
              role="switch"
              aria-checked={!!profile?.marketing_consent}
              aria-label="Toggle marketing emails"
              className={`relative w-11 h-6 rounded-full transition-colors ${
                profile?.marketing_consent ? "bg-mint" : "bg-surface-high"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  profile?.marketing_consent ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </motion.div>

          {/* Support */}
          <motion.a
            href="https://loopmind.care/support"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <LifeBuoy size={18} className="text-on-surface-variant" />
              <span className="text-on-surface text-sm font-semibold">Support</span>
            </div>
            <ExternalLink size={16} className="text-on-surface-variant" />
          </motion.a>

          {/* Feature Requests */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            onClick={() => setShowFeedback(true)}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Lightbulb size={18} className="text-on-surface-variant" />
              <div className="text-left">
                <span className="text-on-surface text-sm font-semibold block">Feature Requests</span>
                <span className="text-on-surface-variant text-xs">Vote on what we build next</span>
              </div>
            </div>
            <span className="text-on-surface-variant">›</span>
          </motion.button>

          {/* Sign Out */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={handleSignOut}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-on-surface-variant" />
              <span className="text-on-surface text-sm font-semibold">Sign Out</span>
            </div>
            <span className="text-on-surface-variant">›</span>
          </motion.button>
        </div>

        <DeleteAccountDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirmDelete={handleDeleteAccount}
          deleting={deleting}
        />

        {/* Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-4 text-xs text-on-surface-variant pt-2"
        >
          <a href="https://loopmind.care/privacy" target="_blank" rel="noopener noreferrer" aria-label="Privacy Policy (opens in new window)" className="underline underline-offset-2 hover:text-on-surface transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="https://loopmind.care/terms" target="_blank" rel="noopener noreferrer" aria-label="Terms (opens in new window)" className="underline underline-offset-2 hover:text-on-surface transition-colors">Terms</a>
        </motion.div>

        {/* Delete Account */}
        <div className="flex flex-col items-center gap-2 py-4">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-destructive text-sm font-semibold"
          >
            <Trash2 size={16} />
            Delete Account
          </motion.button>
        </div>
      </div>
      <FeedbackPanel open={showFeedback} onClose={() => setShowFeedback(false)} />
    </div>
  );
}
