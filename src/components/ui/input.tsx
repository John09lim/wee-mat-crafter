import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-h-11 w-full rounded-lg border border-input bg-paper px-3 py-2 text-base text-foreground shadow-[0_1px_0_rgba(20,32,25,0.03)] ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-primary placeholder:text-muted-foreground/85 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
