import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Loader2, ArrowLeft, MoreVertical, Trash2 } from "lucide-react";
import { ChatInput } from "@/components/ChatInput";
import { ReflectionCard } from "@/components/ReflectionCard";
import { Waveform } from "@/components/Waveform";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TextMessage { id: string; type: "text"; content: string }
interface VoiceMessage { id: string; type: "voice"; duration: string }
interface ReflectionMessage {
  id: string;
  type: "reflection";
  data: {
    mainLoop: string;
    feelings?: string[];
    knownVsAssumed: { known: string[]; assumed: string[] };
    repeatingPattern?: string | null;
    oneQuestion: string;
    nextStep?: string;
    tags: string[];
  };
}
type Message = TextMessage | VoiceMessage | ReflectionMessage;

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const isNew = id === "new";
  const initialText = (location.state as any)?.initialText as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(!isNew);
  const [entryDate, setEntryDate] = useState<string | null>(null);

  // Load existing entry
  useEffect(() => {
    if (isNew || !id) {
      setLoadingEntry(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("entries")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        const msgs: Message[] = [
          { id: "t-" + data.id, type: "text", content: data.content },
        ];
        if (data.reflection) {
          msgs.push({
            id: "r-" + data.id,
            type: "reflection",
            data: data.reflection as any,
          });
        }
        setMessages(msgs);
        setEntryDate(
          new Date(data.created_at).toLocaleDateString("en-US", {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
          })
        );
      }
      setLoadingEntry(false);
    })();
  }, [id, isNew]);

  // Process initial text from home page
  useEffect(() => {
    if (initialText && isNew) {
      handleSend(initialText);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg: TextMessage = { id: crypto.randomUUID(), type: "text", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reflect", {
        body: {
          content: text,
          entryType: "text",
          previousMessages: messages
            .filter((m) => m.type === "text")
            .map((m) => ({ role: "user", content: (m as TextMessage).content })),
        },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      const reflection = data.reflection;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "reflection",
          data: {
            mainLoop: reflection.mainLoop || "",
            feelings: reflection.feelings || [],
            knownVsAssumed: reflection.knownVsAssumed || { known: [], assumed: [] },
            repeatingPattern: reflection.repeatingPattern,
            oneQuestion: reflection.oneQuestion || "",
            nextStep: reflection.nextStep,
            tags: reflection.tags || [],
          },
        },
      ]);

      // If new chat, update URL
      if (isNew && data.entryId) {
        window.history.replaceState(null, "", `/chat/${data.entryId}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to process reflection");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    const currentId = window.location.pathname.split("/chat/")[1];
    if (!currentId || currentId === "new") return;
    const { error } = await supabase.from("entries").delete().eq("id", currentId);
    if (error) {
      toast.error("Failed to delete loop");
      return;
    }
    toast.success("Loop deleted");
    navigate("/");
  };

  if (loadingEntry) {
    return (
      <div className="flex flex-col h-screen mesh-gradient-bg items-center justify-center">
        <Loader2 className="animate-spin text-mint" size={24} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => navigate("/")} className="text-on-surface-variant hover:text-mint transition-colors">
          <ArrowLeft size={22} />
        </button>
        {!isNew && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
                <MoreVertical size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="surface-high border-border/30">
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive gap-2">
                <Trash2 size={14} />
                Delete loop
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {entryDate && (
        <div className="flex justify-center pb-2">
          <span className="px-3 py-1 rounded-full surface-container text-on-surface-variant text-[10px] tracking-[0.15em] uppercase font-semibold">
            {entryDate}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-24">
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
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 py-4"
            >
              <Loader2 className="animate-spin text-mint" size={18} />
              <span className="text-on-surface-variant text-sm italic font-display">Reflecting...</span>
            </motion.div>
          )}
        </div>
      </div>

      {isNew && (
        <div className="shrink-0 pb-20">
          <ChatInput onSend={handleSend} onVoice={() => navigate("/recording")} placeholder="Type your thoughts..." />
        </div>
      )}
    </div>
  );
}
