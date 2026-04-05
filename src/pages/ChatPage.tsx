import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Play } from "lucide-react";
import { VoiceOrb } from "@/components/VoiceOrb";
import { PromptChip } from "@/components/PromptChip";
import { ChatInput } from "@/components/ChatInput";
import { ReflectionCard } from "@/components/ReflectionCard";
import { Waveform } from "@/components/Waveform";

type Message =
  | { type: "voice"; duration: string }
  | { type: "text"; content: string }
  | { type: "reflection" };

const mockReflection = {
  mainLoop:
    "You seem stuck between wanting clarity and fearing what clarity might reveal.",
  knownVsAssumed: {
    known: ["You know they have not replied."],
    assumed: ["You may be assuming that means rejection."],
  },
  oneQuestion:
    "What are you hoping this situation will finally give you?",
  tags: ["SAFETY", "VALIDATION", "PEACE"],
};

const promptChips = [
  "Replaying a text?",
  "Feeling a spiral?",
  "Decision paralysis?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();

  const hasMessages = messages.length > 0;

  const handleSend = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { type: "text", content: text },
      { type: "reflection" },
    ]);
  };

  const handleVoice = () => {
    navigate("/recording");
  };

  const handleChip = (label: string) => {
    setMessages([
      { type: "voice", duration: "0:42" },
      { type: "reflection" },
    ]);
  };

  return (
    <div className="flex flex-col min-h-screen mesh-gradient-bg pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Menu size={20} className="text-on-surface-variant" />
          <h1 className="font-display text-xl text-on-surface font-semibold">Loop</h1>
        </div>
        <div className="w-9 h-9 rounded-full surface-high flex items-center justify-center">
          <span className="text-xs text-on-surface-variant">👤</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
            >
              <VoiceOrb size="lg" onClick={handleVoice} label="START A BRAIN DUMP" />

              <div className="text-center space-y-3 mt-4">
                <h2 className="font-display text-3xl text-on-surface leading-tight">
                  What's looping<br />right now?
                </h2>
                <p className="font-display text-base text-mint italic">
                  Your brain is full. Talk it out.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {promptChips.map((chip) => (
                  <PromptChip
                    key={chip}
                    label={chip}
                    onClick={() => handleChip(chip)}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 py-4"
            >
              <p className="label-uppercase text-center">TODAY • 10:42 AM</p>

              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.type === "voice" && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl orb-gradient px-4 py-3 flex items-center gap-3 max-w-[250px]">
                        <Play size={16} className="text-primary-foreground" />
                        <Waveform bars={12} />
                        <span className="text-primary-foreground text-sm font-body">
                          {msg.duration}
                        </span>
                      </div>
                    </div>
                  )}
                  {msg.type === "text" && (
                    <div className="flex justify-end">
                      <div className="rounded-2xl surface-high px-4 py-3 max-w-[280px]">
                        <p className="text-on-surface text-base">{msg.content}</p>
                      </div>
                    </div>
                  )}
                  {msg.type === "reflection" && (
                    <ReflectionCard {...mockReflection} />
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onVoice={handleVoice}
        placeholder={hasMessages ? "Type a reflection..." : "Type your thoughts..."}
      />
    </div>
  );
}
