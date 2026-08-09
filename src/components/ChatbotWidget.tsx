import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { shouldRenderAppFooter } from "@/components/layout/routeChrome";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SUPPORT_EMAIL = "johnemmanuel.lim@deped.gov.ph";
const GREETING_MESSAGE =
  "Hi! I'm the WeeLMat assistant. How can I help you today?";
const FALLBACK_MESSAGE =
  "I'm sorry, I wasn't able to resolve that. For direct support, please email **" +
  SUPPORT_EMAIL +
  "** — the main developer of WeeLMat.";
const EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/chatbot`;

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Simple markdown-like rendering for bold (**text**) and line breaks
// ---------------------------------------------------------------------------
function RenderContent({ text }: { text: string }) {
  // Split by ** for bold, handle line breaks
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Handle newlines
        return part.split("\n").map((line, j) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < part.split("\n").length - 1 && <br />}
          </span>
        ));
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ChatbotWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(() => {
    try {
      return sessionStorage.getItem("weelmat-chat-opened") === "true";
    } catch {
      return false;
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hide on splash page
  const isVisible = shouldRenderAppFooter(location.pathname);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const markOpened = useCallback(() => {
    if (!hasBeenOpened) {
      setHasBeenOpened(true);
      try {
        sessionStorage.setItem("weelmat-chat-opened", "true");
      } catch {
        // Ignore storage errors
      }
    }
  }, [hasBeenOpened]);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) markOpened();
      return next;
    });
  }, [markOpened]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    abortControllerRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    abortControllerRef.current = new AbortController();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Please sign in to use the chat assistant.",
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.slice(1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMsg = "Something went wrong. Please try again.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // Use default error message
        }
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: errorMsg,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // The edge function appends [DONE] to signal end-of-stream, but it
        // may arrive in the same chunk as content — strip it before appending.
        if (chunk.includes("[DONE]")) {
          const cleaned = chunk.replace(/\[DONE\]/g, "");
          if (cleaned) fullContent += cleaned;
          break;
        }

        fullContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: fullContent,
          };
          return updated;
        });
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // User cancelled — keep partial content
        return;
      }
      console.error("Chatbot error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: FALLBACK_MESSAGE,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  if (!isVisible) return null;

  return (
    <>
      {/* ---- Floating Action Button ---- */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
        className={cn(
          "fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          isOpen
            ? "bg-foreground text-background"
            : "bg-primary text-primary-foreground animate-[pulse_3s_ease-in-out_infinite]",
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}

        {/* Notification badge — shown only on first visit */}
        {!isOpen && !hasBeenOpened ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            1
          </span>
        ) : null}
      </button>

      {/* ---- Chat Window ---- */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-[60] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 origin-bottom-right",
          "w-[360px] h-[480px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-8rem)]",
          isOpen
            ? "scale-100 opacity-100"
            : "scale-95 pointer-events-none opacity-0 translate-y-2",
        )}
        role="dialog"
        aria-label="WeeLMat Chat Assistant"
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-forest px-4 py-3 text-paper">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-paper/20">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold leading-tight">
              WeeLMat Assistant
            </p>
            <p className="text-xs leading-tight text-paper/70">
              AI-powered support
            </p>
          </div>
          <button
            type="button"
            onClick={closeChat}
            aria-label="Close chat"
            className="rounded-full p-1 transition-colors hover:bg-paper/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                  : "mr-auto bg-muted text-foreground rounded-bl-md",
              )}
            >
              {msg.role === "assistant" && msg.content === "" && isStreaming ? (
                <TypingIndicator />
              ) : (
                <RenderContent text={msg.content} />
              )}
            </div>
          ))}

          {/* Streaming indicator for the last message */}
          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].content !== "" && (
              <div className="mr-auto">
                <TypingIndicator />
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border bg-card px-3 py-2.5">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message…"
              disabled={isStreaming}
              className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                input.trim() && !isStreaming
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
