import { motion, useInView, type Variants } from "framer-motion";
import type { RefObject, ReactNode } from "react";

type Tag = "div" | "p" | "h3" | "h4" | "span" | "button" | "a";

/**
 * Animates a block in once its timeline container scrolls into view, with
 * `animationNum` passed to the variants as the stagger index.
 */
export function TimelineContent({
  as = "div",
  animationNum,
  timelineRef,
  customVariants,
  className,
  children,
  ...rest
}: {
  as?: Tag;
  animationNum: number;
  timelineRef: RefObject<HTMLElement | null>;
  customVariants?: Variants;
  className?: string;
  children?: ReactNode;
  href?: string;
}) {
  const inView = useInView(timelineRef as RefObject<Element>, { once: true, margin: "0px 0px -15% 0px" });
  const fallback: Variants = {
    visible: (i: number) => ({ y: 0, opacity: 1, filter: "blur(0px)", transition: { delay: i * 0.2, duration: 0.5 } }),
    hidden: { y: -20, opacity: 0, filter: "blur(10px)" },
  };
  const Comp = motion[as];

  return (
    <Comp
      custom={animationNum}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={customVariants ?? fallback}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  );
}
