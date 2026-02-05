"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Smile, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string, type?: "text" | "image" | "location") => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, placeholder = "Écrire un message...", disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage, "text");
      setMessage("");
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          onSend(`${latitude},${longitude}`, "location");
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
        }
      );
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        {/* Attachment buttons */}
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label="Joindre un fichier"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleShareLocation}
            disabled={disabled}
            aria-label="Partager ma position"
          >
            <MapPin className="h-5 w-5" />
          </Button>
        </div>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-2xl border border-border bg-muted px-4 py-2.5 pr-10",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-[120px]"
            )}
            aria-label="Message"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-2 bottom-1.5"
            disabled={disabled}
            aria-label="Ajouter un emoji"
          >
            <Smile className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="shrink-0"
          aria-label="Envoyer"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Character count for long messages */}
      {message.length > 500 && (
        <p className={cn(
          "text-xs mt-2 text-right",
          message.length > 1000 ? "text-danger-500" : "text-muted-foreground"
        )}>
          {message.length} / 1000 caractères
        </p>
      )}
    </div>
  );
}
