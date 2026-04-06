import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
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
            let dateLabel = d.toLocaleDateString("en-US", { weekday: "long" });
            if (diffDays === 0) dateLabel = "Today";
            else if (diffDays === 1) dateLabel = "Yesterday";

            return {
              id: e.id,
              date: dateLabel,
              time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
              mainLoop: e.reflection?.mainLoop || e.content?.substring(0, 120) || "",
              tags: e.tags || [],
            };
          })
        );
      }
      setLoading(false);
    })();
  }, [session]);

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      

      <div className="flex-1 overflow-y-auto px-5 flex flex-col">
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
              <Loader2 className="animate-spin text-mint" size={20} />
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
            entries.map((entry, i) => (
              <motion.button
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
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
                        className="px-2 py-0.5 rounded-full surface-high text-[9px] text-on-surface-variant tracking-wider uppercase font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={16} className="text-on-surface-variant mt-1 shrink-0" />
              </motion.button>
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
