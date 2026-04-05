import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Play } from "lucide-react";
import { ChatInput } from "@/components/ChatInput";
import { ReflectionCard } from "@/components/ReflectionCard";
import { Waveform } from "@/components/Waveform";
import { VoiceOrb } from "@/components/VoiceOrb";
import { PromptChip } from "@/components/PromptChip";

interface VoiceMessage {
  id: string;
  type: "voice";
  duration: string;
  timestamp: string;
}

interface TextMessage {
  id: string;
  type: "text";
  content: string;
  timestamp: string;
}

interface ReflectionMessage {
  id: string;
  type: "reflection";
  timestamp: string;
  data: {
    mainLoop: string;
    knownVsAssumed: { known: string[]; assumed: string[] };
    oneQuestion: string;
    tags: string[];
  };
}

type Message = VoiceMessage | TextMessage | ReflectionMessage;

const pastEntries: Message[] = [
  {
    id: "1",
    type: "voice",
    duration: "1:12",
    timestamp: "Mon • 9:15 AM",
  },
  {
    id: "2",
    type: "reflection",
    timestamp: "Mon • 9:15 AM",
    data: {
      mainLoop: "You're replaying a conversation looking for proof you said something wrong, but the evidence keeps shifting.",
      knownVsAssumed: {
        known: ["They said 'let's talk later.'"],
        assumed: ["You may be reading that as a permanent withdrawal."],
      },
      oneQuestion: "What would you need to hear to feel safe right now?",
      tags: ["REASSURANCE", "REJECTION"],
    },
  },
  {
    id: "3",
    type: "text",
    content: "I keep checking my phone. It's been 6 hours and nothing. I know I shouldn't read into it but my brain won't stop.",
    timestamp: "Tue • 11:30 PM",
  },
  {
    id: "4",
    type: "reflection",
    timestamp: "Tue • 11:30 PM",
    data: {
      mainLoop: "The waiting has become the loop itself. You're not just waiting for a reply — you're waiting for permission to stop worrying.",
      knownVsAssumed: {
        known: ["They haven't replied in 6 hours."],
        assumed: ["You may be assuming silence means something is wrong between you."],
      },
      oneQuestion: "What would you be doing right now if the reply had already come?",
      tags: ["AMBIGUITY", "CONTROL"],
    },
  },
  {
    id: "5",
    type: "voice",
    duration: "0:42",
    timestamp: "Today • 10:42 AM",
  },
  {
    id: "6",
    type: "reflection",
    timestamp: "Today • 10:42 AM",
    data: {
      mainLoop: "You seem stuck between wanting clarity and fearing what clarity might reveal.",
      knownVsAssumed: {
        known: ["You know they have not replied."],
        assumed: ["You may be assuming that means rejection."],
      },
      oneQuestion: "What are you hoping this situation will finally give you?",
      tags: ["SAFETY", "VALIDATION", "PEACE"],
    },
  },
];

const promptChips = [
  "Replaying a text?",
  "Feeling a spiral?",
  "Decision paralysis?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(pastEntries);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (text: string) => {
    const now = new Date();
    const ts = `Today • ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "text", content: text, timestamp: ts },
      {
        id: crypto.randomUUID(),
        type: "reflection",
        timestamp: ts,
        data: {
          mainLoop: "You seem to be circling around a need for certainty in a situation that can't provide it yet.",
          knownVsAssumed: {
            known: ["You expressed what you're feeling."],
            assumed: ["You may be assuming the worst outcome is the most likely one."],
          },
          oneQuestion: "If this resolved exactly how you wanted — what would actually change?",
          tags: ["UNCERTAINTY", "HOPE"],
        },
      },
    ]);
  };

  const handleVoice = () => {
    navigate("/recording");
  };

  const handleChip = (label: string) => {
    const ts = "Now";
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "voice", duration: "0:42", timestamp: ts },
      {
        id: crypto.randomUUID(),
        type: "reflection",
        timestamp: ts,
        data: {
          mainLoop: "You seem stuck between wanting clarity and fearing what clarity might reveal.",
          knownVsAssumed: {
            known: ["You know they have not replied."],
            assumed: ["You may be assuming that means rejection."],
          },
          oneQuestion: "What are you hoping this situation will finally give you?",
          tags: ["SAFETY", "VALIDATION", "PEACE"],
        },
      },
    ]);
  };

  // Group messages by timestamp for date separators
  const getDateLabel = (msg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return msg.timestamp.split(" • ")[0];
    const curDay = msg.timestamp.split(" • ")[0];
    const prevDay = prevMsg.timestamp.split(" • ")[0];
    return curDay !== prevDay ? curDay : null;
  };

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <Menu size={20} className="text-on-surface-variant" />
          <h1 className="font-display text-xl text-on-surface font-semibold">Loop</h1>
        </div>
        <div className="w-9 h-9 rounded-full surface-high flex items-center justify-center">
          <span className="text-xs text-on-surface-variant">👤</span>
        </div>
      </header>

      {/* Scrollable message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2">
        <AnimatePresence>
          {isEmpty ? (
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
                  <PromptChip key={chip} label={chip} onClick={() => handleChip(chip)} />
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-3 pb-2">
              {messages.map((msg, i) => {
                const dateLabel = getDateLabel(msg, i > 0 ? messages[i - 1] : null);
                return (
                  <div key={msg.id}>
                    {/* Date separator */}
                    {dateLabel && (
                      <div className="flex items-center justify-center py-4">
                        <span className="px-3 py-1 rounded-full surface-container text-on-surface-variant text-[10px] tracking-[0.15em] uppercase font-semibold">
                          {dateLabel}
                        </span>
                      </div>
                    )}

                    {/* Time label for first message of a pair */}
                    {(msg.type === "voice" || msg.type === "text") && (
                      <p className="text-on-surface-variant text-[10px] tracking-wider uppercase text-right mb-1.5 pr-1">
                        {msg.timestamp.split(" • ")[1]}
                      </p>
                    )}

                    {/* Voice bubble */}
                    {msg.type === "voice" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex justify-end"
                      >
                        <div className="rounded-2xl orb-gradient px-4 py-3 flex items-center gap-3 max-w-[250px]">
                          <Play size={14} className="text-primary-foreground shrink-0" />
                          <Waveform bars={10} active={false} />
                          <span className="text-primary-foreground text-sm font-body shrink-0">
                            {msg.duration}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Text bubble */}
                    {msg.type === "text" && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex justify-end"
                      >
                        <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
                          <p className="text-on-surface text-[15px] leading-relaxed">{msg.content}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Reflection card */}
                    {msg.type === "reflection" && (
                      <div className="mt-2">
                        <ReflectionCard {...msg.data} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar — above bottom nav */}
      <div className="shrink-0 pb-20">
        <ChatInput
          onSend={handleSend}
          onVoice={handleVoice}
          placeholder="Type your thoughts..."
        />
      </div>
    </div>
  );
}
