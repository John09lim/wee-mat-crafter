import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";

interface WeekMatrixDocumentProps {
  compact?: boolean;
  className?: string;
}

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const matrixRows = [
  {
    label: "Learning Objectives",
    entries: ["Identify", "Explain", "Compare", "Apply", "Reflect"],
  },
  {
    label: "Learning Activities",
    entries: ["Explore", "Model", "Practice", "Discuss", "Share"],
  },
  {
    label: "Learning Resources",
    entries: ["Module", "Activity", "Visual aid", "Worksheet", "Notes"],
  },
  {
    label: "Assessment",
    entries: ["Warm-up", "Quick check", "Exercise", "Exit ticket", "Output"],
  },
  {
    label: "Remarks",
    entries: ["Ready", "On track", "Review", "Complete", "Continue"],
  },
];

const accentWidths = ["w-3/5", "w-4/5", "w-1/2", "w-2/3", "w-3/4"];

export function WeekMatrixDocument({
  compact = false,
  className,
}: WeekMatrixDocumentProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const captionId = useId();

  const backSheetVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, y: 0, rotate: -2.5 },
        visible: { opacity: 1, y: 0, rotate: -2.5 },
      }
    : {
        hidden: { opacity: 0, y: 16, rotate: -0.5 },
        visible: {
          opacity: 1,
          y: 0,
          rotate: -2.5,
          transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
        },
      };

  const frontSheetVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, y: 0, rotate: 1.25 },
        visible: { opacity: 1, y: 0, rotate: 1.25 },
      }
    : {
        hidden: { opacity: 0, y: 24, rotate: 3.5 },
        visible: {
          opacity: 1,
          y: 0,
          rotate: 1.25,
          transition: {
            delay: 0.08,
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        },
      };

  const accentVariants = prefersReducedMotion
    ? {
        hidden: { opacity: 1, scaleX: 1 },
        visible: { opacity: 1, scaleX: 1 },
      }
    : {
        hidden: { opacity: 0, scaleX: 0 },
        visible: (index: number) => ({
          opacity: 1,
          scaleX: 1,
          transition: {
            delay: 0.48 + index * 0.035,
            duration: 0.28,
            ease: [0.22, 1, 0.36, 1] as const,
          },
        }),
      };

  return (
    <motion.figure
      aria-labelledby={`${titleId} ${captionId}`}
      className={cn(
        "relative isolate mx-auto w-full select-none",
        compact ? "max-w-[29rem]" : "max-w-[40rem]",
        className,
      )}
      initial="hidden"
      viewport={{ once: true, amount: 0.28 }}
      whileInView="visible"
    >
      <figcaption id={captionId} className="sr-only">
        A completed Weekly Learning Matrix for Grade 6 Mathematics, layered over
        its source Daily Lesson Plan and Daily Lesson Log.
      </figcaption>

      <div
        className={cn(
          "relative w-full",
          compact ? "aspect-[6/7]" : "aspect-[5/6]",
        )}
      >
        <motion.div
          aria-hidden="true"
          className="absolute left-[16%] top-[2%] -z-10 aspect-[4/5] w-[78%] origin-bottom rounded-[2px] border border-[#d8d2c5] bg-[#f5f1e7] shadow-[0_18px_46px_rgba(36,45,38,0.13)]"
          variants={backSheetVariants}
        >
          <div className="absolute inset-[6%] overflow-hidden border border-[#b8c4b8] bg-[#fbf8ef] p-[4%] text-[#245633]">
            <div className="flex items-start justify-between border-b border-[#7fa087] pb-[3%]">
              <div>
                <p className="font-display text-[clamp(0.42rem,1.2vw,0.72rem)] font-semibold uppercase tracking-[0.12em]">
                  Daily Lesson Log
                </p>
                <p className="mt-1 text-[clamp(0.3rem,0.75vw,0.48rem)] font-semibold tracking-[0.18em] text-[#6a786c]">
                  DLP / DLL
                </p>
              </div>
              <div className="rounded-sm border border-[#9ab09e] px-[3%] py-[1.5%] text-[clamp(0.28rem,0.7vw,0.44rem)] font-bold uppercase tracking-wider">
                Week 3
              </div>
            </div>

            <div className="mt-[5%] grid grid-cols-[28%_1fr] gap-x-[4%] gap-y-[4%]">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="contents">
                  <div className="h-px bg-[#a7b3a8]" />
                  <div className="h-px bg-[#c4cbc1]" />
                </div>
              ))}
            </div>

            <div className="absolute inset-x-[5%] bottom-[6%] grid grid-cols-5 gap-[2%]">
              {weekdays.map((day) => (
                <div key={day} className="space-y-1">
                  <div className="h-px bg-[#7fa087]" />
                  <div className="h-px w-4/5 bg-[#c4cbc1]" />
                  <div className="h-px w-3/5 bg-[#c4cbc1]" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.article
          aria-describedby={captionId}
          className="absolute left-[7%] top-[4%] flex aspect-[4/5] w-[84%] origin-bottom flex-col overflow-hidden rounded-[2px] border border-[#d8d2c5] bg-[#fffdf7] p-[4.5%] text-[#1e2a21] shadow-[0_28px_60px_rgba(28,42,32,0.22),0_5px_16px_rgba(28,42,32,0.10)]"
          variants={frontSheetVariants}
        >
          <header className="flex items-center gap-[3%] border-b border-[#9da79f] pb-[2.5%]">
            <img
              alt="Schools Division of Negros Oriental seal"
              className="size-[clamp(1.6rem,5.5vw,3.4rem)] shrink-0 rounded-full object-cover"
              draggable={false}
              src="/sdo-negros-oriental-seal.jpg"
            />
            <div className="min-w-0">
              <p className="truncate text-[clamp(0.28rem,0.75vw,0.48rem)] font-semibold uppercase tracking-[0.13em] text-[#667168]">
                Department of Education
              </p>
              <h3
                id={titleId}
                className="font-display text-[clamp(0.48rem,1.65vw,1.08rem)] font-semibold leading-tight text-[#174d2b]"
              >
                Weekly Learning Matrix
              </h3>
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-x-[8%] gap-y-[1%] border-b border-[#aeb5ae] py-[2.2%] text-[clamp(0.28rem,0.72vw,0.46rem)] leading-tight">
            <div className="flex gap-1">
              <dt className="font-semibold text-[#5a625c]">Grade Level:</dt>
              <dd>Grade 6</dd>
            </div>
            <div className="flex justify-end gap-1">
              <dt className="font-semibold text-[#5a625c]">Quarter:</dt>
              <dd>2</dd>
            </div>
            <div className="flex gap-1">
              <dt className="font-semibold text-[#5a625c]">Learning Area:</dt>
              <dd>Mathematics</dd>
            </div>
            <div className="flex justify-end gap-1">
              <dt className="font-semibold text-[#5a625c]">Week:</dt>
              <dd>3</dd>
            </div>
          </dl>

          <section className="my-[2%] border border-[#858f87] px-[2%] py-[1.6%] text-[clamp(0.27rem,0.68vw,0.43rem)] leading-snug">
            <h4 className="font-bold uppercase tracking-[0.03em] text-[#445047]">
              Most Essential Learning Competency
            </h4>
            <p>Solves problems involving whole numbers.</p>
          </section>

          <div className="min-h-0 flex-1 overflow-hidden">
            <table className="h-full w-full table-fixed border-collapse text-left text-[clamp(0.24rem,0.62vw,0.4rem)] leading-tight">
              <caption className="sr-only">
                Weekly plan showing objectives, activities, resources,
                assessment, and remarks from Monday through Friday.
              </caption>
              <colgroup>
                <col className="w-[19%]" />
                {weekdays.map((day) => (
                  <col key={day} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    aria-label="Planning category"
                    className="border border-[#718475] bg-[#225f36] p-[1.2%]"
                    scope="col"
                  />
                  {weekdays.map((day) => (
                    <th
                      key={day}
                      className="border border-[#718475] bg-[#225f36] px-[1%] py-[1.8%] text-center font-bold uppercase tracking-[0.02em] text-white"
                      scope="col"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, rowIndex) => (
                  <tr key={row.label}>
                    <th
                      className="border border-[#aab1ab] bg-[#f2f0e8] p-[2%] font-bold uppercase text-[#344239]"
                      scope="row"
                    >
                      {row.label}
                    </th>
                    {row.entries.map((entry, dayIndex) => {
                      const accentIndex = rowIndex * weekdays.length + dayIndex;

                      return (
                        <td
                          key={`${row.label}-${weekdays[dayIndex]}`}
                          className="border border-[#b7bdb7] p-[2%] align-top"
                        >
                          <span className="block font-semibold text-[#4a554d]">
                            {entry}
                          </span>
                          <span
                            aria-hidden="true"
                            className="mt-[12%] block h-px w-full bg-[#c8cbc6]"
                          />
                          <motion.span
                            aria-hidden="true"
                            className={cn(
                              "mt-[15%] block h-[2px] origin-left rounded-full bg-[#d2a622]",
                              accentWidths[(rowIndex + dayIndex) % accentWidths.length],
                            )}
                            custom={accentIndex}
                            variants={accentVariants}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="mt-[2.2%] flex items-end justify-between gap-3 text-[clamp(0.25rem,0.62vw,0.4rem)] text-[#59635b]">
            <p className="font-semibold uppercase tracking-[0.08em] text-[#1f5e35]">
              Learner-ready weekly plan
            </p>
            <p className="whitespace-nowrap">
              Prepared by: <span className="inline-block w-10 border-b border-[#858f87] sm:w-16" />
            </p>
          </footer>
        </motion.article>

        <motion.div
          aria-hidden="true"
          className="absolute right-[11%] top-[1.5%] z-20 text-[#c39418] drop-shadow-sm"
          variants={
            prefersReducedMotion
              ? { hidden: { opacity: 1, y: 0, rotate: 8 }, visible: { opacity: 1, y: 0, rotate: 8 } }
              : {
                  hidden: { opacity: 0, y: -8, rotate: -4 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    rotate: 8,
                    transition: { delay: 0.4, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                  },
                }
          }
        >
          <Paperclip
            className={cn(
              "stroke-[1.8]",
              compact ? "size-7 sm:size-9" : "size-8 sm:size-11",
            )}
          />
        </motion.div>
      </div>
    </motion.figure>
  );
}

export default WeekMatrixDocument;
