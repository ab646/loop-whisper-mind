import { Mic, Paperclip, ArrowUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  onVoice: () => void;
  placeholder?: string;
}

export function ChatInput({ onSend, onVoice, placeholder = "Type your thoughts..." }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <div className="px-4 pb-2 pt-2">
      <div className="flex items-center gap-3 rounded-2xl surface-high px-4 py-3">
        <button className="text-on-surface-variant hover:text-mint transition-colors">
          <Paperclip size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-foreground placeholder:text-on-surface-variant text-base outline-none font-body"
        />
        <button
          onClick={text.trim() ? handleSend : onVoice}
          className="w-9 h-9 rounded-full orb-gradient flex items-center justify-center"
        >
          <Mic size={16} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}
