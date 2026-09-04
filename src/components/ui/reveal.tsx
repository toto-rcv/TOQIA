"use client";

import { motion } from "framer-motion";
import type { ReactNode, ElementType } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
  as: Component = "div",
  x = 0,
  y = 30,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
  x?: number | string;
  y?: number | string;
}) {
  const MotionComponent = motion(Component as any);
  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </MotionComponent>
  );
}
