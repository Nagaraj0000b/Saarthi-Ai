/**
 * @fileoverview Card component suite for structured content containers.
 * Implements a modular approach with Header, Content, and Footer sub-components.
 * 
 * @module client/components/ui/card
 * @requires react
 * @requires @/lib/utils
 */

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Main Card Container
 * @component Card
 */
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn("card", className)}
      {...props}
    />
  );
}

/**
 * Card Header section
 * @component CardHeader
 */
function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("card-header", className)}
      {...props}
    />
  );
}

/**
 * Card Title
 * @component CardTitle
 */
function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("card-title", className)}
      {...props}
    />
  );
}

/**
 * Card Description
 * @component CardDescription
 */
function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("card-description", className)}
      {...props}
    />
  );
}

/**
 * Card Action area
 * @component CardAction
 */
function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn("card-action", className)}
      {...props}
    />
  );
}

/**
 * Card Body Content
 * @component CardContent
 */
function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("card-content", className)}
      {...props}
    />
  );
}

/**
 * Card Footer section
 * @component CardFooter
 */
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("card-footer", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
