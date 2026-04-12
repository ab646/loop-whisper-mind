import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
import { loops } from "@/lib/loops";

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  mantra: string | null;
  voice_first_mode: boolean;
  urgency_filter: boolean;
  onboarding_complete: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedToLoops = useRef(false);

  const fetchProfile = async (userId: string, userSession?: Session | null) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, mantra, voice_first_mode, urgency_filter, onboarding_complete")
      .eq("user_id", userId)
      .single();
    setProfile(data);

    // Only sync PII to Loops after the user has completed onboarding
    // (which includes accepting terms & privacy policy).
    const s = userSession ?? session;
    if (data?.onboarding_complete && !syncedToLoops.current && s?.user) {
      syncedToLoops.current = true;
      loops.createContact({
        email: s.user.email!,
        firstName: s.user.user_metadata?.full_name?.split(" ")[0],
        lastName: s.user.user_metadata?.full_name?.split(" ").slice(1).join(" "),
      }).catch(() => { /* Loops sync is best-effort */ });
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          analytics.identify(session.user.id);
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchProfile(session.user.id, session), 0);
        } else {
          setProfile(null);
          syncedToLoops.current = false;
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    analytics.reset();
    sessionStorage.removeItem("loop.justCompletedOAuth");
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
