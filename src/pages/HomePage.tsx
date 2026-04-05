import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { VoiceOrb } from "@/components/VoiceOrb";
import { PromptChip } from "@/components/PromptChip";
import { ChatInput } from "@/components/ChatInput";

interface EntryPreview {
  id: string;
  date: string;
  time: string;
  mainLoop: string;
  tags: string[];
}

const pastEntries: EntryPreview[] = [
  {
    id: "3",
    date: "Today",
    time: "10:42 AM",
    mainLoop: "Stuck between wanting clarity and fearing what clarity might reveal.",
    tags: ["SAFETY", "VALIDATION"],
  },
  {
    id: "2",
    date: "Yesterday",
    time: "11:30 PM",
    mainLoop: "The waiting has become the loop itself. You're not just waiting for a reply.",
    tags: ["AMBIGUITY", "CONTROL"],
  },
  {
    id: "1",
    date: "Monday",
    time: "9:15 AM",
    mainLoop: "Replaying a conversation looking for proof you said something wrong.",
    tags: ["REASSURANCE", "REJECTION"],
  },
  {
    id: "0",
    date: "Last Friday",
    time: "3:20 PM",
    mainLoop: "Overthinking whether to send a follow-up or let it go.",
    tags: ["DECISION PARALYSIS"],
  },
];

const promptChips = [
  "Replaying a text?",
  "Feeling a spiral?",
  "Decision paralysis?",
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      <AppHeader />

      <div className="flex-1 overflow-y-auto px-5 space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 pt-4"
        >
          <VoiceOrb size="lg" onClick={() => navigate("/chat/new")} label="START A BRAIN DUMP" />
          <div className="text-center space-y-2">
            <h2 className="font-display text-2xl text-on-surface leading-tight">
              What's looping<br />right now?
            </h2>
            <p className="font-display text-sm text-mint italic">
              Your brain is full. Talk it out.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {promptChips.map((chip) => (
              <PromptChip key={chip} label={chip} onClick={() => navigate("/chat/new")} />
            ))}
          </div>
        </motion.div>

        {/* Past entries */}
        <div className="space-y-3">
          <span className="label-uppercase">RECENT LOOPS</span>
          {pastEntries.map((entry, i) => (
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
          ))}
        </div>
      </div>

      {/* Floating input */}
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
