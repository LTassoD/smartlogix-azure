import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/utils/cn";

type SkeletonRadius = "sm" | "md" | "lg" | "xl" | "full";

type SkeletonProps = ComponentPropsWithoutRef<"div"> & {
  rounded?: SkeletonRadius;
};

const radiusClasses: Record<SkeletonRadius, string> = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full"
};

export function Skeleton({ className, rounded = "md", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("bg-slate-200/80 motion-safe:animate-pulse motion-reduce:animate-none", radiusClasses[rounded], className)}
      {...props}
    />
  );
}

export type { SkeletonProps, SkeletonRadius };
