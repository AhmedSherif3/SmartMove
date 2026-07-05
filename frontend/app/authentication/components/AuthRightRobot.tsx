"use client";

import TechmateRobot, { type TechmateMode } from "@/components/orb/TechmateRobot";
import { useOrbLogin } from "@/components/orb/OrbLoginContext";

export default function AuthRightRobot() {
  const { orbState, setOrbState, setOrbColor } = useOrbLogin();

  const robotMode: TechmateMode =
    orbState === "email" ||
    orbState === "password" ||
    orbState === "loading" ||
    orbState === "success" ||
    orbState === "error"
      ? orbState
      : "idle";

  const handleClick = () => {
    if (orbState === "loading") {
      return;
    }

    setOrbColor("var(--ui-status-success)");
    setOrbState("success");

    window.setTimeout(() => {
      setOrbColor("var(--ui-brand-primary)");
      setOrbState("idle");
    }, 900);
  };

  return (
    <TechmateRobot
      mode={robotMode}
      size={112}
      onClick={handleClick}
      className="shrink-0"
    />
  );
}
