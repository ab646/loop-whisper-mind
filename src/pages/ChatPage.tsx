import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ChatInput } from "@/components/ChatInput";
import { ReflectionCard } from "@/components/ReflectionCard";
import { Waveform } from "@/components/Waveform";

interface VoiceMessage { id: string; type: "voice"; duration: string; }
interface TextMessage { id: string; type: "text"; content: string; }
interface ReflectionMessage {
  id: string;
  type: "reflection";
  data: { mainLoop: string; knownVsAssumed: { known: string[]; assumed: string[] }; oneQuestion: string; tags: string[] };
}
type Message = VoiceMessage | TextMessage | ReflectionMessage;

const entryData: Record<string, { date: string; messages: Message[] }> = {
  "3": {
    date: "Today • 10:42 AM",
    messages: [
      { id: "v1", type: "voice", duration: "0:42" },
      { id: "r1", type: "reflection", data: { mainLoop: "You seem stuck between wanting clarity and fearing what clarity might reveal.", knownVsAssumed: { known: ["You know they have not replied."], assumed: ["You may be assuming that means rejection."] }, oneQuestion: "What are you hoping this situation will finally give you?", tags: ["SAFETY", "VALIDATION", "PEACE"] } },
    ],
  },
  "2": {
    date: "Yesterday • 11:30 PM",
    messages: [
      { id: "t1", type: "text", content: "I keep checking my phone. It's been 6 hours and nothing. I know I shouldn't read into it but my brain won't stop." },
      { id: "r2", type: "reflection", data: { mainLoop: "The waiting has become the loop itself. You're not just waiting for a reply — you're waiting for permission to stop worrying.", knownVsAssumed: { known: ["They haven't replied in 6 hours."], assumed: ["You may be assuming silence means something is wrong between you."] }, oneQuestion: "What would you be doing right now if the reply had already come?", tags: ["AMBIGUITY", "CONTROL"] } },
    ],
  },
  "1": {
    date: "Monday • 9:15 AM",
    messages: [
      { id: "v2", type: "voice", duration: "1:12" },
      { id: "r3", type: "reflection", data: { mainLoop: "You're replaying a conversation looking for proof you said something wrong, but the evidence keeps shifting.", knownVsAssumed: { known: ["They said 'let's talk later.'"], assumed: ["You may be reading that as a permanent withdrawal."] }, oneQuestion: "What would you need to hear to feel safe right now?", tags: ["REASSURANCE", "REJECTION"] } },
    ],
  },
  "0": {
    date: "Last Friday • 3:20 PM",
    messages: [
      { id: "t2", type: "text", content: "Should I send a follow-up message or just let it go? I've been going back and forth for an hour." },
      { id: "r4", type: "reflection", data: { mainLoop: "You're looking for the 'right' action to eliminate discomfort, but the discomfort isn't about the message — it's about the uncertainty.", knownVsAssumed: { known: ["You haven't heard back yet."], assumed: ["You may be assuming sending a follow-up will either fix or ruin things."] }, oneQuestion: "What if neither option is wrong?", tags: ["DECISION PARALYSIS"] } },
    ],
  },
};

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNew = id === "new";
  const entry = id && id !== "new" ? entryData[id] : null;

  const [messages, setMessages] = useState<Message[]>(entry?.messages ?? []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "text", content: text },
      {
        id: crypto.randomUUID(),
        type: "reflection",
        data: {
          mainLoop: "You seem to be circling around a need for certainty in a situation that can't provide it yet.",
          knownVsAssumed: { known: ["You expressed what you're feeling."], assumed: ["You may be assuming the worst outcome is the most likely one."] },
          oneQuestion: "If this resolved exactly how you wanted — what would actually change?",
          tags: ["UNCERTAINTY", "HOPE"],
        },
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-on-surface-variant">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display text-lg text-on-surface font-semibold">
          {isNew ? "New Loop" : entry?.date?.split(" • ")[0] ?? "Loop"}
        </h1>
        <div className="w-9" />
      </header>

      {/* Date */}
      {entry && (
        <div className="flex justify-center pb-2">
          <span className="px-3 py-1 rounded-full surface-container text-on-surface-variant text-[10px] tracking-[0.15em] uppercase font-semibold">
            {entry.date}
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 && isNew && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <p className="font-display text-lg text-on-surface-variant italic text-center">
              What's on your mind?
            </p>
            <p className="text-on-surface-variant text-sm text-center">
              Type or record a voice note to start.
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === "voice" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                  <div className="rounded-2xl orb-gradient px-4 py-3 flex items-center gap-3 max-w-[250px]">
                    <Play size={14} className="text-primary-foreground shrink-0" />
                    <Waveform bars={10} active={false} />
                    <span className="text-primary-foreground text-sm font-body shrink-0">{msg.duration}</span>
                  </div>
                </motion.div>
              )}
              {msg.type === "text" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                  <div className="rounded-2xl surface-high px-4 py-3 max-w-[85%]">
                    <p className="text-on-surface text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </motion.div>
              )}
              {msg.type === "reflection" && (
                <div className="mt-2"><ReflectionCard {...msg.data} /></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 pb-20">
        <ChatInput onSend={handleSend} onVoice={() => navigate("/recording")} placeholder="Type your thoughts..." />
      </div>
    </div>
  );
}
