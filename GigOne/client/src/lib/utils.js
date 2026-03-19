/**
 * @fileoverview Shared UI Utilities.
 * Provides helper functions for style management and class name manipulation.
 * 
 * @module client/lib/utils
 * @requires clsx
 * @requires tailwind-merge
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Concatenates and merges Tailwind CSS classes safely.
 * Combines 'clsx' for conditional logic and 'twMerge' to resolve conflict overrides.
 * 
 * @function cn
 * @param  {...any} inputs - Class names or conditional class objects.
 * @returns {string} The optimized class string.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
