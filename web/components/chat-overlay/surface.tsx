import { motion } from "motion/react";
import { cn } from "cn";

export default function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      initial={{
        opacity: 0,
        filter: "blur(24px)",
        y: 256,
        scale: 0.6,
      }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 20,
        filter: {
          delay: 0,
          duration: 0.6,
        },
      }}
      style={{
        borderRadius: 36,
        boxShadow:
          "inset 0 0 1px 1px rgba(255, 255, 255, 0.38), 0 0 0 1px rgba(0, 0, 0, 0.48), 0 24px 38px rgba(0, 0, 0, 0.40)",
        backdropFilter: "blur(12px)",
        willChange: "transform",
      }}
      className={cn("bg-zinc-800/55", className)}
    >
      {children}
    </motion.div>
  );
}
