import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle, Send, Download, FileText, BarChart3, TrendingUp, TrendingDown, PieChart as PieChartIcon, Table as TableIcon, History } from "lucide-react";
import { getApiBaseUrl } from "@/lib/urls/apiBase";
import { getPusherClient } from "@/lib/pusher";
import { engineApi, getAgentSessions, getAgentSessionDetail } from "@/lib/engineApi";
import TechmateRobot, { TechmateMode } from "@/components/orb/TechmateRobot";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line, PieChart, Pie, AreaChart, Area, Legend } from "recharts";

type StepStatus = "running" | "done" | "failed";

type Step = {
  id: string;
  text: string;
  status: StepStatus;
  isFinal?: boolean;
};

interface ChartDataPoint {
  name: string;
  value: number;
}

interface Panel {
  component: string;
  title?: string;
  value?: string;
  change?: string;
  content?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data?: ChartDataPoint[];
  headers?: string[];
  rows?: string[][];
  description?: string;
}

interface DashboardData {
  title?: string;
  panels?: Panel[];
}

interface HistorySession {
  id: string;
  title: string;
  created_at: string;
  expires_in_days: number;
}

// Generate a random session UUID
const generateSessionId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for non-secure contexts or older browsers
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
    (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
  );
};

export default function AgenticPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [robotMode, setRobotMode] = useState<TechmateMode>("idle");
  const [sessionId, setSessionId] = useState(generateSessionId());

  // Result payloads
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pdfFileKey, setPdfFileKey] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [historyList, setHistoryList] = useState<HistorySession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const stepsContainerRef = useRef<HTMLDivElement | null>(null);

  // Mount tracking
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setIsMounted(true);
    });
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    getAgentSessions().then(setHistoryList).catch(console.error);
  }, []);

  const loadHistorySession = async (id: string) => {
    setIsLoadingHistory(true);
    try {
      const data = await getAgentSessionDetail(id);
      if (data.ui_contract) {
        setDashboardData(data.ui_contract.ui_payload || data.ui_contract);
        setPdfFileKey(`temp_report_${id}.pdf`);
        setSessionId(id);
        setSteps([{ id: 'history', text: "Loaded from history.", status: "done", isFinal: true }]);
        setShowHistory(false);
      } else {
        alert("No dashboard data found for this session.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load history session.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Auto-scroll steps
  useEffect(() => {
    if (stepsContainerRef.current) {
      stepsContainerRef.current.scrollTop = stepsContainerRef.current.scrollHeight;
    }
  }, [steps]);

  // Connect WebSocket on mount
  useEffect(() => {
    const pusher = getPusherClient();
    const channelName = `private-agentic-${sessionId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log("Agentic Pusher connected.");
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("agentic-message", (data: any) => {
      console.log("Pusher Message:", data);

      if (data.type === "system_status" || data.type === "agent_status") {
        setSteps((prev) => {
          // Mark previous steps as done
          const updated = prev.map(s => s.status === "running" ? { ...s, status: "done" as StepStatus } : s);
          return [...updated, { id: Date.now().toString(), text: data.message, status: "running" }];
        });
      } else if (data.type === "user_message") {
        setSteps((prev) => [...prev, { id: Date.now().toString(), text: `You: ${data.message}`, status: "done", isFinal: true }]);
      } else if (data.type === "hybrid_dashboard") {
        setDashboardData(data.ui_payload);
        setSteps((prev) => {
          const updated = prev.map(s => s.status === "running" ? { ...s, status: "done" as StepStatus } : s);
          return [...updated, { id: Date.now().toString(), text: "Interactive hybrid dashboard generated.", status: "done", isFinal: true }];
        });
        setIsRunning(false);
        setRobotMode("success");
        setTimeout(() => setRobotMode("idle"), 2500); // Return to idle after a few seconds
      } else if (data.type === "pdf_ready") {
        setPdfFileKey(data.file_key);
        setSteps((prev) => {
          const updated = prev.map(s => s.status === "running" ? { ...s, status: "done" as StepStatus } : s);
          return [...updated, { id: Date.now().toString(), text: data.message || "PDF report prepared.", status: "done", isFinal: true }];
        });
      } else if (data.type === "download_link_ready") {
        if (typeof window !== "undefined") {
          const a = document.createElement("a");
          a.href = data.url;
          a.download = "SmartMove_Agent_Report.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else if (data.type === "upgrade_required") {
        if (typeof window !== "undefined") {
          window.alert(data.message || "Please upgrade your plan to access this feature.");
        }
        setSteps((prev) => {
          const updated = prev.map(s => s.status === "running" ? { ...s, status: "failed" as StepStatus } : s);
          return [...updated, { id: Date.now().toString(), text: `Upgrade Required: ${data.message}`, status: "failed", isFinal: true }];
        });
        setIsRunning(false);
        setRobotMode("error");
        setTimeout(() => setRobotMode("idle"), 3000);
      } else if (data.type === "error") {
        setSteps((prev) => {
          const updated = prev.map(s => s.status === "running" ? { ...s, status: "failed" as StepStatus } : s);
          return [...updated, { id: Date.now().toString(), text: `Error: ${data.message}`, status: "failed", isFinal: true }];
        });
        setIsRunning(false);
        setRobotMode("error");
        setTimeout(() => setRobotMode("idle"), 3000);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("pusher:subscription_error", (error: any) => {
      console.error("Pusher Error:", error);
      setRobotMode("error");
      setTimeout(() => setRobotMode("idle"), 3000);
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [sessionId]);

  const runAgent = () => {
    engineApi.post(`/agentic/run/`, {
      action: "chat",
      prompt: prompt.trim(),
      session_id: sessionId
    }).catch(console.error);

    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runAgent();
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-5xl mx-auto w-full pt-4 pb-12 relative">

      {/* History Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-card border border-border-subtle text-content-primary hover:bg-surface-muted transition-colors"
        >
          <History size={18} />
          View Run History
        </button>
      </div>

      {/* Premium History Drawer (Slide-out) */}
      {showHistory && (
        <>
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-40 transition-opacity animate-in fade-in-0 duration-300"
          />
          
          {/* Slide-out Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-surface-card border-l border-border-subtle shadow-2xl z-50 overflow-hidden flex flex-col h-full animate-in slide-in-from-right duration-300 ease-out">
            {/* Header */}
            <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-content-strong text-lg">
                    Past Runs History
                  </h3>
                  <p className="text-xs text-content-muted">Reload previous analytics</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(false)} 
                className="p-1.5 rounded-full hover:bg-surface-muted text-content-muted hover:text-content-strong transition-colors"
              >
                <XCircle size={22} />
              </button>
            </div>
            
            {/* Disclaimer */}
            <div className="px-5 py-3.5 bg-status-warning/10 border-b border-status-warning/20 text-xs text-status-warning font-semibold flex gap-2 items-center">
              <span>⚠️</span>
              <span>PDF reports are automatically deleted from the cloud after 7 days to save space.</span>
            </div>
            
            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-surface-muted/5">
              {historyList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-4 rounded-full bg-surface-muted text-content-muted">
                    <History size={32} />
                  </div>
                  <p className="text-sm font-semibold text-content-secondary">No previous runs found</p>
                  <p className="text-xs text-content-muted max-w-[200px]">Run the AI Swarm to start saving sessions in your history.</p>
                </div>
              ) : (
                historyList.map(session => {
                  const isCurrent = sessionId === session.id;
                  return (
                    <button
                      key={session.id}
                      onClick={() => loadHistorySession(session.id)}
                      disabled={isLoadingHistory}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                        isCurrent 
                          ? 'bg-brand-primary/10 border-brand-primary shadow-sm ring-1 ring-brand-primary/30' 
                          : 'bg-surface-card border-border-subtle hover:bg-surface-muted hover:border-brand-primary/20 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full gap-2">
                        <p className="text-sm font-bold text-content-strong line-clamp-2 leading-snug">
                          {session.title || "Untitled Swarm Analysis"}
                        </p>
                        {isCurrent && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                          </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-subtle/50 w-full">
                        <span className="text-xs font-semibold text-content-muted">
                          {new Date(session.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className={`text-[10px] font-extrabold tracking-wide uppercase px-2.5 py-0.5 rounded-full ${
                          session.expires_in_days > 0 
                            ? 'bg-status-success/15 text-status-success' 
                            : 'bg-status-error/15 text-status-error'
                        }`}>
                          {session.expires_in_days > 0 ? `${session.expires_in_days}d left` : 'Expired'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      {/* Header and Mascot Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-3xl border border-border-subtle bg-surface-card shadow-lg bg-opacity-70 backdrop-blur-md">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-logo font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent">
            SmartMove AI Agent
          </h1>
          <p className="text-lg text-content-secondary max-w-xl">
            Describe your analytical task, and our advanced autonomous Swarm Intelligence will process it securely in real-time.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-sm font-semibold">
            <CheckCircle2 size={16} />
            <span>Connected to Swarm API</span>
          </div>
        </div>

        <div className="flex items-center justify-center relative w-48 h-48 md:w-64 md:h-64 shrink-0 bg-surface-muted/30 rounded-full border border-border-subtle/50 shadow-inner">
           <TechmateRobot
              mode={robotMode}
              size={200}
              trackMouse={true}
              className="absolute drop-shadow-xl"
            />
        </div>
      </div>

      {/* Main Interaction Area */}
      <div className="flex flex-col md:flex-row gap-6 h-[500px]">
        {/* Input Section */}
        <section className="flex-1 flex flex-col rounded-3xl border border-border-subtle bg-surface-card p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary opacity-50"></div>
          
          <h2 className="text-lg font-bold text-content-strong mb-4 flex items-center gap-2">
            Task Definition
          </h2>
          
          <textarea
            className="flex-1 w-full resize-none rounded-2xl border-2 border-border-subtle bg-surface-page p-5 text-base text-content-primary focus:outline-none focus:border-brand-primary/60 transition-colors placeholder:text-content-muted shadow-inner custom-scrollbar"
            placeholder="e.g. Generate a price trend report for Cairo properties in Q1 2024 and build a hybrid dashboard..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
          />
          
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-content-muted max-w-xs leading-relaxed">
              Press <kbd className="px-1.5 py-0.5 rounded bg-surface-muted border border-border-subtle text-content-secondary font-mono">Enter</kbd> to execute. The agent can query data, generate charts, and output PDF reports.
            </p>
            <button
              type="button"
              onClick={runAgent}
              disabled={isRunning || !prompt.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent px-8 py-3 text-sm font-bold text-content-on-brand shadow-lg hover:shadow-brand-primary/25 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isRunning ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Run Agent
                </>
              )}
            </button>
          </div>
        </section>

        {/* Live Stream Logs Section */}
        <section className="flex-1 w-full md:w-96 flex flex-col rounded-3xl border border-border-subtle bg-surface-page p-6 shadow-inner relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-status-success via-brand-accent to-status-success opacity-50"></div>
          
          <h2 className="text-lg font-bold text-content-strong mb-4 flex items-center justify-between">
            <span>Swarm Activity Stream</span>
            {isRunning && <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span> Live</span>}
          </h2>

          <div 
            ref={stepsContainerRef}
            className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3"
          >
            {steps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-content-muted opacity-60">
                <div className="w-16 h-16 mb-4 rounded-full border-2 border-dashed border-content-muted flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-medium">Awaiting instructions...</p>
              </div>
            ) : (
              steps.map((step) => {
                const isRunningStatus = step.status === "running";
                const isFailed = step.status === "failed";
                const isDone = step.status === "done";
                
                const statusColor = isFailed ? "text-status-error" : isDone ? "text-status-success" : "text-brand-primary";
                const bgBorderColor = isFailed ? "border-status-error/30 bg-status-error/5" : isRunningStatus ? "border-brand-primary/30 bg-brand-primary/5" : "border-border-subtle bg-surface-card";

                return (
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 rounded-2xl border ${bgBorderColor} p-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <div className={`mt-0.5 shrink-0 ${statusColor}`}>
                       {isRunningStatus ? (
                         <Loader2 size={18} className="animate-spin" />
                       ) : isFailed ? (
                         <XCircle size={18} />
                       ) : (
                         <CheckCircle2 size={18} />
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${step.isFinal ? "text-content-secondary font-medium" : "text-content-strong font-semibold"}`}
                      >
                        {step.text}
                      </p>
                      {isRunningStatus && <p className="text-xs text-content-muted mt-1 animate-pulse">Processing...</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Dashboard Section */}
      {dashboardData && (
        <div className="rounded-3xl border border-border-subtle bg-surface-card p-6 md:p-8 shadow-xl space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
            <div>
              <h2 className="text-2xl font-bold text-content-strong">
                {dashboardData.title || "Swarm Analytics Output"}
              </h2>
              <p className="text-sm text-content-secondary mt-1">
                Generated in real-time by Supervisor, Data Engineer, Analyst, and Curator.
              </p>
            </div>

          </div>

          {/* Panels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stat Cards Row - spanning full width */}
            {(dashboardData?.panels?.filter((p: Panel) => p.component === "StatCard").length ?? 0) > 0 && (
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData?.panels
                  ?.filter((p: Panel) => p.component === "StatCard")
                  ?.map((panel: Panel, idx: number) => (
                    <div key={idx} className="rounded-2xl border border-border-subtle bg-surface-page p-5 shadow-sm space-y-2">
                      <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">{panel.title}</p>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-2xl font-extrabold text-content-strong">{panel.value}</span>
                        {panel.change && (
                          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${panel.change.startsWith('-') ? 'text-status-error bg-status-error/10' : 'text-status-success bg-status-success/10'}`}>
                            {panel.change.startsWith('-') ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                            {panel.change}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Charts and TextBlocks */}
            {dashboardData?.panels?.map((panel: Panel, idx: number) => {
              if (panel.component === "BarChart") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <BarChart3 size={18} className="text-brand-primary" />
                      {panel.title}
                    </h3>
                    {panel.description && (
                      <p className="text-sm text-content-secondary leading-relaxed">{panel.description}</p>
                    )}
                    <div className="h-64 w-full">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={panel.data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.xAxisLabel ? { value: panel.xAxisLabel, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.yAxisLabel ? { value: panel.yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                            />
                            <Bar dataKey="value" fill="#6c5ce7" radius={[4, 4, 0, 0]}>
                              {panel.data?.map((entry: ChartDataPoint, index: number) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#6c5ce7" : "#a29bfe"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-muted/20 rounded-xl">
                          <Loader2 className="animate-spin text-brand-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (panel.component === "LineChart") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <TrendingUp size={18} className="text-brand-accent" />
                      {panel.title}
                    </h3>
                    {panel.description && (
                      <p className="text-sm text-content-secondary leading-relaxed">{panel.description}</p>
                    )}
                    <div className="h-64 w-full">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={panel.data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.xAxisLabel ? { value: panel.xAxisLabel, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.yAxisLabel ? { value: panel.yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#00cec9" strokeWidth={3} dot={{ fill: '#00cec9', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-muted/20 rounded-xl">
                          <Loader2 className="animate-spin text-brand-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (panel.component === "PieChart") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <PieChartIcon size={18} className="text-brand-accent" />
                      {panel.title}
                    </h3>
                    {panel.description && (
                      <p className="text-sm text-content-secondary leading-relaxed">{panel.description}</p>
                    )}
                    <div className="h-64 w-full">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                            <Pie data={panel.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                              {panel.data?.map((entry: ChartDataPoint, index: number) => (
                                <Cell key={`cell-${index}`} fill={['#6c5ce7', '#00cec9', '#fdcb6e', '#e84393', '#00b894'][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-muted/20 rounded-xl">
                          <Loader2 className="animate-spin text-brand-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (panel.component === "AreaChart") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <TrendingUp size={18} className="text-brand-primary" />
                      {panel.title}
                    </h3>
                    {panel.description && (
                      <p className="text-sm text-content-secondary leading-relaxed">{panel.description}</p>
                    )}
                    <div className="h-64 w-full">
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={panel.data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                            <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.xAxisLabel ? { value: panel.xAxisLabel, position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} label={panel.yAxisLabel ? { value: panel.yAxisLabel, angle: -90, position: 'insideLeft', offset: 10, fill: 'rgba(255,255,255,0.6)', fontSize: 12 } : undefined} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold" }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#6c5ce7" fillOpacity={1} fill="url(#colorValue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-surface-muted/20 rounded-xl">
                          <Loader2 className="animate-spin text-brand-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              } else if (panel.component === "DataTable") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <TableIcon size={18} className="text-brand-accent" />
                      {panel.title}
                    </h3>
                    <div className="w-full overflow-x-auto rounded-xl border border-border-subtle">
                      <table className="w-full text-left text-sm text-content-secondary">
                        <thead className="bg-surface-muted text-xs uppercase text-content-muted">
                          <tr>
                            {panel.headers?.map((header, hIdx) => (
                              <th key={hIdx} className="px-6 py-3 font-bold">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {panel.rows?.map((row, rIdx) => (
                            <tr key={rIdx} className="border-t border-border-subtle hover:bg-surface-muted/50 transition-colors">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-6 py-4">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              } else if (panel.component === "TextBlock") {
                return (
                  <div key={idx} className="col-span-1 md:col-span-2 rounded-2xl border border-border-subtle bg-surface-page p-6 shadow-sm space-y-3">
                    <h3 className="text-base font-bold text-content-strong flex items-center gap-2">
                      <FileText size={18} className="text-brand-accent" />
                      {panel.title}
                    </h3>
                    <p className="text-sm text-content-secondary leading-relaxed whitespace-pre-wrap">
                      {panel.content}
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
