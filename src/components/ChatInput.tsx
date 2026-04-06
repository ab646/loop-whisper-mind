import { Mic, Paperclip, ArrowUp, X, Image } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";

interface ChatInputProps {
  onSend: (text: string, imageUrl?: string) => void;
  onVoice: () => void;
  placeholder?: string;
  defaultValue?: string;
}

export function ChatInput({ onSend, onVoice, placeholder = "Type your thoughts...", defaultValue = "" }: ChatInputProps) {
  const [text, setText] = useState(defaultValue);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (text.trim() || imageFile) {
      onSend(text.trim(), imagePreview || undefined);
      setText("");
      setImagePreview(null);
      setImageFile(null);
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

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
  };

  const hasContent = text.trim() || imageFile;

  return (
    <div className="px-4 pb-2 pt-2">
      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 px-1"
          >
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="rounded-xl max-h-32 max-w-[200px] object-cover border border-border/20"
              />
              <button
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 rounded-2xl surface-high px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-on-surface-variant hover:text-mint transition-colors"
        >
          <Image size={20} />
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={imageFile ? "Describe what you want from this image..." : placeholder}
          rows={1}
          className="flex-1 bg-transparent text-foreground placeholder:text-on-surface-variant text-base outline-none font-body resize-none leading-relaxed max-h-[120px]"
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
              className="w-9 h-9 rounded-full bg-mint flex items-center justify-center shrink-0"
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
              className="w-9 h-9 rounded-full orb-gradient flex items-center justify-center shrink-0"
            >
              <Mic size={16} className="text-primary-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
