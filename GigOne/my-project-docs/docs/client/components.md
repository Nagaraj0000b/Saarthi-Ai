# UI Components

The project uses a component library based on Shadcn/UI, which leverages Radix UI for accessibility and Tailwind CSS for styling.

## Core Components

### `Button`
-   **Path:** `components/ui/button.jsx`
-   **Variants:** `default` (primary indigo), `outline`, `ghost`, `link`.
-   **Usage:** Used for all interactive triggers.

### `Card`
-   **Path:** `components/ui/card.jsx`
-   **Sub-components:** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
-   **Usage:** The main container for dashboard widgets (Earnings, AI Chat, Stats).

### `Input` & `Label`
-   **Path:** `components/ui/input.jsx`, `components/ui/label.jsx`
-   **Usage:** Building blocks for the Authentication forms.

### `Tabs`
-   **Path:** `components/ui/tabs.jsx`
-   **Usage:** Switching between "User" and "Admin" login modes on the Sign In page.
