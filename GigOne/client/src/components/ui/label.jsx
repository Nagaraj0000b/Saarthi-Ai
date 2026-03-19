/**
 * @fileoverview Label component for form accessibility.
 * Built on Radix UI Label primitive for standard-compliant accessible labels.
 * 
 * @module client/components/ui/label
 * @requires react
 * @requires radix-ui
 * @requires @/lib/utils
 */

import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/**
 * Label Component
 * 
 * @component Label
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element}
 */
function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("label", className)}
      {...props}
    />
  );
}

export { Label }
