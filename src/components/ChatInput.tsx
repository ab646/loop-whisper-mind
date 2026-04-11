import { Mic, Send, Image } from "lucide-react";
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
        {/* Mic button — left circle */}
        <button
          onClick={onVoice}
          disabled={disabled || imageUploading}
          className="w-12 h-12 rounded-full surface-high border border-border/20 flex items-center justify-center shrink-0 disabled:opacity-50"
        >
          <Mic size={20} className="text-on-surface-variant" />
        </button>

        {/* Text input — pill */}
        <div className="flex-1 flex items-center rounded-full surface-high border border-border/20 px-4 py-3 min-h-[48px]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
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

        {/* Send button — right circle */}
        <button
          onClick={hasContent ? handleSend : () => fileInputRef.current?.click()}
          disabled={hasContent ? disabled : (disabled || imageUploading)}
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
                key="image"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.12 }}
              >
                <Image size={18} className="text-on-surface-variant" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
}
