import { motion } from "framer-motion";
import { KeyRound, Download, Trash2, LogOut, Bell, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";
import { scheduleAdaptiveNotification } from "@/lib/adaptive-notifications";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (profile) {
      setNotificationsEnabled((profile as any).notifications_enabled ?? false);
    }
  }, [profile]);

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    setNotificationsLoading(true);

    if (enabled && isNative) {
      const permResult = await LocalNotifications.requestPermissions();
      if (permResult.display !== "granted") {
        toast.error("Please enable notifications in your device settings");
        setNotificationsLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ notifications_enabled: enabled } as any)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update notification preference");
      setNotificationsLoading(false);
      return;
    }

    setNotificationsEnabled(enabled);

    if (enabled && isNative) {
      await scheduleAdaptiveNotification();
      toast.success("Notifications enabled");
    } else if (!enabled && isNative) {
      await LocalNotifications.cancel({ notifications: [{ id: 1001 }] }).catch(() => {});
      toast.success("Notifications disabled");
    } else if (enabled && !isNative) {
      toast.success("Notifications will activate on the mobile app");
    } else {
      toast.success("Notifications disabled");
    }

    setNotificationsLoading(false);
  };
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
    <div className="h-screen mesh-gradient-bg flex flex-col overflow-hidden">
      <div className="flex-1 scroll-container pt-6 px-5 space-y-6" style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 32px)' }}>
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
          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.03 }}
            className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-on-surface-variant" />
              <span className="text-on-surface text-sm font-semibold">Daily Reminders</span>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleToggleNotifications}
              disabled={notificationsLoading}
            />
          </motion.div>
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

          {/* Sign Out */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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

        {/* Delete Account */}
        <div className="flex flex-col items-center gap-2 py-6">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-destructive text-sm font-semibold"
          >
            <Trash2 size={16} />
            Delete Account
          </motion.button>
        </div>
      </div>
    </div>
  );
}