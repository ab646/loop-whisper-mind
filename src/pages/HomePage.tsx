import { useState, useEffect } from "react";
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
  // Entries arrive pre-sorted newest-first from DB.
  // We preserve that order: first group seen = most recent.
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

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from("entries")
        .select("id, content, reflection, tags, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

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
      }
      setLoading(false);
    })();
  }, [session]);

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      

      <div className="flex-1 overflow-y-auto px-5 pt-16 flex flex-col">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col items-center justify-center gap-5"
        >
          <VoiceOrb size="lg" onClick={() => navigate("/chat/new")} label="START A LOOP" />
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl text-on-surface leading-tight">
              What's looping<br />right now?
            </h2>
            <p className="font-display text-sm text-mint italic">
              Your brain is full. Talk it out.
            </p>
          </div>
        </motion.div>

        {/* Past entries */}
        <div className="space-y-3 mt-auto pt-16 pb-4">
          <span className="label-uppercase">RECENT LOOPS</span>
          {loading ? (
            <div className="flex justify-center py-8">
              <ScribblingLogo size={24} />
            </div>
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
            groupEntries(entries).map(([group, groupItems]) => (
              <div key={group} className="space-y-2">
                <span className="label-uppercase text-mint">{group}</span>
                {groupItems.map((entry, i) => (
                  <motion.button
                    key={entry.id}
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
                      <div className="flex gap-1.5 flex-wrap">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full surface-high text-[9px] text-mint tracking-wider uppercase font-semibold border border-mint/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-on-surface-variant mt-1 shrink-0" />
                  </motion.button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 pb-20">
        <ChatInput
          onSend={(text) => navigate("/chat/new", { state: { initialText: text } })}
          onVoice={() => navigate("/recording")}
          placeholder="Type your thoughts..."
        />
      </div>
    </div>
  );
}
