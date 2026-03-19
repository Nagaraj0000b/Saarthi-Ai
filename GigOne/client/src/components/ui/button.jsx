/**
 * @fileoverview Generic Button component.
 * Part of the Shadcn-inspired UI library, utilizing Radix UI Slot for flexibility.
 * 
 * @module client/components/ui/button
 * @requires react
 * @requires radix-ui
 * @requires @/lib/utils
 */

import * as React from "react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

/**
 * Button Component
 * 
 * @component Button
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.variant='default'] - Visual style variant.
 * @param {string} [props.size='default'] - Size variant.
 * @param {boolean} [props.asChild=false] - Whether to render as the child component.
 * @returns {JSX.Element}
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(
        "btn",
        variant === "default" && "btn-primary",
        variant === "outline" && "btn-outline",
        className
      )}
      {...props}
    />
  );
}

export { Button }
