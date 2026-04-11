import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ScribblingLogo } from "@/components/LoopLogo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface JournalEntry {
  id: string;
  content: string;
  displayContent: string | null;
  summary: string;
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

  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
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
          .select("id, content, display_content, reflection, tags, created_at, entry_type")
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
      .select("id, content, display_content, reflection, tags, created_at, entry_type")
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
    <div className="h-full min-h-0 mesh-gradient-bg flex flex-col overflow-hidden relative">
      <div
        className="flex-1 min-h-0 scroll-container px-5 space-y-10 pt-6"
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
              <h2 className="font-display text-xl font-semibold">
                {group.includes(", ") ? (
                  <>
                    <span className="text-on-surface">{group.split(", ")[0]},</span>{" "}
                    <span className="text-on-surface-variant/60">{group.split(", ").slice(1).join(", ")}</span>
                  </>
                ) : (
                  <span className="text-on-surface">{group}</span>
                )}
              </h2>

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
                    {/* Header — single row: icon + JOURNAL + Summary + time */}
                    <div className="flex items-center gap-2.5 px-4 py-3">
                      <span className="text-on-surface-variant/60 text-xs font-body shrink-0">
                        {new Date(entry.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      <ChevronRight className="ml-auto text-on-surface-variant/40 shrink-0" size={16} />
                    </div>

                    {/* Summary content — prefer display_content for a richer preview */}
                    <div className="px-4 pb-3">
                      <p className="text-on-surface text-sm leading-relaxed line-clamp-3 font-body">
                        {entry.displayContent || entry.content.substring(0, 300)}
                      </p>
                    </div>



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
    displayContent: e.display_content || null,
    summary: reflection?.summary || "",
    mainLoop: reflection?.mainLoop || "",
    pattern: reflection?.repeatingPattern || null,
    tags: e.tags || [],
    createdAt: e.created_at,
    entryType: e.entry_type,
    hasReflection: !!reflection,
  };
}
