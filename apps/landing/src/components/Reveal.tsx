import { motion, useReducedMotion, type MotionProps } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE, delay: i * 0.08 },
  }),
};

/**
 * Scroll-in for a block, staggered by `index`.
 *
 * Honours prefers-reduced-motion by rendering the content outright — not by
 * shortening the animation, which still moves.
 */
export function Reveal({
  children,
  index = 0,
  className,
  id,
  ...rest
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  id?: string;
} & MotionProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} id={id}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      className={className}
      variants={rise}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-70px" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
