"use client";

import NexusOrb from "@/components/orb/NexusOrb";
import TechmateRobot from "@/components/orb/TechmateRobot";

interface AuthFusionLoaderProps {
  label?: string;
  className?: string;
}

export default function AuthFusionLoader({
  label = "Loading your smart workspace...",
  className,
}: AuthFusionLoaderProps) {
  return (
    <div
      className={`relative flex w-full flex-col items-center justify-center gap-4 rounded-2xl border p-6 ${className ?? ""}`}
      style={{
        borderColor: "var(--ui-border-subtle)",
        background:
          "linear-gradient(145deg, color-mix(in srgb, var(--ui-surface-card) 84%, transparent), color-mix(in srgb, var(--ui-surface-muted) 74%, transparent))",
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <style>{`
        @keyframes auth-fusion-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }

        .auth-fusion-loader {
          width: 50px;
          aspect-ratio: 1.154;
          clip-path: polygon(50% 0, 100% 100%, 0 100%);
          position: relative;
        }

        .auth-fusion-loader::before {
          content: "";
          position: absolute;
          inset: -150% -100% -50%;
          background: repeating-conic-gradient(
            from 30deg,
            color-mix(in srgb, var(--ui-status-warning) 70%, transparent) 0 60deg,
            color-mix(in srgb, var(--ui-brand-secondary) 72%, transparent) 0 120deg,
            color-mix(in srgb, var(--ui-brand-primary) 84%, transparent) 0 180deg
          );
          animation: auth-fusion-loader-turn 2s infinite;
        }

        @keyframes auth-fusion-loader-turn {
          0% { transform: rotate(0); }
          23%, 33% { transform: rotate(60deg); }
          56%, 66% { transform: rotate(120deg); }
          90%, 100% { transform: rotate(180deg); }
        }

        .auth-fusion-hint {
          color: var(--ui-content-secondary);
          animation: auth-fusion-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex items-center justify-center gap-2">
        <div className="-me-2">
          <TechmateRobot
            mode="waiting-orb"
            size={116}
            forceAmazed
            trackMouse={false}
            className="translate-y-1"
          />
        </div>

        <NexusOrb
          state="spectra"
          accentColor="var(--ui-brand-primary)"
          size={180}
          nodeCount={30}
          connectionDist={0.72}
        />
      </div>

      <div className="auth-fusion-loader" aria-hidden="true" />

      <p className="auth-fusion-hint text-sm font-medium">{label}</p>
    </div>
  );
}
