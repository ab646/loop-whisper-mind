import { motion } from "framer-motion";
import { KeyRound, Download, Trash2, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Fix #15: Include reflections in data export
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

  // Fix #14: Delete account via edge function (removes auth user too)
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24 pt-6">
      <div className="px-5 space-y-6">
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
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl bg-background border border-border px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
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

          {/* Delete Account */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={18} className="text-destructive" />
              <span className="text-destructive text-sm font-semibold">Delete Account</span>
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

        {/* Sign out */}
        <div className="flex flex-col items-center gap-2 py-6">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="flex items-center gap-2 text-destructive text-sm font-semibold"
          >
            <LogOut size={16} />
            Sign Out
          </motion.button>
        </div>
      </div>
    </div>
  );
}