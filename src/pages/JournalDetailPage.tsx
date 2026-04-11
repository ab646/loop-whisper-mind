import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical, Trash2, ArrowUp } from "lucide-react";
import { ReflectionCard } from "@/components/ReflectionCard";
import { CyclingLoader } from "@/components/CyclingLoader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ScribblingLogo } from "@/components/LoopLogo";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntryData {
  id: string;
  content: string;
  reflection: any;
  tags: string[];
  createdAt: string;
  entryType: string;
  userId: string;
  voiceDuration: string | null;
}

/** Clean up raw user text: remove filler words, paragraph nicely */
function beautifyText(raw: string): string[] {
  const fillers = /\b(um|uh|like|you know|I mean|basically|actually|so yeah|kind of|sort of|I guess)\b/gi;
  let cleaned = raw.replace(fillers, "").replace(/\s{2,}/g, " ").trim();
  
  // Split into paragraphs — on double newlines, or every ~2-3 sentences
  const parts = cleaned.split(/\n{2,}/);
  const paragraphs: string[] = [];
  
  for (const part of parts) {
    const sentences = part.match(/[^.!?]+[.!?]+/g) || [part];
    let current = "";
    for (const sentence of sentences) {
      current += sentence.trim() + " ";
      if (current.length > 200) {
        paragraphs.push(current.trim());
        current = "";
      }
    }
    if (current.trim()) paragraphs.push(current.trim());
  }
  
  return paragraphs.length > 0 ? paragraphs : [cleaned];
}

export default function JournalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Exploration wizard state
  const [explorationMessages, setExplorationMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [explorationInput, setExplorationInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [explorationLoading, setExplorationLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setEntry({
          id: data.id,
          content: data.content,
          reflection: data.reflection,
          tags: data.tags || [],
          createdAt: data.created_at,
          entryType: data.entry_type,
          userId: data.user_id,
          voiceDuration: data.voice_duration,
        });
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [explorationMessages, explorationLoading]);

  const handleExplore = async (question: string) => {
    if (!question.trim() || explorationLoading) return;
    setExplorationMessages((prev) => [...prev, { role: "user", content: question }]);
    setExplorationInput("");
    setExplorationLoading(true);

    const theme = entry?.tags?.[0] || "reflection";
    try {
      const { data, error } = await supabase.functions.invoke("explore-theme", {
        body: { theme: theme.toLowerCase(), question },
      });
      if (error) throw error;
      const answer = data?.answer || data?.connectedBelief || "I couldn't generate a reflection for that.";
      setExplorationMessages((prev) => [...prev, { role: "ai", content: answer }]);
    } catch {
      toast.error("Failed to get answer");
    }
    setExplorationLoading(false);
  };

  const handleDelete = async () => {
    if (!entry) return;

    const deletedEntry = {
      id: entry.id,
      content: entry.content,
      reflection: entry.reflection,
      tags: entry.tags,
      created_at: entry.createdAt,
      entry_type: entry.entryType,
      user_id: entry.userId,
      voice_duration: entry.voiceDuration,
    };

    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", entry.id)
      .eq("user_id", entry.userId);

    if (error) {
      toast.error("Failed to delete entry");
      return;
    }

    navigate("/journal");
    toast("Entry deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          const { error: undoError } = await supabase.from("entries").insert(deletedEntry);

          if (undoError) {
            toast.error("Couldn't restore entry");
            return;
          }

          navigate(`/journal/${entry.id}`);
        },
      },
      duration: 5000,
    });
  };

  if (loading) return <FullScreenLoader mode="reflection" />;
  if (!entry) return <div className="h-[100dvh] mesh-gradient-bg flex items-center justify-center"><p className="text-on-surface-variant">Entry not found</p></div>;

  const date = new Date(entry.createdAt);
  const dayLabel = date.toLocaleDateString("en-US", { day: "numeric", month: "long" }).toUpperCase();
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const reflection = entry.reflection;
  const paragraphs = beautifyText(entry.content);

  return (
    <div className="h-full min-h-0 mesh-gradient-bg flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pb-2 sticky top-0 z-30 mesh-gradient-bg" style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
        <button onClick={() => navigate("/journal")} className="text-on-surface-variant hover:text-mint transition-colors w-8">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1" />
        <div className="w-8 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-high border-border/30">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive gap-2">
                <Trash2 size={14} />
                Delete entry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 scroll-container px-5 space-y-4" style={{ paddingBottom: 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 96px)' }}>

        {/* Date header - scrolls with content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-4 pb-2 space-y-1.5 flex flex-col items-center"
        >
          <p className="text-on-surface-variant text-[10px] tracking-[0.2em] uppercase font-semibold">{dayLabel}</p>
          <h1 className="font-display text-2xl text-on-surface">{weekday}</h1>
          <span className="mt-1 inline-block rounded-full surface-low border border-border/20 px-3 py-0.5 text-on-surface-variant text-[10px] tracking-wider uppercase font-semibold">
            {date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        </motion.div>

        
        {/* Beautified user entry */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl surface-low p-5 space-y-3 border border-border/10"
        >
          <div className="flex items-center">
            <span className="label-uppercase text-mint">
              {entry.entryType === "voice" ? "Voice Entry" : "Journal"}
            </span>
          </div>
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-on-surface text-[15px] leading-[1.75] font-body">
                {p}
              </p>
            ))}
          </div>
        </motion.div>

        {/* Full reflection card */}
        {reflection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <ReflectionCard
              mainLoop={reflection.mainLoop || ""}
              feelings={reflection.feelings}
              knownVsAssumed={reflection.knownVsAssumed || { known: [], assumed: [] }}
              repeatingPattern={reflection.repeatingPattern}
              oneQuestion={reflection.oneQuestion || ""}
              tags={reflection.tags}
            />
          </motion.div>
        )}

        {/* Exploration messages */}
        {reflection && explorationMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-3"
          >
            {explorationMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
                      <p className="text-on-surface text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 space-y-2 border-l-4 border-mint/30 surface-container">
                    <span className="label-uppercase text-mint">Reflection</span>
                    <p className="text-on-surface text-sm leading-relaxed font-body">{msg.content}</p>
                    <div className="flex justify-end">
                      <FeedbackButtons
                        contentType="exploration-answer"
                        contentId={`journal-explore-${id}-${i}`}
                        contentPreview={msg.content}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {explorationLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                <CyclingLoader mode="reflection" size={20} layout="inline" />
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </motion.div>
        )}
      </div>

      {/* Fixed exploration input */}
      {reflection && (
        <div
          className="absolute inset-x-0 z-[60] w-full max-w-md mx-auto px-4"
          style={{ bottom: 'max(var(--keyboard-height, 0px), calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 12px))' }}
        >
          <motion.div
            layout
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="rounded-xl surface-high px-4 py-3 border border-border/20 shadow-lg"
          >
            {inputFocused || explorationInput.trim() ? (
              <motion.div
                key="input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <input
                  value={explorationInput}
                  onChange={(e) => setExplorationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleExplore(explorationInput)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Ask a follow-up..."
                  className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
                  autoFocus
                />
                <button
                  onClick={() => handleExplore(explorationInput)}
                  disabled={!explorationInput.trim() || explorationLoading}
                  className="w-7 h-7 rounded-full orb-gradient flex items-center justify-center disabled:opacity-50"
                >
                  {explorationLoading ? (
                    <ScribblingLogo size={14} />
                  ) : (
                    <ArrowUp size={14} className="text-primary-foreground" />
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => setInputFocused(true)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="w-7 h-7 rounded-full orb-gradient flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs">✦</span>
                </div>
                <span className="text-on-surface-variant text-sm">
                  Want to go deeper? Ask a follow-up
                </span>
              </motion.button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
