# Phase 04 Context: Backend Integration

## Phase Goal
Connect the user's registration and skill data to the ML engine via the Node.js server.

## Decisions

### 1. Data Initialization & User State
- **Action**: Existing users will be cleared to ensure schema consistency.
- **Initial State**: A new test user will be created with empty `skills: []` and `registeredJobs: []` arrays.
- **Behavior**: If both are empty, the system will default to recommending "General" jobs (Uber, Swiggy, Zomato) until the user updates their profile.

### 2. Service Precedence & Source of Truth
- **Source of Truth**: The Database (`User` model) is the primary source for skills and registrations.
- **Override Logic**: Query parameters in `/api/jobs/recommend` will act as **overrides**.
  - If `skills` or `jobs` are provided in the URL, the service uses them.
  - If NOT provided, the service fetches them from the `User` document in MongoDB.

### 3. Sync Endpoint Design
- **Endpoint**: `PATCH /api/auth/profile` (or `PATCH /api/user/profile`).
- **Structure**: A single, unified endpoint that accepts a JSON object containing any profile fields (`name`, `skills`, `registeredJobs`).
- **Android Sync**: The app will send its local `TokenManager` state to this endpoint when the user saves changes in the "Manage" screens.

### 4. Logic Alignment (No Hardcoding)
- **Config File**: Create `server/config/jobMapping.js` containing the 5 job categories and their platform mappings.
- **Usage**:
  - `recommendJobs` will use this for fallback logic.
  - `generateMLReason` will use this for context-aware explanations.
  - This ensures the backend categories perfectly match the ML Engine's training data.

## Implementation Details
- **User Model**: Add `skills: [String]` and `registeredJobs: [String]`.
- **Recommendation Service**: Inject `User` data fetching before calling the ML API.
- **Controller**: Ensure `req.user` context is used to pull the correct profile.

## Verification Strategy
- **Unit Test**: Mock a user with specific skills and verify the ML API receives the correct `skill_x: 1` flags.
- **Integration Test**: Update a user's `registeredJobs` via the new profile endpoint and verify subsequent recommendation calls are filtered.
