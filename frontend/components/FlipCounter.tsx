"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlipCounterProps {
  value: string | number;
  color?: string;
  size?: number;
  className?: string;
}

export default function FlipCounter({
  value,
  color = "var(--ui-content-strong)",
  size = 32,
  className = "",
}: FlipCounterProps) {
  const [displayValue, setDisplayValue] = useState<string>(String(value));

  useEffect(() => {
    setDisplayValue(String(value));
  }, [value]);

  const characters = displayValue.split("");

  return (
    <div
      className={`flex items-baseline overflow-hidden ${className}`}
      style={{ color, fontSize: size, height: size * 1.2, lineHeight: 1 }}
    >
      {characters.map((char, index) => {
        const isDigit = /\d/.test(char);
        
        return (
          <div key={`${index}-${char}`} className="relative flex flex-col items-center">
            {isDigit ? (
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={char}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: "0%", opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  style={{ display: "inline-block" }}
                >
                  {char}
                </motion.span>
              </AnimatePresence>
            ) : (
              <span>{char}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
