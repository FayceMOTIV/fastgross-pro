"use client";

import { useRef, useEffect } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatTime } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Aucun message. Commencez la conversation !
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = "";

  messages.forEach((message) => {
    const messageDate = new Date(message.timestamp).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (messageDate !== currentDate) {
      currentDate = messageDate;
      groupedMessages.push({ date: messageDate, messages: [message] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(message);
    }
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date separator */}
          <div className="flex items-center justify-center mb-4">
            <div className="px-3 py-1 rounded-full bg-muted text-xs text-muted-foreground">
              {group.date}
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {group.messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const showAvatar =
                index === 0 ||
                group.messages[index - 1].senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 shrink-0">
                      {showAvatar && (
                        <UserAvatar
                          user={{ name: message.senderName }}
                          size="sm"
                        />
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  <div
                    className={cn(
                      "max-w-[70%] space-y-1",
                      isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {/* Sender name */}
                    {showAvatar && !isOwn && (
                      <p className="text-xs font-medium text-muted-foreground ml-3">
                        {message.senderName}
                      </p>
                    )}

                    {/* Bubble */}
                    <div
                      className={cn(
                        "px-4 py-2 rounded-2xl",
                        isOwn
                          ? "bg-primary-600 text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {message.type === "text" && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}

                      {message.type === "image" && (
                        <img
                          src={message.content}
                          alt="Image partagée"
                          className="rounded-lg max-w-full"
                        />
                      )}

                      {message.type === "location" && (
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span className="text-sm">Position partagée</span>
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    <p
                      className={cn(
                        "text-xs text-muted-foreground",
                        isOwn ? "text-right mr-1" : "ml-3"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
