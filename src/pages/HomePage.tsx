import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Mic } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
import { ScribblingLogo } from "@/components/LoopLogo";
import { AppHeader } from "@/components/AppHeader";
import { VoiceOrb } from "@/components/VoiceOrb";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ChatInput } from "@/components/ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateLoop } from "@/hooks/useCreateLoop";
import { toast } from "sonner";
import { CrisisCard, CrisisResources } from "@/components/CrisisCard";
import { useLocation } from "react-router-dom";

interface EntryPreview {
  id: string;
  date: string;
  time: string;
  mainLoop: string;
  tags: string[];
  createdAt: string;
  hasReflection: boolean;
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - entryDate.getTime()) / 86400000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 14) return "Last Week";
  if (diffDays < 30) return "This Month";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function groupEntries(entries: EntryPreview[]): [string, EntryPreview[]][] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const groups: Record<string, EntryPreview[]> = {};
  const order: string[] = [];
  for (const entry of sorted) {
    const group = getDateGroup(entry.createdAt);
    if (!groups[group]) {
      groups[group] = [];
      order.push(group);
    }
    groups[group].push(entry);
  }
  return order.map((g) => [g, groups[g]]);
}


export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, profile } = useAuth();
  const { createEntry, loading: creatingLoop } = useCreateLoop();
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstEntryRef = useRef<HTMLButtonElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);
  const [navigatingOut, setNavigatingOut] = useState(false);
  const [crisisData, setCrisisData] = useState<{ message: string; resources: CrisisResources } | null>(null);

  useEffect(() => {
    setNavigatingOut(false);
    // Check if we arrived here with crisis data from RecordingPage
    if (location.state?.crisis) {
      setCrisisData(location.state.crisis);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, "");
    }
  }, []);

  const handleNavigateToRecording = () => {
    setNavigatingOut(true);
    setTimeout(() => navigate("/recording"), 350);
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("entries")
          .select("id, content, reflection, tags, created_at, entry_type")
          .eq("user_id", session.user.id)
          .neq("entry_type", "theme-exploration")
          .order("created_at", { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;

        if (data) {
          setEntries(
            data.map((e: any) => {
              const d = new Date(e.created_at);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
              let dateLabel: string;
              if (diffDays === 0) dateLabel = "Today";
              else if (diffDays === 1) dateLabel = "Yesterday";
              else dateLabel = d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

              return {
                id: e.id,
                date: dateLabel,
                time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                mainLoop: e.reflection?.mainLoop || e.content?.substring(0, 120) || "",
                tags: e.tags || [],
                createdAt: e.created_at,
                hasReflection: !!e.reflection,
              };
            })
          );
          setHasMore(data.length === 20);
          setError(null);
        }
      } catch (e) {
        console.error("Failed to load entries:", e);
        setError("Couldn't load your loops. Tap to retry.");
      }
      setLoading(false);
    })();
  }, [session, retryCount]);

  const loadMore = useCallback(async () => {
    if (!session || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("entries")
      .select("id, content, reflection, tags, created_at, entry_type")
      .eq("user_id", session.user.id)
      .neq("entry_type", "theme-exploration")
      .order("created_at", { ascending: false })
      .range(entries.length, entries.length + 19);

    if (data) {
      setEntries((prev) => [
        ...prev,
        ...data.map((e: any) => {
          const d = new Date(e.created_at);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
          let dateLabel: string;
          if (diffDays === 0) dateLabel = "Today";
          else if (diffDays === 1) dateLabel = "Yesterday";
          else dateLabel = d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

          return {
            id: e.id,
            date: dateLabel,
            time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            mainLoop: e.reflection?.mainLoop || e.content?.substring(0, 120) || "",
            tags: e.tags || [],
            createdAt: e.created_at,
            hasReflection: !!e.reflection,
          };
        }),
      ]);
      setHasMore(data.length === 20);
    }
    setLoadingMore(false);
  }, [session, loadingMore, hasMore, entries.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const recentLoopsRef = useRef<HTMLSpanElement>(null);
  const hasAlignedRef = useRef(false);

  useEffect(() => {
    if (loading || hasAlignedRef.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
      hasAlignedRef.current = true;
    }
  }, [loading]);

  const handleSend = async (text: string) => {
    const result = await createEntry({ content: text });
    if (result?.guard?.class === "crisis" && result.guard.resources) {
      setCrisisData({ message: result.guard.message, resources: result.guard.resources });
    } else if (result?.entryId) {
      navigate(`/journal/${result.entryId}`);
    }
  };

  const [imageProcessing, setImageProcessing] = useState(false);

  const handleImageSelected = async (imageDataUrl: string) => {
    setImageProcessing(true);
    try {
      const base64 = imageDataUrl.split(",")[1];
      const mimeMatch = imageDataUrl.match(/data:(.*?);/);
      const mime = mimeMatch?.[1] || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mime });

      const filePath = `${session?.user?.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, blob, { contentType: mime });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(filePath);

      const { data: validation, error: valError } = await supabase.functions.invoke("validate-image", {
        body: { imageUrl: urlData.publicUrl },
      });

      supabase.storage.from("chat-images").remove([filePath]).catch(() => {});

      if (valError) throw valError;
      if (!validation?.valid) {
        toast.error(validation?.reason || "Loop can't work with this image. Try a screenshot with words.");
        setImageProcessing(false);
        return;
      }

      const transcribedText = validation.transcription || "[Image content]";
      const result = await createEntry({ content: transcribedText, entryType: "image" });
      setImageProcessing(false);
      if (result?.entryId) navigate(`/journal/${result.entryId}`);
    } catch (e) {
      console.error("Image processing error:", e);
      toast.error("Failed to process image");
      setImageProcessing(false);
    }
  };

  if (crisisData) {
    return (
      <div className="h-[100dvh] mesh-gradient-bg flex flex-col items-center justify-center px-5" style={{ paddingBottom: 'var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom)))' }}>
        <div className="w-full max-w-md space-y-6">
          <CrisisCard message={crisisData.message} resources={crisisData.resources} />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setCrisisData(null)}
            className="w-full text-center text-on-surface-variant text-sm py-3"
          >
            Return to Loop
          </motion.button>
        </div>
      </div>
    );
  }

  if (creatingLoop || imageProcessing) {
    return <FullScreenLoader mode="reflection" />;
  }

  const groupedEntries = groupEntries(entries);
  const firstGroup = groupedEntries[0]?.[0];

  return (
    <div
      className="flex h-full min-h-0 flex-col mesh-gradient-bg relative overflow-hidden isolate"
    >

      <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-hidden px-5" style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 120px)' }}>
        <div className="shrink-0 flex flex-col items-center justify-center relative" style={{ height: '100svh' }}>
          <motion.div
            animate={{ opacity: navigatingOut ? 0 : 1, y: navigatingOut ? -10 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-[16%] text-center w-full flex flex-col items-center gap-3"
          >
            <StaticLogo size={48} />
            <div className="space-y-1">
            <p className="text-on-surface-variant text-sm tracking-wide">{getGreeting()}</p>
            <h1 className="font-display text-3xl font-normal text-on-surface">
              What's looping right now?
            </h1>
            </div>
          </motion.div>
          <div className="flex flex-col items-center gap-5">
            <VoiceOrb size="lg" onClick={handleNavigateToRecording} layoutId="voice-orb" />
            <motion.div
              animate={{ opacity: navigatingOut ? 0 : 1, y: navigatingOut ? 10 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p className="font-display text-sm text-mint italic">
                Your brain is full. Talk it out.
              </p>
            </motion.div>

          </div>
        </div>

      </div>

      <motion.div
        ref={chatInputRef}
        animate={{ opacity: navigatingOut ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="absolute left-0 right-0 z-40"
        style={{ bottom: 'max(var(--keyboard-height, 0px), calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 12px))' }}
      >
        <div className="flex items-center gap-3 px-4">
          <div className="flex-1 min-w-0">
            <ChatInput
              onSend={handleSend}
              onImageSelected={handleImageSelected}
              placeholder="Type your thoughts..."
            />
          </div>
          <button
            onClick={() => navigate("/recording")}
            className="p-2 text-on-surface-variant hover:text-mint transition-colors"
          >
            <Mic size={22} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
