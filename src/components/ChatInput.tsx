import { Mic, ArrowUp, X, Image } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  onImageSelected?: (imageDataUrl: string) => void;
  onVoice: () => void;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  imageUploading?: boolean;
}

export function ChatInput({ onSend, onImageSelected, onVoice, placeholder = "Type your thoughts...", defaultValue = "", disabled = false, imageUploading = false }: ChatInputProps) {
  const [text, setText] = useState(defaultValue);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  useEffect(() => {
    if (defaultValue) autoResize(textareaRef.current);
  }, [defaultValue, autoResize]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onImageSelected?.(dataUrl);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const hasContent = text.trim();

  return (
    <div className="px-4 pb-2 pt-2">
      <div className="flex items-center gap-3 rounded-2xl surface-high px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || imageUploading}
          className="text-on-surface-variant hover:text-mint transition-colors disabled:opacity-50"
        >
          <Image size={20} />
        </button>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || imageUploading}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-on-surface-variant text-base outline-none font-body resize-none leading-relaxed max-h-[120px] disabled:opacity-50"
        />
        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.button
              key="send"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={handleSend}
              disabled={disabled}
              className="w-9 h-9 rounded-full bg-mint flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <ArrowUp size={18} className="text-primary-foreground" />
            </motion.button>
          ) : (
            <motion.button
              key="mic"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onVoice}
              disabled={disabled || imageUploading}
              className="w-9 h-9 rounded-full orb-gradient flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Mic size={16} className="text-primary-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
