"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const motionButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-lapis text-blanc shadow-xs hover:bg-lapis/90",
        outline: "border border-ligne bg-blanc text-encre hover:bg-porcelaine",
        secondary: "bg-or-pale text-encre hover:bg-or/20",
        ghost: "hover:bg-porcelaine text-encre",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-11 rounded-md px-6 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

type Props = React.ComponentProps<"button"> &
  VariantProps<typeof motionButtonVariants> & {
    asChild?: boolean;
  };

export function MotionButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: Props) {
  const reduce = useReducedMotion();
  const Comp = asChild ? Slot : "button";

  if (reduce) {
    return (
      <Comp className={cn(motionButtonVariants({ variant, size }), className)} {...props}>
        {children}
      </Comp>
    );
  }

  return (
    <motion.div
      className="inline-flex"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      <Comp className={cn(motionButtonVariants({ variant, size }), className)} {...props}>
        {children}
      </Comp>
    </motion.div>
  );
}
