import { motion } from "framer-motion";
import { Shield, Upload, Mic, LogOut } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const togglePreference = async (field: "urgency_filter" | "voice_first_mode") => {
    if (!user || !profile) return;
    const newVal = !profile[field];
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: newVal })
      .eq("user_id", user.id);
    if (error) toast.error("Failed to update");
    else await refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen mesh-gradient-bg pb-24">
      <AppHeader />

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
            <h3 className="text-on-surface font-body text-lg font-semibold">{profile?.display_name || "User"}</h3>
            <p className="text-on-surface-variant text-sm">{profile?.mantra || "Stay Grounded"}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-mint text-xs font-semibold">CURRENT STREAK</span>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-5 h-2 rounded-full bg-mint" />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Cognitive preferences */}
        <div className="space-y-4">
          <h3 className="font-display text-lg text-mint italic">Cognitive Preferences</h3>

          <div className="rounded-2xl surface-low p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-mint">🔽</span>
              <ToggleSwitch checked={profile?.urgency_filter ?? true} onChange={() => togglePreference("urgency_filter")} />
            </div>
            <h4 className="text-on-surface font-body font-semibold">High-Urgency Filter</h4>
            <p className="text-on-surface-variant text-sm">
              Only allow loops that require immediate spatial awareness.
            </p>
          </div>

          <div className="rounded-2xl surface-low p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Mic size={18} className="text-on-surface-variant" />
              <ToggleSwitch checked={profile?.voice_first_mode ?? false} onChange={() => togglePreference("voice_first_mode")} />
            </div>
            <h4 className="text-on-surface font-body font-semibold">Voice-First Mode</h4>
            <p className="text-on-surface-variant text-sm">
              Default to audio interactions to reduce screen fatigue.
            </p>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="space-y-4">
          <h3 className="font-display text-lg text-mint italic">Privacy & Security</h3>
          {[
            { icon: Shield, label: "Secure My Sanctuary" },
            { icon: Upload, label: "Data Export" },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full rounded-2xl surface-low p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className="text-on-surface-variant" />
                <span className="text-on-surface text-sm font-semibold">{item.label}</span>
              </div>
              <span className="text-on-surface-variant">›</span>
            </button>
          ))}
        </div>

        {/* Account */}
        <div className="space-y-4">
          <h3 className="font-display text-lg text-mint italic">Account</h3>
          <div className="flex items-center justify-between">
            <span className="label-uppercase">EMAIL ADDRESS</span>
            <span className="text-on-surface text-sm">{user?.email ?? ""}</span>
          </div>

          <div className="rounded-2xl surface-low p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-mint">⭐</span>
              <div>
                <p className="text-on-surface text-sm font-semibold">Loop Premium</p>
                <p className="text-on-surface-variant text-[10px] tracking-wider uppercase">RENEWS OCT 24, 2024</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg surface-high text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
              Manage
            </button>
          </div>
        </div>

        {/* Sign out */}
        <div className="flex flex-col items-center gap-2 py-6">
          <motion.button
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full relative transition-colors ${
        checked ? "bg-mint" : "bg-surface-high"
      }`}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-on-surface absolute top-0.5"
        animate={{ left: checked ? 26 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
