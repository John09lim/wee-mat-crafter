import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedWordProps = {
  progress: MotionValue<number>;
  start: number;
  end: number;
  word: string;
};

const AnimatedWord = ({ progress, start, end, word }: AnimatedWordProps) => {
  const opacity = useTransform(progress, [start, end], [0.2, 1]);
  const y = useTransform(progress, [start, end], [8, 0]);

  return (
    <motion.span className="inline-block" style={{ opacity, y }}>
      {word}
    </motion.span>
  );
};

type WordRevealProps = {
  text: string;
  className?: string;
};

export const WordReveal = ({ text, className }: WordRevealProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();
  const words = text.split(" ");
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.45"],
  });

  if (reduceMotion) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p ref={ref} className={cn("flex flex-wrap gap-x-[0.25em] gap-y-[0.08em]", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="contents">
        {words.map((word, index) => {
          const start = index / words.length;
          const end = Math.min(start + 1 / words.length + 0.04, 1);
          return <AnimatedWord key={`${word}-${index}`} progress={scrollYProgress} start={start} end={end} word={word} />;
        })}
      </span>
    </p>
  );
};
