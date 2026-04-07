import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ScribblingLogo } from "@/components/LoopLogo";
import { AppHeader } from "@/components/AppHeader";
import { VoiceOrb } from "@/components/VoiceOrb";

import { ChatInput } from "@/components/ChatInput";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { session } = useAuth();
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstEntryRef = useRef<HTMLButtonElement>(null);

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

  // Infinite scroll via IntersectionObserver
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

  // On initial load, scroll to bottom so only the latest entry peeks above the chat
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    if (loading || entries.length === 0 || !scrollContainerRef.current || hasScrolledRef.current) return;
    hasScrolledRef.current = true;
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [loading, entries.length]);

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg relative overflow-hidden">
      {/* Background haze */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute top-[35%] left-[30%] -translate-x-1/2 w-[300px] h-[300px] rounded-full bg-mint/[0.04] blur-[100px]" />
        <div className="absolute top-[70%] left-[60%] w-[400px] h-[400px] rounded-full bg-primary/[0.05] blur-[110px]" />
      </div>
      

      <div ref={scrollContainerRef} className="flex-1 scroll-container px-5 flex flex-col" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 160px)' }}>
        {/* Hero — centered in available space */}
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100dvh - 320px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3"
          >
            <VoiceOrb size="md" onClick={() => navigate("/chat/new")} label="START A LOOP" />
            <div className="text-center space-y-1">
              <h2 className="font-display text-xl text-on-surface leading-tight">
                What's looping right now?
              </h2>
              <p className="font-display text-sm text-mint italic">
                Your brain is full. Talk it out.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Past entries */}
        <div className="space-y-3 pb-4 shrink-0">
          <span className="label-uppercase">RECENT LOOPS</span>
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
              {groupEntries(entries).map(([group, groupItems]) => (
                <div key={group} className="space-y-2">
                  <span className="label-uppercase text-mint">{group}</span>
                  {groupItems.map((entry, i) => (
                    <motion.button
                      key={entry.id}
                      ref={i === 0 && group === groupEntries(entries)[0][0] ? firstEntryRef : undefined}
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

      {/* ChatInput floats above the BottomNav with a gap; rises above keyboard when typing */}
      <div className="fixed left-0 right-0 z-40 px-0" style={{ bottom: 'max(var(--keyboard-height), calc(env(safe-area-inset-bottom) + 78px))' }}>
        <ChatInput
          onSend={(text) => navigate("/chat/new", { state: { prefillText: text } })}
          onImageSelected={(imageDataUrl) => navigate("/chat/new", { state: { prefillImage: imageDataUrl } })}
          onVoice={() => navigate("/recording")}
          placeholder="Type your thoughts..."
        />
      </div>
    </div>
  );
}