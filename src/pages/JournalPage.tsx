import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Pen, RefreshCw, Sparkles } from "lucide-react";
import { ScribblingLogo } from "@/components/LoopLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface JournalEntry {
  id: string;
  content: string;
  mainLoop: string;
  pattern: string | null;
  tags: string[];
  createdAt: string;
  entryType: string;
  hasReflection: boolean;
}

function getDateGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - entryDate.getTime()) / 86400000);

  if (diffDays <= 0) {
    const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return `Today, ${day}`;
  }
  if (diffDays === 1) {
    const day = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return `Yesterday, ${day}`;
  }
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
}

function groupEntries(entries: JournalEntry[]): [string, JournalEntry[]][] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const groups: Record<string, JournalEntry[]> = {};
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

export default function JournalPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("entries")
          .select("id, content, reflection, tags, created_at, entry_type")
          .eq("user_id", session.user.id)
          .neq("entry_type", "theme-exploration")
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        if (data) {
          setEntries(data.map(mapEntry));
          setHasMore(data.length === 20);
        }
      } catch (e) {
        console.error("Failed to load journal:", e);
      }
      setLoading(false);
    })();
  }, [session]);

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
      setEntries((prev) => [...prev, ...data.map(mapEntry)]);
      setHasMore(data.length === 20);
    }
    setLoadingMore(false);
  }, [session, loadingMore, hasMore, entries.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const grouped = groupEntries(entries);

  return (
    <div className="h-screen mesh-gradient-bg flex flex-col overflow-hidden relative">
      <div
        className="flex-1 scroll-container px-5 space-y-6 pt-6"
        style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 32px)' }}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl text-on-surface leading-tight tracking-tight">
            Journal
          </h1>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <ScribblingLogo size={24} />
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl surface-low p-6 text-center space-y-3"
          >
            <p className="font-display text-lg text-on-surface italic">No entries yet.</p>
            <p className="text-on-surface-variant text-sm">
              Start a reflection and your journal will grow here.
            </p>
          </motion.div>
        ) : (
          grouped.map(([group, items]) => (
            <div key={group} className="space-y-3">
              {/* Day header */}
              <h2 className="font-display text-xl text-on-surface font-semibold">{group}</h2>

              {/* Entry cards */}
              <div className="space-y-3">
                {items.map((entry, i) => (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/journal/${entry.id}`)}
                    className="w-full text-left rounded-2xl surface-low border border-border/10 overflow-hidden"
                  >
                    {/* Entry section */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-on-surface/10 flex items-center justify-center">
                          <Pen size={13} className="text-on-surface" />
                        </div>
                        <span className="text-on-surface font-display text-base font-semibold">
                          {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-3 font-body">
                        {entry.content.substring(0, 200)}
                      </p>
                    </div>

                    {/* Main loop section */}
                    {entry.mainLoop && (
                      <div className="border-t border-border/10 p-4 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-on-surface flex items-center justify-center">
                            <RefreshCw size={13} className="text-background" />
                          </div>
                          <span className="text-on-surface font-display text-base font-semibold">Main loop</span>
                        </div>
                        <p className="text-on-surface text-sm leading-relaxed font-body line-clamp-3">
                          {entry.mainLoop}
                        </p>
                      </div>
                    )}

                    {/* Pattern section */}
                    {(entry.pattern || entry.tags.length > 0) && (
                      <div className="border-t border-border/10 p-4 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-on-surface/10 flex items-center justify-center">
                            <Sparkles size={13} className="text-on-surface" />
                          </div>
                          <span className="text-on-surface font-display text-base font-semibold">Pattern</span>
                        </div>
                        {entry.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {entry.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="tag-pill">
                                {tag.replace(/_/g, " ").trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        )}

        {hasMore && entries.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            {loadingMore && <ScribblingLogo size={20} />}
          </div>
        )}
      </div>
    </div>
  );
}

function mapEntry(e: any): JournalEntry {
  const reflection = e.reflection as any;
  return {
    id: e.id,
    content: e.content || "",
    mainLoop: reflection?.mainLoop || "",
    pattern: reflection?.repeatingPattern || null,
    tags: e.tags || [],
    createdAt: e.created_at,
    entryType: e.entry_type,
    hasReflection: !!reflection,
  };
}
