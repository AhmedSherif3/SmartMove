"use client";

import React, { useRef, useState, MouseEvent } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactElement;
  strength?: number; // How much it pulls (0-1)
  glowRadius?: number;
}

export default function MagneticButton({
  children,
  strength = 0.4,
  glowRadius = 100,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Motion values for translation
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs for smooth movement
  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Mouse position for glow effect (relative to button)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();

    // Center of the button
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Distance from center
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;

    // Set magnetic pull
    x.set(deltaX * strength);
    y.set(deltaY * strength);

    // Set glow position
    setMousePos({
      x: clientX - left,
      y: clientY - top,
    });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        x: springX,
        y: springY,
        position: "relative",
        display: "inline-block",
      }}
    >
      {/* The Glow Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(${glowRadius}px circle at ${mousePos.x}px ${mousePos.y}px, var(--ui-magnetic-glow), transparent)`,
          borderRadius: "inherit",
        }}
      />
      
      <div className="relative z-[5]">
        {children}
      </div>
    </motion.div>
  );
}
