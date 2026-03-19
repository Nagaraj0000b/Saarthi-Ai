/**
 * @fileoverview Tabs component for compartmentalized content navigation.
 * Built on Radix UI Tabs primitive to ensure keyboard accessibility and WAI-ARIA compliance.
 * 
 * @module client/components/ui/tabs
 * @requires react
 * @requires radix-ui
 * @requires @/lib/utils
 */

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/**
 * Main Tabs Root Container
 * @component Tabs
 */
function Tabs({ className, ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("tabs", className)}
      {...props}
    />
  );
}

/**
 * List container for Tab triggers
 * @component TabsList
 */
function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("tabs-list", className)}
      {...props}
    />
  );
}

/**
 * Individual Tab trigger button
 * @component TabsTrigger
 */
function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn("tabs-trigger", className)}
      {...props}
    />
  );
}

/**
 * Tab Content panel
 * @component TabsContent
 */
function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("tabs-content", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
