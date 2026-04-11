import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ArrowLeft, MoreVertical, Trash2, ArrowUp } from "lucide-react";
import { CyclingLoader } from "@/components/CyclingLoader";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { ScribblingLogo } from "@/components/LoopLogo";
import { ChatInput } from "@/components/ChatInput";
import { ReflectionCard } from "@/components/ReflectionCard";
import { CrisisCard, type CrisisResources } from "@/components/CrisisCard";
import { SoftResponseCard } from "@/components/SoftResponseCard";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { Waveform } from "@/components/Waveform";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { analytics } from "@/lib/analytics";
import { recalculateAfterEntry } from "@/lib/adaptive-notifications";
import { getCountryCode } from "@/lib/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TextMessage { id: string; type: "text"; content: string }
interface ImageMessage { id: string; type: "image"; imageUrl: string; caption?: string }
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
    tags: string[];
  };
}
interface CrisisMessage {
  id: string;
  type: "crisis";
  message: string;
  resources: CrisisResources;
}
interface SoftMessage {
  id: string;
  type: "soft";
  message: string;
  variant: "hostile" | "meta_or_scope" | "too_thin";
}
type Message =
  | TextMessage
  | ImageMessage
  | VoiceMessage
  | ReflectionMessage
  | CrisisMessage
  | SoftMessage;

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { prefillImage?: string } | null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

  // "image" is a special pseudo-ID for image-based new entries from HomePage
  const isImageNew = id === "image";
  const prefillImage = isImageNew ? locationState?.prefillImage : undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageValidating, setImageValidating] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(!isImageNew);
  const [entryDate, setEntryDate] = useState<string | null>(null);
  const [explorationMessages, setExplorationMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [explorationInput, setExplorationInput] = useState("");
  const [explorationLoading, setExplorationLoading] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(isImageNew ? null : (id || null));

  // Auto-process prefilled image
  useEffect(() => {
    if (prefillImage && isImageNew && !loading && !imageValidating && messages.length === 0) {
      handleImageSelected(prefillImage);
    }
  }, [prefillImage]);

  // Load existing entry
  useEffect(() => {
    if (isImageNew || !id) {
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
  }, [id, isImageNew]);

  useEffect(() => {
    if (!scrollRef.current) return;

    requestAnimationFrame(() => {
      if (!scrollRef.current) return;

      const lastMsg = messages[messages.length - 1];

      if (lastMsg?.type === "reflection") {
        const messageNodes = Array.from(
          scrollRef.current.querySelectorAll<HTMLElement>("[data-message-type]")
        );
        const targetNode =
          messageNodes.length > 1
            ? messageNodes[messageNodes.length - 2]
            : messageNodes[messageNodes.length - 1];

        if (targetNode) {
          targetNode.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }

      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [messages]);

  const handleImageSelected = async (imageDataUrl: string) => {
    setImageValidating(true);

    try {
      const base64 = imageDataUrl.split(",")[1];
      const mimeMatch = imageDataUrl.match(/data:(.*?);/);
      const mime = mimeMatch?.[1] || "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: mime });

      const filePath = `${session?.user?.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(filePath, blob, { contentType: mime });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("chat-images")
        .getPublicUrl(filePath);
      const imageUrl = urlData.publicUrl;

      const { data: validation, error: valError } = await supabase.functions.invoke("validate-image", {
        body: { imageUrl },
      });

      supabase.storage.from("chat-images").remove([filePath]).catch(() => {});

      if (valError) throw valError;

      if (!validation?.valid) {
        toast.error(validation?.reason || "Loop can't work with this image. Try a screenshot of what's looping — a text, a note, a conversation, something with words.");
        setImageValidating(false);
        return;
      }

      const transcribedText = validation.transcription || "[Image content]";
      setImageValidating(false);

      const textMsg: TextMessage = { id: crypto.randomUUID(), type: "text", content: transcribedText };
      setMessages((prev) => [...prev, textMsg]);
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("reflect", {
        body: {
          content: transcribedText,
          entryType: "image",
          countryCode: getCountryCode(),
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

      // Input guard caught a non-journal input — render the appropriate card.
      if (data?.guard) {
        appendGuardMessage(data.guard);
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
            tags: reflection.tags || [],
          },
        },
      ]);

      if (data.entryId) {
        setCurrentEntryId(data.entryId);
        window.history.replaceState(null, "", `/chat/${data.entryId}`);
      }

      setLoading(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to process image");
      setImageValidating(false);
      setLoading(false);
    }
  };

  // Render a guard response (crisis / hostile / meta_or_scope / too_thin)
  // as the appropriate message type. Never written to the entries table —
  // the edge function already declined to store these.
  const appendGuardMessage = (guard: any) => {
    if (!guard || !guard.class) return;
    if (guard.class === "crisis") {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: "crisis",
          message: guard.message || "",
          resources: guard.resources,
        },
      ]);
      analytics.reflectionReceived?.({ responseTimeMs: 0, entryId: null, entryType: "guard_crisis" } as any);
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "soft",
        message: guard.message || "",
        variant: guard.class as SoftMessage["variant"],
      },
    ]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || loading || imageValidating) return;

    const isFollowUp = messages.some((m) => m.type === "reflection");
    analytics.chatMessageSent({ isFollowUp, messageLength: text.length });
    const userMsg: TextMessage = { id: crypto.randomUUID(), type: "text", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reflect", {
        body: {
          content: text,
          entryType: "text",
          countryCode: getCountryCode(),
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

      // Input guard caught a non-journal input — render the appropriate card.
      if (data?.guard) {
        appendGuardMessage(data.guard);
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
            tags: reflection.tags || [],
          },
        },
      ]);

      analytics.reflectionReceived({ responseTimeMs: 0, entryId: currentEntryId || data.entryId, entryType: "text" });
      analytics.entrySaved(currentEntryId || data.entryId);
      recalculateAfterEntry();

      if (isImageNew && data.entryId) {
        setCurrentEntryId(data.entryId);
        window.history.replaceState(null, "", `/chat/${data.entryId}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to process reflection");
    }
    setLoading(false);
  };

  const handleExplore = async (question: string) => {
    if (!question.trim() || explorationLoading) return;
    setExplorationMessages((prev) => [...prev, { role: "user", content: question }]);
    setExplorationInput("");
    setExplorationLoading(true);

    const lastReflection = [...messages].reverse().find((m) => m.type === "reflection");
    const theme = lastReflection?.type === "reflection" ? (lastReflection.data.tags?.[0] || "reflection") : "reflection";

    try {
      const { data, error } = await supabase.functions.invoke("explore-theme", {
        body: { theme: theme.toLowerCase(), question, countryCode: getCountryCode() },
      });
      if (error) throw error;

      // Guard caught the follow-up question — surface the soft response in
      // the inline exploration chat. Crisis is upgraded into the main
      // message stream so the CrisisCard renders with full resources.
      if (data?.guard) {
        if (data.guard.class === "crisis") {
          appendGuardMessage(data.guard);
        } else {
          setExplorationMessages((prev) => [
            ...prev,
            { role: "ai", content: data.guard.message || "" },
          ]);
        }
        setExplorationLoading(false);
        return;
      }

      const answer = data?.answer || data?.connectedBelief || "I couldn't generate a reflection for that.";
      setExplorationMessages((prev) => [...prev, { role: "ai", content: answer }]);
    } catch (e) {
      toast.error("Failed to get answer");
    }
    setExplorationLoading(false);
  };

  const hasReflection = messages.some((m) => m.type === "reflection");

  const handleDelete = async () => {
    const entryId = currentEntryId || id;
    if (!entryId || entryId === "image") return;

    navigate("/");

    toast("Loop deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          navigate(`/chat/${entryId}`);
        },
      },
      duration: 5000,
      onAutoClose: async () => {
        await supabase.from("entries").delete().eq("id", entryId);
      },
      onDismiss: async () => {
        await supabase.from("entries").delete().eq("id", entryId);
      },
    });
  };

  if (loadingEntry) {
    return <FullScreenLoader mode="reflection" />;
  }

  return (
    <div className="flex flex-col h-screen mesh-gradient-bg overflow-hidden relative isolate">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pb-2 sticky top-0 z-30 mesh-gradient-bg" style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
        <button onClick={() => navigate("/")} className="text-on-surface-variant hover:text-mint transition-colors w-8">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1" />
        <div className="w-8 flex justify-end">
          {!isImageNew ? (
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
          ) : null}
        </div>
      </div>

      {entryDate && (
        <div className="shrink-0 flex justify-center pb-2">
          <span className="px-3 py-1 rounded-full surface-container text-on-surface-variant text-[10px] tracking-[0.15em] uppercase font-semibold">
            {entryDate}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 scroll-container px-4" style={{ paddingBottom: hasReflection ? 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 32px)' : 'calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 64px)' }}>
        {messages.length === 0 && isImageNew && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <p className="font-display text-lg text-on-surface-variant italic text-center">
              Reading what's in here...
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} data-message-type={msg.type}>
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
                    {msg.content.split(/\n{2,}|\.\s+(?=[A-Z])/).filter(Boolean).length > 1 ? (
                      <div className="space-y-3">
                        {msg.content.split(/\n{2,}/).filter(Boolean).map((paragraph, i, arr) => {
                          const sentences = paragraph.split(/(?<=\.)\s+(?=[A-Z])/);
                          const chunks: string[][] = [];
                          let current: string[] = [];
                          sentences.forEach((s) => {
                            current.push(s);
                            if (current.join(" ").length > 150) {
                              chunks.push(current);
                              current = [];
                            }
                          });
                          if (current.length) chunks.push(current);

                          return chunks.length > 1 ? (
                            <div key={i} className="space-y-2.5">
                              {chunks.map((chunk, j) => (
                                <p key={j} className="text-on-surface text-[15px] leading-[1.7]">
                                  {chunk.join(" ")}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p key={i} className="text-on-surface text-[15px] leading-[1.7]">
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-on-surface text-[15px] leading-[1.7]">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              )}
              {msg.type === "image" && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-end">
                  <div className="rounded-2xl surface-high p-2 max-w-[85%] space-y-2">
                    <img
                      src={msg.imageUrl}
                      alt="Uploaded"
                      className="rounded-xl max-h-48 w-auto object-cover"
                    />
                    {msg.caption && (
                      <p className="text-on-surface text-[15px] leading-relaxed px-2 pb-1">{msg.caption}</p>
                    )}
                  </div>
                </motion.div>
              )}
              {msg.type === "reflection" && (
                <div className="mt-2" data-reflection><ReflectionCard {...msg.data} /></div>
              )}
              {msg.type === "crisis" && (
                <div className="mt-2" data-guard="crisis">
                  <CrisisCard message={msg.message} resources={msg.resources} />
                </div>
              )}
              {msg.type === "soft" && (
                <div className="mt-2" data-guard={msg.variant}>
                  <SoftResponseCard message={msg.message} variant={msg.variant} />
                </div>
              )}
            </div>
          ))}

          {/* Inline exploration chat after reflection */}
          {hasReflection && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full orb-gradient flex items-center justify-center shrink-0">
                  <span className="text-primary-foreground text-xs">✦</span>
                </div>
                <div>
                  <p className="text-on-surface-variant text-sm">Want to go deeper? Ask a follow-up, or add more context.</p>
                </div>
              </div>

              <div className="rounded-2xl surface-low p-4 space-y-3">
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
                            contentId={`chat-explore-${id}-${i}`}
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

                <div className="flex items-center gap-2 rounded-xl surface-high px-4 py-3 border border-border/20">
                  <input
                    value={explorationInput}
                    onChange={(e) => setExplorationInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleExplore(explorationInput)}
                    placeholder="Ask a follow-up..."
                    className="flex-1 bg-transparent text-on-surface placeholder:text-on-surface-variant text-sm outline-none"
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
                </div>
              </div>
            </motion.div>
          )}

          {imageValidating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4"
            >
              <div className="flex items-center justify-center gap-2">
                <ScribblingLogo size={28} />
                <span className="text-on-surface-variant text-sm italic font-display">
                  Looking at what you shared...
                </span>
              </div>
            </motion.div>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4"
            >
              <CyclingLoader mode="reflection" size={28} layout="inline" />
            </motion.div>
          )}
        </div>
      </div>

      {!hasReflection && !isImageNew && (
        <div
          className="absolute left-0 right-0 z-40 px-0"
          style={{ bottom: 'max(var(--keyboard-height, 0px), calc(var(--bottom-nav-height, calc(72px + env(safe-area-inset-bottom))) + 12px))' }}
        >
          <ChatInput
            onSend={handleSend}
            onImageSelected={handleImageSelected}
            onVoice={() => navigate("/recording")}
            placeholder={messages.length === 0 ? "Type your thoughts..." : "Add more context..."}
            disabled={loading}
            imageUploading={imageValidating}
          />
        </div>
      )}
    </div>
  );
}
