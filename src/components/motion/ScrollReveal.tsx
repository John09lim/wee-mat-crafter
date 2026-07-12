import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  x?: number;
  y?: number;
};

export const ScrollReveal = ({ children, className, delay = 0, x = 0, y = 18 }: ScrollRevealProps) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.16, margin: "-5% 0px" }}
      transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : delay, ease }}
    >
      {children}
    </motion.div>
  );
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

export const StaggerGroup = ({ children, className }: StaggerProps) => {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.1, margin: "-5% 0px" }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className }: StaggerProps) => {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.42, ease },
    },
  };

  return (
    <motion.div className={cn("h-full", className)} variants={reduceMotion ? undefined : variants}>
      {children}
    </motion.div>
  );
};

export const StaggerListItem = ({ children, className }: StaggerProps) => {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.42, ease },
    },
  };

  return (
    <motion.li className={className} variants={reduceMotion ? undefined : variants}>
      {children}
    </motion.li>
  );
};
