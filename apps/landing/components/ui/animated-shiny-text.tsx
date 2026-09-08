"use client";
import { motion } from "framer-motion";

export function AnimatedText({ text }: { text: string }) {
  return (
    <motion.span
      className="inline-block bg-gradient-to-r from-indigo-400 via-white to-indigo-400 bg-clip-text text-transparent"
      style={{ backgroundSize: "200% auto" }}
      animate={{ backgroundPosition: ["0% center", "200% center"] }}
      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}
