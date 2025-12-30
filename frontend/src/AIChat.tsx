import React, { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  author: "user" | "ai" | "system";
  done?: boolean;
}

type AIChatProps = {
  jobId: string | null;
  processingDone: boolean;
};

export default function AIChat({ jobId, processingDone }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log(`<AIChat> JobId: ${jobId}`);
    console.log(`<AIChat> processingDone: ${processingDone}`);
    if (!jobId || !processingDone) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${jobId}`);

    ws.onopen = () => {
      setIsConnected(true);
      setMessages((prev) => [
        ...prev,
        {
          id: "system-1",
          text: "Połączono z AI! Możesz zapytać o zawartość PDF-a.",
          author: "system",
        },
      ]);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.token) {
        // streamed token
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.author === "ai" && !last.done) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + data.token },
            ];
          }
          return [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              text: data.token,
              author: "ai",
            },
          ];
        });
      } else if (data.done) {
        // end of the message
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.author === "ai") {
            return [...prev.slice(0, -1), { ...last, done: true }];
          }
          return prev;
        });
        setIsLoading(false);
      } else if (data.response || data.full_response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-full-${Date.now()}`,
            text: data.response || data.full_response || "",
            author: "ai",
            done: true,
          },
        ]);
        setIsLoading(false);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            text: `Błąd: ${data.error}`,
            author: "system",
          },
        ]);
        setIsLoading(false);
      }
    };

    ws.onerror = () => {
      setMessages((prev) => [
        ...prev,
        {
          id: "error-connect",
          text: "Błąd połączenia z AI. Spróbuj odświeżyć stronę.",
          author: "system",
        },
      ]);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [jobId, processingDone]);

  function sendMessage() {
    if (!input.trim() || !wsRef.current || !isConnected || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      author: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    wsRef.current.send(JSON.stringify({ query: input }));
    setInput("");
    setIsLoading(true);

    // placeholder message
    setMessages((prev) => [
      ...prev,
      { id: `ai-placeholder-${Date.now()}`, text: "", author: "ai" },
    ]);
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!processingDone || !jobId) {
    return null;
  }

  return (
    <div className="mt-12 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">
        Zapytaj AI o zawartość PDF-a
      </h2>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col h-96">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.author === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg px-5 py-3 rounded-2xl ${
                  msg.author === "user"
                    ? "bg-blue-600 text-white"
                    : msg.author === "system"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-gray-100 text-gray-900"
                } ${msg.author === "ai" && !msg.done ? "animate-pulse" : ""}`}
              >
                {msg.text || (msg.author === "ai" && !msg.done ? "..." : "")}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Zadaj pytanie o PDF..."
            disabled={!isConnected || isLoading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isLoading ? "Wysyłanie..." : "Wyślij"}
          </button>
        </div>

        {!isConnected && (
          <div className="text-center text-sm text-red-600 pb-2">
            Brak połączenia z AI
          </div>
        )}
      </div>
    </div>
  );
}
