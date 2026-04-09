import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown } from "lucide-react";

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
    const entryId = await createEntry({ content: text });
    if (entryId) navigate(`/chat/${entryId}`);
  };

  const handleImageSelected = async (imageDataUrl: string) => {
    // For images, navigate to a new chat page that handles image validation
    // We pass the image via router state since it's a one-time handoff
    navigate(`/chat/image`, { state: { prefillImage: imageDataUrl } });
  };

  if (creatingLoop) {
    return <FullScreenLoader mode="reflection" />;
  }

  const groupedEntries = groupEntries(entries);
  const firstGroup = groupedEntries[0]?.[0];

  return (
    <div
      className="flex h-full min-h-0 flex-col mesh-gradient-bg relative overflow-hidden isolate"
    >

      <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col scroll-container px-5" style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 120px)' }}>
        <div className="shrink-0 flex flex-col items-center justify-center relative" style={{ height: '100svh' }}>
          <motion.p
            animate={{ opacity: navigatingOut ? 0 : 1, y: navigatingOut ? -10 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-[16%] font-display text-3xl font-normal text-on-surface text-center w-full"
          >
            {getGreeting()}
          </motion.p>
          <div className="flex flex-col items-center gap-5">
            <VoiceOrb size="lg" onClick={handleNavigateToRecording} label={navigatingOut ? undefined : "START A LOOP"} layoutId="voice-orb" />
            <motion.div
              animate={{ opacity: navigatingOut ? 0 : 1, y: navigatingOut ? 10 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-center space-y-1"
            >
              <h2 className="font-display text-xl text-on-surface leading-tight">
                What's looping right now?
              </h2>
              <p className="font-display text-sm text-mint italic">
                Your brain is full. Talk it out.
              </p>
            </motion.div>

            {/* Pulsating scroll arrow */}
            <motion.div
              animate={{ opacity: navigatingOut ? 0 : 1 }}
              transition={{ duration: 0.2 }}
              className="mt-4"
            >
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronDown size={20} className="text-on-surface-variant/50" />
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="space-y-3 pb-4 shrink-0">
          <span ref={recentLoopsRef} className="label-uppercase">RECENT LOOPS</span>
          {loading ? (
            <div className="flex justify-center py-8">
              <ScribblingLogo size={24} />
            </div>
          ) : error && !loading ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => { setError(null); setLoading(true); setRetryCount((c) => c + 1); }}
              className="rounded-2xl surface-low p-6 text-center space-y-3 w-full"
            >
              <p className="text-on-surface text-sm">{error}</p>
              <p className="text-mint text-sm font-semibold">Retry</p>
            </motion.button>
          ) : entries.length === 0 ? (
            <motion.div
              ref={emptyStateRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl surface-low p-6 text-center space-y-3"
            >
              <p className="font-display text-lg text-on-surface italic">No loops yet.</p>
              <p className="text-on-surface-variant text-sm">
                Record your first voice note or type what's on your mind.
              </p>
            </motion.div>
          ) : (
            <>
              {groupedEntries.map(([group, groupItems]) => (
                <div key={group} className="space-y-2">
                  <span className="label-uppercase text-mint">{group}</span>
                  {groupItems.map((entry, i) => (
                    <motion.button
                      key={entry.id}
                      ref={i === 0 && group === firstGroup ? firstEntryRef : undefined}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/chat/${entry.id}`)}
                      className="w-full rounded-2xl surface-low p-4 flex items-start gap-3 text-left hover:bg-surface-container transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant text-[10px] tracking-wider uppercase font-semibold">
                            {entry.date} • {entry.time}
                          </span>
                        </div>
                        <p className="text-on-surface text-sm leading-relaxed line-clamp-2 font-body">
                          {entry.mainLoop}
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="tag-pill">
                              {tag.replace(/_/g, " ").trim().toLowerCase().replace(/^\w/, (char) => char.toUpperCase())}
                            </span>
                          ))}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-on-surface-variant mt-1 shrink-0" />
                    </motion.button>
                  ))}
                </div>
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  {loadingMore && <ScribblingLogo size={20} />}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <motion.div
        ref={chatInputRef}
        animate={{ opacity: navigatingOut ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="absolute left-0 right-0 z-40 px-0"
        style={{ bottom: 'max(var(--keyboard-height, 0px), calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 12px))' }}
      >
        <ChatInput
          onSend={handleSend}
          onImageSelected={handleImageSelected}
          onVoice={() => navigate("/recording")}
          placeholder="Type your thoughts..."
        />
      </motion.div>
    </div>
  );
}
