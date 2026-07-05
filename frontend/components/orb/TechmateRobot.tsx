"use client";

import { useEffect, useRef, useState } from "react";

export type TechmateMode =
  | "idle"
  | "email"
  | "password"
  | "loading"
  | "success"
  | "error"
  | "waiting-orb";

interface TechmateRobotProps {
  mode: TechmateMode;
  className?: string;
  onClick?: () => void;
  size?: number;
  forceAmazed?: boolean;
  trackMouse?: boolean;
}

export default function TechmateRobot({
  mode,
  className,
  onClick,
  size = 150,
  forceAmazed = false,
  trackMouse = true,
}: TechmateRobotProps) {
  const robotRef = useRef<SVGSVGElement | null>(null);
  const [isExcited, setIsExcited] = useState(false);
  const [isAmazed, setIsAmazed] = useState(false);

  // Eye tracking
  useEffect(() => {
    if (!trackMouse) {
      return;
    }

    const robot = robotRef.current;
    if (!robot) return;

    const leftEye = robot.getElementById("left-eye") as SVGEllipseElement;
    const rightEye = robot.getElementById("right-eye") as SVGEllipseElement;
    if (!leftEye || !rightEye) return;

    const handleMouseMove = (e: MouseEvent) => {
      // In these modes, eye behavior is controlled by CSS animation/state.
      if (mode === "password" || mode === "loading" || mode === "waiting-orb") return;

      const rect = robot.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const distance = Math.min(
        8,
        Math.hypot(e.clientX - centerX, e.clientY - centerY) / 30
      );

      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Original eye centers: Left(155, 100), Right(245, 100)
      leftEye.setAttribute("cx", String(155 + x));
      leftEye.setAttribute("cy", String(100 + y));
      rightEye.setAttribute("cx", String(245 + x));
      rightEye.setAttribute("cy", String(100 + y));
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mode, trackMouse]);

  // Blinking
  useEffect(() => {
    const robot = robotRef.current;
    if (!robot) return;

    const leftEye = robot.getElementById("left-eye") as SVGEllipseElement;
    const rightEye = robot.getElementById("right-eye") as SVGEllipseElement;
    if (!leftEye || !rightEye) return;

    let blinkTimeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const performBlink = () => {
      if (!isMounted || mode === "password") {
        if (isMounted) blinkTimeout = setTimeout(performBlink, 3000 + Math.random() * 3000);
        return;
      }

      leftEye.style.transition = "rx 0.1s, ry 0.1s";
      rightEye.style.transition = "rx 0.1s, ry 0.1s";

      const originalRy = 16;
      leftEye.setAttribute("ry", "1");
      rightEye.setAttribute("ry", "1");

      setTimeout(() => {
        if (!isMounted) return;
        leftEye.setAttribute("ry", String(originalRy));
        rightEye.setAttribute("ry", String(originalRy));
        
        blinkTimeout = setTimeout(performBlink, 3000 + Math.random() * 3000);
      }, 150);
    };

    blinkTimeout = setTimeout(performBlink, 2000);

    return () => {
      isMounted = false;
      clearTimeout(blinkTimeout);
    };
  }, [mode]);

  // Amazed reaction on theme toggle
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsAmazed(true);
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => setIsAmazed(false), 1500);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleClick = () => {
    setIsExcited(true);
    window.setTimeout(() => setIsExcited(false), 1000);
    onClick?.();
  };

  return (
    <div
      className={`techmate-wrapper relative flex items-center justify-center select-none ${className || ""} ${mode} ${isExcited ? "excited" : ""} ${isAmazed || forceAmazed ? "amazed" : ""}`}
      onClick={handleClick}
    >
      <style>
        {`
          @keyframes floatRobot {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          
          @keyframes excitedBounce {
            0%, 100% { transform: scale(1) translateY(0); }
            25% { transform: scale(1.1) translateY(-20px) rotate(5deg); }
            50% { transform: scale(1.1) translateY(-20px) rotate(-5deg); }
            75% { transform: scale(1.1) translateY(-20px) rotate(5deg); }
          }

          @keyframes amazedBounce {
            0%, 100% { transform: scale(1) translateY(0); }
            20% { transform: scale(1.05) translateY(-40px); }
            40% { transform: scale(1) translateY(-15px); }
            60% { transform: scale(1.05) translateY(-25px); }
            80% { transform: scale(1) translateY(-15px); }
          }

          .techmate-wrapper {
            transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .robot-content {
            animation: floatRobot 4s ease-in-out infinite;
            transform-origin: center;
          }

          .excited .robot-content {
            animation: excitedBounce 0.5s ease-in-out 2;
          }

          .amazed .robot-content {
            animation: amazedBounce 1.5s ease-in-out forwards;
          }

          /* Mode Transitions */
          .password #left-eye, .password #right-eye {
            transform: scaleY(0.22) translateY(2px);
            opacity: 0.75;
            transition: all 0.35s ease;
          }

          .password #side-accent-left,
          .password #side-accent-right {
            opacity: 1;
          }

          .password #face-glyph-left,
          .password #face-glyph-right {
            opacity: 0;
          }

          .password #robot-head {
            transform-origin: center;
            transform-box: fill-box;
            animation: passwordFocus 1.8s ease-in-out infinite;
          }

          .password #left-arm-group,
          .password #right-arm-group {
            transform-box: fill-box;
            animation: passwordGuard 1.8s ease-in-out infinite;
          }

          .password #left-arm-group {
            transform-origin: top right;
          }

          .password #right-arm-group {
            transform-origin: top left;
          }

          @keyframes passwordFocus {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(2px) rotate(-1.2deg); }
          }

          @keyframes passwordGuard {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }

          .email .robot-content {
            animation: emailFocus 1.6s ease-in-out infinite;
          }

          @keyframes emailFocus {
            0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
            50% { transform: translate3d(-8px, 10px, 0) rotate(1deg); }
          }

          #left-eye, #right-eye {
            transition: cx 0.1s ease-out, cy 0.1s ease-out;
            transform-origin: center;
          }

          #robot-body, #robot-head {
             transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .loading #robot-head {
            animation: loadingHead 1s infinite ease-in-out;
          }

          .loading #left-eye,
          .loading #right-eye {
            animation: loadingBlink 0.75s infinite ease-in-out;
          }

          .waiting-orb .robot-content {
            animation: waitingFloat 2.3s ease-in-out infinite;
          }

          .waiting-orb #left-eye,
          .waiting-orb #right-eye {
            transform: translateX(7px) scale(0.95);
            opacity: 0.95;
          }

          .waiting-orb #left-arm-group {
            transform-origin: top right;
            transform-box: fill-box;
            animation: waitingLeftArm 1.7s ease-in-out infinite;
          }

          .waiting-orb #right-arm-group {
            transform-origin: top left;
            transform-box: fill-box;
            animation: waitingRightArm 1.4s ease-in-out infinite;
          }

          .waiting-orb #robot-head {
            transform-origin: center;
            transform-box: fill-box;
            animation: waitingHead 1.8s ease-in-out infinite;
          }

          @keyframes waitingFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }

          @keyframes waitingHead {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(4deg) translateX(3px); }
          }

          @keyframes waitingRightArm {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            50% { transform: rotate(-18deg) translateY(-4px); }
          }

          @keyframes waitingLeftArm {
            0%, 100% { transform: rotate(0deg) translateY(0); }
            50% { transform: rotate(8deg) translateY(-2px); }
          }

          @keyframes loadingHead {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }

          @keyframes loadingBlink {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0.35; }
          }

          .success #left-eye,
          .success #right-eye {
            fill: #16a34a;
            animation: successPulse 0.9s ease-in-out infinite;
          }

          .success #core-light {
            fill: #22c55e;
            animation: successCore 1.1s ease-in-out infinite;
          }

          @keyframes successPulse {
            0%, 100% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.12); opacity: 0.6; }
          }

          @keyframes successCore {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 0.35; }
          }

          .error #robot-head {
            animation: errorShake 0.36s ease-in-out 3;
          }

          .error #left-eye,
          .error #right-eye {
            fill: #ef4444;
          }

          .error #core-light {
            fill: #ef4444;
            opacity: 0.85;
          }

          @keyframes errorShake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
        `}
      </style>

      <div
        className="robot-content pointer-events-auto cursor-pointer"
        style={{ width: size, height: Math.round(size * 1.25) }}
      >
        <svg
          ref={robotRef}
          viewBox="0 0 400 500"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <radialGradient id="white-body" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#d6dfea" />
              <stop offset="100%" stopColor="#7a8799" />
            </radialGradient>

            <radialGradient id="blue-accent" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#8bc6ff" />
              <stop offset="45%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#15337a" />
            </radialGradient>

            <linearGradient id="screen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#151d2e" />
              <stop offset="100%" stopColor="#02040a" />
            </linearGradient>

            <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
              <feDropShadow dx="0" dy="15" stdDeviation="10" floodColor="#000" floodOpacity="0.45" />
            </filter>

            <filter id="inner-shadow">
              <feOffset dx="0" dy="5" />
              <feGaussianBlur stdDeviation="5" result="offset-blur" />
              <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
              <feFlood floodColor="#000000" floodOpacity="0.85" result="color" />
              <feComposite operator="in" in="color" in2="inverse" result="shadow" />
              <feComposite operator="over" in="shadow" in2="SourceGraphic" />
            </filter>

            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="body-clip">
              <path d="M 120, 180 C 120, 180, 280, 180, 280, 180 C 300, 320, 250, 440, 200, 440 C 150, 440, 100, 320, 120, 180 Z" />
            </clipPath>
          </defs>

          <g id="robot-body">
            <ellipse cx="200" cy="460" rx="60" ry="15" fill="#000000" opacity="0.2" filter="url(#glow)" />

            <g id="left-arm-group" filter="url(#shadow)">
              <ellipse id="side-accent-left" cx="105" cy="220" rx="25" ry="35" transform="rotate(25 105 220)" fill="url(#blue-accent)" />
              <g transform="translate(70, 225) rotate(20)">
                <rect x="0" y="0" width="46" height="110" rx="23" fill="url(#white-body)" />
              </g>
            </g>

            <g id="right-arm-group" filter="url(#shadow)">
              <ellipse id="side-accent-right" cx="295" cy="220" rx="25" ry="35" transform="rotate(-25 295 220)" fill="url(#blue-accent)" />
              <g transform="translate(284, 227) rotate(-20)">
                <rect x="0" y="0" width="46" height="110" rx="23" fill="url(#white-body)" />
              </g>
            </g>

            <g filter="url(#shadow)">
              <path
                d="M 120, 180 C 120, 180, 280, 180, 280, 180 C 300, 320, 250, 440, 200, 440 C 150, 440, 100, 320, 120, 180 Z"
                fill="url(#white-body)"
              />

              <g clipPath="url(#body-clip)">
                <path
                  d="M 110, 180 C 160, 160, 240, 160, 290, 180 C 290, 270, 250, 330, 200, 330 C 150, 330, 110, 270, 110, 180 Z"
                  fill="url(#blue-accent)"
                />
              </g>

              <circle id="core-light" cx="200" cy="275" r="16" fill="#00e5ff" filter="url(#glow)" />
              <circle cx="200" cy="275" r="7" fill="#ffffff" />
            </g>
          </g>

          <g id="robot-head">
            <path d="M 120 75 C 80 65, 70 105, 80 125 C 90 135, 110 125, 120 105 Z" fill="url(#blue-accent)" filter="url(#shadow)" />
            <path d="M 280 75 C 320 65, 330 105, 320 125 C 310 135, 290 125, 280 105 Z" fill="url(#blue-accent)" filter="url(#shadow)" />

            <g filter="url(#shadow)">
              <rect x="90" y="35" width="220" height="140" rx="55" fill="url(#white-body)" />
              <rect x="110" y="55" width="180" height="100" rx="35" fill="url(#screen-grad)" filter="url(#inner-shadow)" />

              <ellipse id="left-eye" cx="155" cy="100" rx="16" ry="16" fill="#00e5ff" filter="url(#glow)" />
              <ellipse id="right-eye" cx="245" cy="100" rx="16" ry="16" fill="#00e5ff" filter="url(#glow)" />

              <path id="face-glyph-left" d="M 130 80 L 130 120 L 140 120" stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
              <path id="face-glyph-right" d="M 270 130 L 270 90 L 260 90" stroke="#00e5ff" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.2" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
