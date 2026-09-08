"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export function MagneticText({ text, hoverText }: { text: string; hoverText: string }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.span
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="inline-block cursor-pointer font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
      whileHover={{ scale: 1.05 }}
    >
      {isHovered ? hoverText : text}
    </motion.span>
  );
}
