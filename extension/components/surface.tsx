import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "cn";

interface SurfaceProps extends HTMLMotionProps<"div"> {
  children?: React.ReactNode;
  className?: string;
  width?: number;
}

export default function Surface({
  children,
  className,
  width,
  ...props
}: SurfaceProps) {
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.99 }}
      initial={{
        opacity: 0,
        filter: "blur(24px)",
        y: 256,
        width: width ? 0 : undefined,
        scale: 0.4,
      }}
      animate={{
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        width: width ? width : undefined,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 16,
        filter: {
          duration: 0.6,
        },
        width: {
          type: "spring",
          stiffness: 300,
          damping: 16,
        },
      }}
      style={{
        borderRadius: "36px",
        boxShadow:
          "inset 0 0 1px 1px rgba(255, 255, 255, 0.38), 0 0 0 1px rgba(0, 0, 0, 0.48), 0 24px 32px rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(24px)",
      }}
      className={cn("bg-zinc-800/55", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
