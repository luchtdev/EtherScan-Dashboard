"use client";

import { useState, useEffect, useRef } from "react";

const SERVERS = [
  { id: "gdns", label: "Global DNS", addr: "8.8.8.8" },
  { id: "cf", label: "Cloudflare Edge", addr: "1.1.1.1" },
  { id: "local", label: "TR-NW-01 Local Node", addr: "192.168.1.1" },
];

const _rnd = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);
const _randPing = () => Math.floor(Math.random() * (45 - 12 + 1)) + 12;
const _sparkPath = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

const _genSparkPoints = (count, h) =>
  Array.from({ length: count }, (_, i) => ({
    x: (i / (count - 1)) * 100,
    y: h - _rnd(4, h - 4),
  }));

export default function NetworkMonitor() {
  const [activeStats, setActiveStats] = useState({
    dl: 0, ul: 0, dlPeak: 0, ulPeak: 0,
    pings: { gdns: 0, cf: 0, local: 0 },
    jitter: { gdns: 0, cf: 0, local: 0 },
    packetLoss: 0,
    uptime: 0,
  });

  const [dlHistory, setDlHistory] = useState(() => _genSparkPoints(24, 32));
  const [ulHistory, setUlHistory] = useState(() => _genSparkPoints(24, 32));
  const [tick, setTick] = useState(0);
  const [logLines, setLogLines] = useState([]);
  const startRef = useRef(Date.now());
  const pingRef = useRef({ gdns: 18, cf: 14, local: 22 });

  const _pushLog = (msg) => {
    const ts = new Date().toISOString().slice(11, 23);
    setLogLines((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 8));
  };

  useEffect(() => {
    _pushLog("Interface eth0 UP — link/ether detected");
    _pushLog("DNS resolver bound to 8.8.8.8");
    _pushLog("Ping monitor initialised — 3 targets");

    const _initPingTest = setInterval(() => {
      const newPings = {
        gdns: _randPing(),
        cf: _randPing(),
        local: _randPing(),
      };
      const newJitter = {
        gdns: Math.abs(newPings.gdns - pingRef.current.gdns),
        cf: Math.abs(newPings.cf - pingRef.current.cf),
        local: Math.abs(newPings.local - pingRef.current.local),
      };
      pingRef.current = newPings;

      const dl = _rnd(45, 920);
      const ul = _rnd(12, 480);

      setActiveStats((prev) => ({
        dl,
        ul,
        dlPeak: Math.max(prev.dlPeak, dl),
        ulPeak: Math.max(prev.ulPeak, ul),
        pings: newPings,
        jitter: newJitter,
        packetLoss: Math.random() < 0.05 ? _rnd(0.1, 2.4) : 0,
        uptime: Math.floor((Date.now() - startRef.current) / 1000),
      }));

      setDlHistory((prev) => {
        const next = [...prev.slice(1), { x: 100, y: 32 - _rnd(4, 28) }];
        return next.map((p, i) => ({ ...p, x: (i / (next.length - 1)) * 100 }));
      });

      setUlHistory((prev) => {
        const next = [...prev.slice(1), { x: 100, y: 32 - _rnd(4, 20) }];
        return next.map((p, i) => ({ ...p, x: (i / (next.length - 1)) * 100 }));
      });

      setTick((t) => t + 1);

      if (Math.random() < 0.2) {
        const msgs = [
          `ICMP reply from ${newPings.gdns}ms — TTL 118`,
          `Route recalculated via gateway 192.168.1.254`,
          `TLS handshake completed in ${_rnd(40, 120).toFixed(0)}ms`,
          `Buffer flush — tx queue cleared`,
          `ARP cache refreshed`,
          `Cloudflare edge latency spike detected`,
          `MTU negotiation: 1500 bytes confirmed`,
        ];
        _pushLog(msgs[Math.floor(Math.random() * msgs.length)]);
      }
    }, 2000);

    return () => clearInterval(_initPingTest);
  }, []);

  const _fmtUptime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const _pingColor = (ms) => {
    if (ms < 20) return "#4ade80";
    if (ms < 35) return "#facc15";
    return "#f87171";
  };

  const _pingStatus = (ms) => ms < 20 ? "OPTIMAL" : ms < 35 ? "NOMINAL" : "DEGRADED";

  return (
    <div
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}
      className="min-h-screen bg-zinc-950 text-zinc-300 p-4 md:p-6 selection:bg-green-500/20"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        .neon-text { color: #4ade80; text-shadow: 0 0 12px #4ade8066, 0 0 24px #4ade8033; }
        .neon-border { border-color: #4ade8033; box-shadow: inset 0 0 20px #4ade8008, 0 0 0 1px #4ade8022; }
        .card { background: linear-gradient(135deg, #09090b 0%, #111113 100%); border: 1px solid #27272a; border-radius: 4px; }
        .card-accent { background: linear-gradient(135deg, #0a0f0a 0%, #0d150d 100%); border: 1px solid #4ade8022; border-radius: 4px; }
        .scanline { background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(74,222,128,0.015) 2px, rgba(74,222,128,0.015) 4px); pointer-events: none; }
        .blink { animation: blink 1.2s step-end infinite; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
        @keyframes pulse-dot { 0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); } 50% { box-shadow: 0 0 0 6px rgba(74,222,128,0); } }
        .data-slide { animation: data-slide 0.15s ease-out; }
        @keyframes data-slide { from { opacity: 0.4; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
        .grid-bg { background-image: linear-gradient(rgba(74,222,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.04) 1px, transparent 1px); background-size: 32px 32px; }
        .label { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #52525b; font-weight: 600; }
        .stat-big { font-size: clamp(28px, 5vw, 48px); font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
        .ping-row:hover { background: rgba(74,222,128,0.03); }
      `}</style>

      <div className="scanline fixed inset-0 pointer-events-none z-10 opacity-60" />

      <div className="max-w-5xl mx-auto space-y-4 relative z-0">

        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 pulse-dot" />
            </div>
            <div>
              <p className="label mb-0.5">Anthropic NetOps — Dashboard v2.4</p>
              <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
                Real-Time Network <span className="neon-text">& Ping Monitor</span>
              </h1>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="label">Session Uptime</p>
            <p className="font-mono text-sm text-green-400 font-semibold">{_fmtUptime(activeStats.uptime)}</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="card-accent neon-border p-4 lg:col-span-1">
            <p className="label mb-3">System Identity</p>
            <div className="space-y-2.5">
              <div>
                <p className="label mb-0.5" style={{ fontSize: "8px" }}>Active Node</p>
                <p className="text-sm font-semibold text-zinc-100 tracking-wide">Core-System-01</p>
              </div>
              <div className="border-t border-zinc-800 pt-2.5 grid grid-cols-2 gap-2">
                {[
                  { k: "Interface", v: "eth0" },
                  { k: "Protocol", v: "IPv4/6" },
                  { k: "Gateway", v: "192.168.1.1" },
                  { k: "MTU", v: "1500 B" },
                  { k: "OS", v: "Arch Linux" },
                  { k: "Kernel", v: "6.8.2-arch1" },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <p className="label mb-0" style={{ fontSize: "8px" }}>{k}</p>
                    <p className="text-xs text-zinc-300 font-mono">{v}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 pt-2.5">
                <p className="label mb-1" style={{ fontSize: "8px" }}>MAC Address</p>
                <p className="text-xs text-green-400/70 font-mono">3c:97:0e:a2:4f:1b</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">

            {[
              { key: "dl", label: "Download", icon: "↓", val: activeStats.dl, peak: activeStats.dlPeak, history: dlHistory, color: "#4ade80" },
              { key: "ul", label: "Upload", icon: "↑", val: activeStats.ul, peak: activeStats.ulPeak, history: ulHistory, color: "#86efac" },
            ].map(({ key, label, icon, val, peak, history, color }) => (
              <div key={key} className="card p-4 grid-bg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="label mb-1">{icon} {label}</p>
                    <div key={tick} className="data-slide">
                      <span className="stat-big" style={{ color }}>{val.toFixed(1)}</span>
                      <span className="text-xs text-zinc-500 ml-1.5 font-mono">Mbps</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="label mb-1">Peak</p>
                    <p className="text-xs font-mono" style={{ color: color + "aa" }}>{peak.toFixed(1)}</p>
                  </div>
                </div>
                <svg viewBox="0 0 100 32" className="w-full h-8" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${_sparkPath(history)} L100,32 L0,32 Z`}
                    fill={`url(#grad-${key})`}
                  />
                  <path
                    d={_sparkPath(history)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
                  />
                </svg>
              </div>
            ))}

            <div className="card p-4 sm:col-span-2 flex gap-4">
              {[
                { label: "Packet Loss", val: activeStats.packetLoss === 0 ? "0.00%" : `${activeStats.packetLoss.toFixed(2)}%`, ok: activeStats.packetLoss === 0 },
                { label: "Avg Jitter", val: `${Math.round((activeStats.jitter.gdns + activeStats.jitter.cf + activeStats.jitter.local) / 3)}ms`, ok: true },
                { label: "Link State", val: "FULL-DUPLEX", ok: true },
                { label: "Negotiated", val: "1 Gbps", ok: true },
              ].map(({ label, val, ok }) => (
                <div key={label} className="flex-1 min-w-0">
                  <p className="label mb-1">{label}</p>
                  <p className={`text-xs font-mono font-semibold truncate ${ok ? "text-green-400" : "text-yellow-400"}`}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="label">Ping Latency Monitor</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 blink" />
              <p className="label" style={{ fontSize: "8px" }}>Live — 2s interval</p>
            </div>
          </div>

          <div className="space-y-1">
            {SERVERS.map(({ id, label, addr }) => {
              const ms = activeStats.pings[id] || 0;
              const pct = ((ms - 12) / (45 - 12)) * 100;
              const col = _pingColor(ms);
              const status = _pingStatus(ms);
              return (
                <div key={id} className="ping-row rounded px-3 py-2.5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-48 flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}` }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{label}</p>
                        <p className="text-zinc-600 font-mono" style={{ fontSize: "9px" }}>{addr}</p>
                      </div>
                    </div>

                    <div className="flex-1 relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        key={tick}
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: col, boxShadow: `0 0 8px ${col}88` }}
                      />
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div key={tick} className="data-slide text-right w-16">
                        <span className="text-lg font-bold font-mono" style={{ color: col }}>{ms}</span>
                        <span className="text-zinc-500 text-xs ml-0.5">ms</span>
                      </div>
                      <div className="w-16 hidden sm:block">
                        <p className="text-right" style={{ fontSize: "9px", color: col, letterSpacing: "0.1em", fontWeight: 600 }}>{status}</p>
                        <p className="label text-right" style={{ fontSize: "8px" }}>jitter ±{activeStats.jitter[id] || 0}ms</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-2">
            {SERVERS.map(({ id, label }) => {
              const ms = activeStats.pings[id] || 0;
              return (
                <div key={id} className="text-center">
                  <p className="label mb-0.5" style={{ fontSize: "8px" }}>Avg — {label.split(" ")[0]}</p>
                  <p className="font-mono text-xs font-semibold" style={{ color: _pingColor(ms) }}>{ms}ms</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-2 mb-2">
            <p className="label">Kernel Event Log</p>
            <div className="h-px flex-1 bg-zinc-800" />
            <p className="label blink" style={{ fontSize: "8px", color: "#4ade80" }}>LIVE</p>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-hidden">
            {logLines.map((line, i) => (
              <p
                key={i}
                className="font-mono text-zinc-500 transition-all"
                style={{ fontSize: "10px", opacity: 1 - i * 0.1, color: i === 0 ? "#71717a" : undefined }}
              >
                <span style={{ color: "#3f3f46" }}>{line.slice(0, 15)}</span>
                <span>{line.slice(15)}</span>
              </p>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-between pt-1 pb-2">
          <p className="label" style={{ fontSize: "8px" }}>
            <span className="neon-text">●</span> ALL SYSTEMS NOMINAL
          </p>
          <p className="label" style={{ fontSize: "8px" }}>
            TICK #{tick} &nbsp;·&nbsp; {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
          </p>
        </footer>

      </div>
    </div>
  );
}