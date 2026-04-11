import { Mic, Send, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  onImageSelected?: (imageDataUrl: string) => void;
  onVoice: () => void;
  placeholder?: string;
  defaultValue?: string;
  /** Controlled value – when provided, component is fully controlled. */
  value?: string;
  /** Called on every keystroke when controlled. */
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  imageUploading?: boolean;
}

export function ChatInput({ onSend, onImageSelected, onVoice, placeholder = "I can't stop worrying about tomorrow...", defaultValue = "", value, onValueChange, disabled = false, imageUploading = false }: ChatInputProps) {
  const isControlled = value !== undefined;
  const [internalText, setInternalText] = useState(defaultValue);
  const text = isControlled ? value : internalText;
  const setText = isControlled ? (v: string) => onValueChange?.(v) : setInternalText;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isControlled) setInternalText(defaultValue);
  }, [defaultValue]);

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText("");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;

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
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text input — pill with + button inside */}
        <div className="flex-1 flex items-center rounded-full surface-high border border-border/20 px-2 py-2 min-h-[48px] gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || imageUploading}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Plus size={18} className="text-on-surface-variant" />
          </button>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={disabled || imageUploading}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-foreground placeholder:text-on-surface-variant text-sm outline-none font-body disabled:opacity-50"
          />
        </div>

        {/* Right circle — Mic or Send */}
        <button
          onClick={hasContent ? handleSend : onVoice}
          disabled={disabled || imageUploading}
          className="w-12 h-12 rounded-full surface-high border border-border/20 flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          <AnimatePresence mode="wait">
            {hasContent ? (
              <motion.div
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Send size={18} className="text-on-surface-variant" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Mic size={20} className="text-on-surface-variant" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
