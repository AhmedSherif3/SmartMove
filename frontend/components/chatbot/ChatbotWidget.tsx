"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { getPusherClient } from "@/lib/pusher";
import { engineApi } from "@/lib/engineApi";
import { getAuthSession } from "@/lib/auth/session";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChartConfig {
  type: string;
  title?: string;
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
  timestamp: Date;
}

type PanelState = "closed" | "opening" | "open" | "closing";
type RobotMode = "idle" | "loading" | "success" | "error";
interface WsPayload {
  type: string;
  data?: {
    session_id?: string;
    quota_remaining?: number;
    text?: string;
    message?: string;
    charts?: ChartConfig[];
    follow_up_chips?: string[];
  };
}

// ─── Backend config ─────────────────────────────────────────────────────────
const CHAT_API_PATH = "/chatbot/message/";

// ─── MessageContent ─────────────────────────────────────────────────────────

function MessageContent({ text }: { text: string }) {
  return (
    <span>
      {text.split("\n").map((line, i, arr) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <span key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
            {i < arr.length - 1 && <br />}
          </span>
        );
      })}
    </span>
  );
}

// ─── Inline Chart Component ──────────────────────────────────────────────────

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

function ChatChart({ chart }: { chart: ChartConfig }) {
  if (!chart || !chart.data || chart.data.length === 0) return null;

  const { type, title, data, xKey, yKey } = chart;
  const isLine = type === "line";

  return (
    <div style={{ marginTop: "16px", marginBottom: "8px", background: "var(--ui-surface-card)", padding: "12px", borderRadius: "12px", border: "1px solid var(--ui-border-subtle)" }}>
      {title && (
        <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", color: "var(--ui-content-strong)", textAlign: "center" }}>
          {title}
        </h4>
      )}
      <div style={{ width: "100%", height: "200px" }}>
        <ResponsiveContainer width="100%" height="100%">
          {isLine ? (
            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-subtle)" vertical={false} />
              <XAxis dataKey={xKey} stroke="var(--ui-content-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--ui-content-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--ui-surface-card)", border: "1px solid var(--ui-border-subtle)", borderRadius: "8px", fontSize: "12px", color: "var(--ui-content-primary)" }}
                itemStyle={{ color: "var(--ui-brand-primary)" }}
              />
              <Line type="monotone" dataKey={yKey} stroke="var(--ui-brand-primary)" strokeWidth={3} dot={{ r: 3, fill: "var(--ui-brand-primary)" }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ui-border-subtle)" vertical={false} />
              <XAxis dataKey={xKey} stroke="var(--ui-content-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--ui-content-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--ui-surface-card)", border: "1px solid var(--ui-border-subtle)", borderRadius: "8px", fontSize: "12px", color: "var(--ui-content-primary)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                cursor={{ fill: "var(--ui-surface-muted)", opacity: 0.5 }}
              />
              <Bar dataKey={yKey} fill="var(--ui-brand-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Inline Head SVG with eye tracking + mode animations ────────────────────

function RobotHead({ mode }: { mode: RobotMode }) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Eye tracking
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const leftEye = svg.getElementById("hl-left-eye") as SVGEllipseElement | null;
    const rightEye = svg.getElementById("hl-right-eye") as SVGEllipseElement | null;
    if (!leftEye || !rightEye) return;

    const handleMove = (e: MouseEvent) => {
      if (mode === "loading") return;

      const rect = svg.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const dist = Math.min(6, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 30);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;

      leftEye.setAttribute("cx", String(155 + dx));
      leftEye.setAttribute("cy", String(100 + dy));
      rightEye.setAttribute("cx", String(245 + dx));
      rightEye.setAttribute("cy", String(100 + dy));
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mode]);

  // Blinking
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const leftEye = svg.getElementById("hl-left-eye") as SVGEllipseElement | null;
    const rightEye = svg.getElementById("hl-right-eye") as SVGEllipseElement | null;
    if (!leftEye || !rightEye) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const blink = () => {
      if (!alive || mode === "loading") {
        if (alive) timer = setTimeout(blink, 3000 + Math.random() * 2000);
        return;
      }
      leftEye.style.transition = "ry 0.08s";
      rightEye.style.transition = "ry 0.08s";
      leftEye.setAttribute("ry", "1");
      rightEye.setAttribute("ry", "1");
      setTimeout(() => {
        if (!alive) return;
        leftEye.setAttribute("ry", "16");
        rightEye.setAttribute("ry", "16");
        timer = setTimeout(blink, 3000 + Math.random() * 2000);
      }, 120);
    };

    timer = setTimeout(blink, 1500 + Math.random() * 1000);
    return () => { alive = false; clearTimeout(timer); };
  }, [mode]);

  // Eye color & glow based on mode
  const eyeColor =
    mode === "success" ? "#22c55e"
      : mode === "error" ? "#ef4444"
        : "#00e5ff";

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 210"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="hl-white-body" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d6dfea" />
          <stop offset="100%" stopColor="#7a8799" />
        </radialGradient>
        <radialGradient id="hl-blue-accent" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#8bc6ff" />
          <stop offset="45%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#15337a" />
        </radialGradient>
        <linearGradient id="hl-screen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#151d2e" />
          <stop offset="100%" stopColor="#02040a" />
        </linearGradient>

        <filter id="hl-shadow" x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <filter id="hl-inner-shadow">
          <feOffset dx="0" dy="5" />
          <feGaussianBlur stdDeviation="5" result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="#000000" floodOpacity="0.85" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
        <filter id="hl-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ear antennae */}
      <path d="M 120 75 C 80 65, 70 105, 80 125 C 90 135, 110 125, 120 105 Z"
        fill="url(#hl-blue-accent)" filter="url(#hl-shadow)" />
      <path d="M 280 75 C 320 65, 330 105, 320 125 C 310 135, 290 125, 280 105 Z"
        fill="url(#hl-blue-accent)" filter="url(#hl-shadow)" />

      {/* Head shell + screen */}
      <g filter="url(#hl-shadow)">
        <rect x="90" y="35" width="220" height="140" rx="55"
          fill="url(#hl-white-body)" />
        <rect x="110" y="55" width="180" height="100" rx="35"
          fill="url(#hl-screen-grad)" filter="url(#hl-inner-shadow)" />

        {/* Eyes */}
        <ellipse
          id="hl-left-eye"
          cx="155" cy="100" rx="16" ry="16"
          fill={eyeColor}
          filter="url(#hl-glow)"
          style={{
            transition: "cx 0.08s ease-out, cy 0.08s ease-out, fill 0.4s",
            animation: mode === "loading"
              ? "hl-blink 0.7s ease-in-out infinite"
              : mode === "success"
                ? "hl-pulse 0.9s ease-in-out infinite"
                : "none",
          }}
        />
        <ellipse
          id="hl-right-eye"
          cx="245" cy="100" rx="16" ry="16"
          fill={eyeColor}
          filter="url(#hl-glow)"
          style={{
            transition: "cx 0.08s ease-out, cy 0.08s ease-out, fill 0.4s",
            animation: mode === "loading"
              ? "hl-blink 0.7s 0.15s ease-in-out infinite"
              : mode === "success"
                ? "hl-pulse 0.9s 0.1s ease-in-out infinite"
                : "none",
          }}
        />

        {/* Decorative corner glyphs */}
        <path d="M 130 80 L 130 120 L 140 120"
          stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
        <path d="M 270 130 L 270 90 L 260 90"
          stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
      </g>
    </svg>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export default function ChatbotWidget({ userRole = "user" }: { userRole?: string }) {
  const [panelState, setPanelState] = useState<PanelState>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [robotMode, setRobotMode] = useState<RobotMode>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [unread, setUnread] = useState(1);
  const [hasEverOpened, setHasEverOpened] = useState(false);

  // Model selection state removed per user request
  const [wsStatus, setWsStatus] = useState<"idle" | "connecting" | "open" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pusherRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (panelState === "open") setTimeout(() => inputRef.current?.focus(), 50);
  }, [panelState]);

  const appendMessage = useCallback((role: Message["role"], content: string, charts?: ChartConfig[]) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        charts,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (panelState !== "open") {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
        channelRef.current = null;
      }
      setTimeout(() => {
        setWsStatus("idle");
        setConnectionError(null);
      }, 0);
      return;
    }

    const pusher = getPusherClient();
    pusherRef.current = pusher;
    
    setTimeout(() => {
      setWsStatus("connecting");
      setConnectionError(null);
    }, 0);

    const session = getAuthSession();
    const userId = session?.userId ? String(session.userId) : "";
    
    const channelName = `private-chat-${userId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    channel.bind("pusher:subscription_succeeded", () => {
      setWsStatus("open");
      setConnectionError(null);
    });

    channel.bind("pusher:subscription_error", () => {
      setWsStatus("error");
      setConnectionError("Authentication required. Please log in again.");
      setRobotMode("error");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("chat-response", (data: any) => {
      if (data.type === "ai_response") {
        appendMessage("assistant", data.content ?? "", data.charts);
        setRobotMode("success");
        setTimeout(() => setRobotMode("idle"), 1800);
        setIsLoading(false);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("chat-error", (data: any) => {
      appendMessage("assistant", data.error ?? "Request failed. Please try again.");
      setRobotMode("error");
      setIsLoading(false);
    });

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [appendMessage, panelState]);

  const toggleChat = useCallback(() => {
    if (panelState === "closed") {
      setHasEverOpened(true);
      setUnread(0);
      setPanelState("opening");
      setTimeout(() => setPanelState("open"), 350);
    } else {
      setPanelState("closing");
      setTimeout(() => setPanelState("closed"), 300);
    }
  }, [panelState]);

  const sendMessage = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      const pusher = pusherRef.current;
      if (!pusher) {
        appendMessage("assistant", "Chat connection not ready. Please try again.");
        setRobotMode("error");
        return;
      }

      appendMessage("user", content);
      setInput("");
      setIsLoading(true);
      setRobotMode("loading");

      engineApi.post(CHAT_API_PATH, {
        message: content,
        session_id: "default-session", 
        model: "gemini",
      }).catch(err => {
        appendMessage("assistant", "Failed to send message. Please try again.");
        setRobotMode("error");
        setIsLoading(false);
      });
    },
    [appendMessage, input, isLoading]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };



  const statusColor =
    robotMode === "error" ? "var(--ui-status-error)"
      : "var(--ui-status-success)";

  const isPrivileged = userRole === "admin" || userRole === "analyst";
  const emptyStateText = connectionError
    ? connectionError
    : wsStatus === "connecting"
      ? "Connecting to SmartMove AI..."
      : "Start a conversation with SmartMove AI.";

  return (
    <>
      <style>{`
        @keyframes tm-slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tm-slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(24px) scale(0.94); }
        }
        @keyframes tm-dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
        @keyframes tm-badgePulse {
          0%, 100% { box-shadow: 0 0 0 0   rgba(59,130,246,0.5); }
          50%       { box-shadow: 0 0 0 7px rgba(59,130,246,0); }
        }
        @keyframes tm-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes hl-blink {
          0%, 100% { opacity: 0.9; }
          50%       { opacity: 0.25; }
        }
        @keyframes hl-pulse {
          0%, 100% { opacity: 0.95; }
          50%       { opacity: 0.5; }
        }
        @keyframes hl-error-shake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-3px); }
          75%       { transform: translateX(3px); }
        }
        .tm-messages-scroll::-webkit-scrollbar       { width: 4px; }
        .tm-messages-scroll::-webkit-scrollbar-track  { background: transparent; }
        .tm-messages-scroll::-webkit-scrollbar-thumb  {
          background: var(--ui-border-subtle);
          border-radius: 4px;
        }
        .tm-input:focus { outline: none; }
        .tm-send-btn { transition: all 0.18s ease; }
        .tm-send-btn:hover:not(:disabled) {
          background: var(--ui-brand-primary) !important;
          color: var(--ui-content-on-brand) !important;
          border-color: var(--ui-brand-primary) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(59,130,246,0.35) !important;
        }
        .tm-send-btn:active:not(:disabled) { transform: translateY(0); }
        .tm-suggestion { transition: all 0.18s ease; }
        .tm-suggestion:hover {
          background: var(--ui-brand-primary) !important;
          color: var(--ui-content-on-brand) !important;
          border-color: var(--ui-brand-primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 14px rgba(59,130,246,0.3) !important;
        }
        .tm-msg-user { animation: tm-slideUp 0.22s ease both; }
        .tm-msg-bot  { animation: tm-slideUp 0.22s 0.04s ease both; }
        .tm-clear-btn:hover {
          background: var(--ui-surface-card) !important;
          color: var(--ui-status-error) !important;
        }
        .tm-close-btn:hover {
          background: var(--ui-surface-card) !important;
          color: var(--ui-content-strong) !important;
        }
        .tm-launcher-head {
          animation: tm-float 3.5s ease-in-out infinite;
        }
        .tm-launcher-head-error {
          animation: hl-error-shake 0.35s ease-in-out 3;
        }
      `}</style>


      {/* ── Chat Panel ───────────────────────────────────────────────────── */}
      {panelState !== "closed" && (
        <div
          style={{
            position: "fixed",
            bottom: "132px",
            right: "24px",
            width: "min(400px, calc(100vw - 48px))",
            maxHeight: "560px",
            display: "flex",
            flexDirection: "column",
            background: "var(--ui-surface-card)",
            border: "1px solid var(--ui-border-subtle)",
            borderRadius: "20px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(59,130,246,0.08)",
            zIndex: 1000,
            overflow: "hidden",
            animation:
              panelState === "closing"
                ? "tm-slideDown 0.28s ease forwards"
                : "tm-slideUp 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--ui-border-subtle)",
              background: "var(--ui-surface-muted)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              position: "relative",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 60%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
              <div
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: statusColor,
                  boxShadow: `0 0 8px ${statusColor}`,
                  flexShrink: 0,
                  transition: "background 0.4s, box-shadow 0.4s",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--ui-content-strong)", fontSize: "14px", fontFamily: "var(--ui-font-base)", letterSpacing: "-0.2px" }}>
                  SmartMove AI
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              </div>
              {messages.length > 0 && (
                <button
                  className="tm-clear-btn"
                  onClick={() => setMessages([])}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ui-content-muted)", fontSize: "11px", fontFamily: "var(--ui-font-base)", padding: "4px 8px", borderRadius: "6px", transition: "color 0.2s, background 0.2s" }}
                >
                  Clear
                </button>
              )}
              <button
                className="tm-close-btn"
                onClick={toggleChat}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ui-content-muted)", width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", transition: "color 0.2s, background 0.2s", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>


          </div>

          {/* Messages */}
          <div
            className="tm-messages-scroll"
            style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "13px", color: "var(--ui-content-muted)", textAlign: "center", fontFamily: "var(--ui-font-base)", lineHeight: 1.5 }}>
                  {emptyStateText}
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={msg.role === "user" ? "tm-msg-user" : "tm-msg-bot"}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "var(--ui-brand-primary)" : "var(--ui-surface-muted)",
                    color: msg.role === "user" ? "var(--ui-content-on-brand)" : "var(--ui-content-primary)",
                    fontSize: "13.5px",
                    lineHeight: "1.55",
                    fontFamily: "var(--ui-font-base)",
                    boxShadow: msg.role === "user" ? "0 2px 12px rgba(59,130,246,0.25)" : "none",
                  }}
                >
                  <MessageContent text={msg.content} />
                  {msg.charts && msg.charts.map((chart, idx) => (
                    <ChatChart key={idx} chart={chart} />
                  ))}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="tm-msg-bot" style={{ display: "flex" }}>
                <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "var(--ui-surface-muted)", display: "flex", gap: "5px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ui-brand-primary)", display: "inline-block", animation: `tm-dotBounce 1.1s ${i * 0.18}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--ui-border-subtle)", display: "flex", flexDirection: "column", gap: "8px", background: "var(--ui-surface-card)", flexShrink: 0 }}>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                ref={inputRef}
                className="tm-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message SmartMove AI..."
                disabled={isLoading}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ui-brand-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--ui-border-subtle)"; }}
                style={{ flex: 1, padding: "10px 14px", borderRadius: "12px", border: "1.5px solid var(--ui-border-subtle)", background: "var(--ui-surface-muted)", color: "var(--ui-content-primary)", fontSize: "13.5px", fontFamily: "var(--ui-font-base)", transition: "border-color 0.2s" }}
              />

              {/* Mic Button */}
              <button
                type="button"
                className="tm-suggestion"
                onClick={() => alert("Voice input coming soon!")}
                style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  border: "1.5px solid var(--ui-border-subtle)",
                  background: "var(--ui-surface-muted)", color: "var(--ui-content-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: "16px", flexShrink: 0
                }}
                title="Voice Message"
              >
                🎤
              </button>

              {/* Send Button */}
              <button
                className="tm-send-btn"
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  border: "none",
                  background: input.trim() && !isLoading ? "var(--ui-brand-primary)" : "var(--ui-surface-muted)",
                  color: input.trim() && !isLoading ? "var(--ui-content-on-brand)" : "var(--ui-content-muted)",
                  cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                  fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: input.trim() && !isLoading ? "0 2px 10px rgba(59,130,246,0.2)" : "none",
                }}
                title="Send Message"
              >
                ↑
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── Floating Launcher ────────────────────────────────────────────── */}
      <div
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 1001, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        {/* Tooltip — only before first open */}
        {panelState === "closed" && !hasEverOpened && (
          <div
            style={{ marginBottom: "8px", padding: "6px 12px", borderRadius: "20px", background: "var(--ui-surface-card)", border: "1px solid var(--ui-border-subtle)", fontSize: "12px", fontFamily: "var(--ui-font-base)", color: "var(--ui-content-secondary)", whiteSpace: "nowrap", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", animation: "tm-slideUp 0.4s 0.6s ease both", pointerEvents: "none" }}
          >
            💬 Ask SmartMove AI
          </div>
        )}

        {/* Unread badge */}
        {unread > 0 && panelState === "closed" && (
          <div
            style={{ position: "absolute", top: "0px", right: "0px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--ui-brand-primary)", border: "2.5px solid var(--ui-surface-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#fff", zIndex: 2, animation: "tm-badgePulse 2s ease-in-out infinite", fontFamily: "var(--ui-font-base)" }}
          >
            {unread}
          </div>
        )}

        {/* Circle launcher with head-only SVG */}
        <button
          type="button"
          onClick={toggleChat}
          aria-label="Toggle SmartMove AI"
          style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "50%",
              background: "var(--ui-surface-card)",
              border: "2px solid var(--ui-brand-primary)",
              boxShadow: "0 8px 28px rgba(59,130,246,0.2), 0 16px 30px rgba(15,23,42,0.15)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* The head SVG is 400×210 viewBox.
                We render it at 160px wide → scale = 0.4
                Head rect spans y=35–175 → rendered height span = 56px
                Shift up so head is vertically centred in the 88px circle */}
            <div
              className={robotMode === "error" ? "tm-launcher-head-error" : "tm-launcher-head"}
              style={{ width: "88px" }}
            >
              <RobotHead mode={robotMode} />
            </div>
          </div>
        </button>
      </div>
    </>
  );
}