# Application Pages

## Authentication

### Sign In (`pages/auth/SignIn.jsx`)
-   **Route:** `/signin`
-   **Features:**
    -   Tabbed interface for User vs. Admin login.
    -   Local email/password form.
    -   "Continue with Google" OAuth button.

### Sign Up (`pages/auth/SignUp.jsx`)
-   **Route:** `/signup`
-   **Features:** Registration form for new users.

## User Dashboard

### Dashboard Home (`pages/user/DashBoard.jsx`)
-   **Route:** `/user/dashboard`
-   **Key Sections:**
    -   **Top Bar:** Live clock, Weather badge, Status indicator.
    -   **AI Companion:** Central avatar, chat bubble history, "Hold to Speak" mic button.
    -   **Overview Panel:** Mental Fatigue Risk meter, Weekly earnings bar chart (CSS-only), recent work logs list.

### Feature Pages
-   **Earnings (`pages/user/Earnings.jsx`):** `/user/earnings` - Detailed financial reports connected to backend API.
-   **Work Logs (`pages/user/WorkLogs.jsx`):** `/user/worklogs` - Shift history connected to backend API.

### Skeleton Pages
-   **Weekly Report:** `/user/weekly-report` - Aggregated insights.
-   **Shift Planner:** `/user/shift-planner` - Schedule optimization.
