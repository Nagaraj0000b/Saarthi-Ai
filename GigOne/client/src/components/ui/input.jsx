/**
 * @fileoverview Generic Input component.
 * Standardized form input with thematic styling.
 * 
 * @module client/components/ui/input
 * @requires react
 * @requires @/lib/utils
 */

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input Component
 * 
 * @component Input
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes.
 * @param {string} [props.type] - HTML input type.
 * @returns {JSX.Element}
 */
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("input", className)}
      {...props}
    />
  );
}

export { Input }
