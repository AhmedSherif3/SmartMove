"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

// 1. ScrollReveal: staggered fade-up on viewport entry (once)
export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 20,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  yOffset?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

// 2. MagneticButton: cursor-attracted link/button wrapper
export function MagneticButton({
  children,
  strength = 0.3,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, elasticity: 0.1, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const moveX = (clientX - centerX) * strength;
    const moveY = (clientY - centerY) * strength;
    x.set(moveX);
    y.set(moveY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
}

// 3. SpotlightCard: radial gradient follows cursor inside card
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(59, 130, 246, 0.15)",
  size = 350,
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top } = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - left,
      y: e.clientY - top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300"
        style={{
          background: isHovered
            ? `radial-gradient(${size}px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 80%)`
            : "",
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}

// 4. TiltCard: 3D perspective tilt on hover
export function TiltCard({
  children,
  className = "",
  maxTilt = 10,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { damping: 20, stiffness: 200 };
  const rotateX = useSpring(useTransform(y, [0, 1], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(x, [0, 1], [-maxTilt, maxTilt]), springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const mouseX = (e.clientX - left) / width;
    const mouseY = (e.clientY - top) / height;
    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`perspective-1000 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// 5. CountUp: animated number counter on viewport entry
export function CountUp({
  to,
  from = 0,
  duration = 2,
  prefix = "",
  suffix = "",
}: {
  to: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          let startTime: number | null = null;
          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            setCount(Math.floor(progress * (to - from) + from));
            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setCount(to);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [to, from, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// 6. ScrambleText: data-scramble text reveal (pure RAF)
export function ScrambleText({
  text,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*",
  speed = 40,
  scrambleStep = 1 / 3,
}: {
  text: string;
  characters?: string;
  speed?: number;
  scrambleStep?: number;
}) {
  const [displayVal, setDisplayVal] = useState("");
  const isAnimated = useRef(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isAnimated.current = true;
          let iteration = 0;
          const interval = setInterval(() => {
            setDisplayVal(
              text
                .split("")
                .map((char, index) => {
                  if (char === " ") return " ";
                  if (index < iteration) {
                    return text[index];
                  }
                  return characters[Math.floor(Math.random() * characters.length)];
                })
                .join("")
            );

            if (iteration >= text.length) {
              clearInterval(interval);
            }

            iteration += scrambleStep;
          }, speed);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [text, characters, speed, scrambleStep]);

  return <span ref={containerRef}>{displayVal || text}</span>;
}

// 7. Typewriter: typewriter effect with blinking cursor
export function Typewriter({
  text,
  speed = 100,
  delay = 500,
}: {
  text: string;
  speed?: number;
  delay?: number;
}) {
  const [displayVal, setDisplayVal] = useState("");
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const isStarted = useRef(false);

  useEffect(() => {
    if (isStarted.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isStarted.current = true;
          setTimeout(() => {
            let i = 0;
            const timer = setInterval(() => {
              setDisplayVal((prev) => prev + text.charAt(i));
              i++;
              if (i >= text.length) {
                clearInterval(timer);
                setIsDone(true);
              }
            }, speed);
          }, delay);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [text, speed, delay]);

  return (
    <span ref={containerRef}>
      {displayVal}
      <span
        className={`inline-block w-1 h-[1.1em] ml-0.5 bg-current align-middle ${isDone ? "animate-pulse" : "animate-ping"
          }`}
        style={{ animationDuration: "1s" }}
      />
    </span>
  );
}
