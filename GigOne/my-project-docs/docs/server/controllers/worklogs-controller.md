# Work Logs Controller

`server/controllers/worklogsController.js` manages the CRUD operations for a worker's shift history stored in the `WorkLog` collection.

## Endpoints

### `getWorkLogs` — `GET /api/worklogs`

Fetches all work log entries belonging to the authenticated user, sorted newest-first (`date: -1`).

- **Auth:** Required (JWT via `auth` middleware)
- **Response:** Array of `WorkLog` documents

### `addWorkLog` — `POST /api/worklogs`

Creates a new shift entry and associates it with the authenticated user via `req.user.userId`.

- **Auth:** Required (JWT via `auth` middleware)
- **Body fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `platform` | String (Enum) | ✅ | `Uber`, `Swiggy`, `Rapido`, or `Other` |
| `hours` | Number | ✅ | Duration of the shift in hours |
| `date` | Date | ❌ | Defaults to current timestamp if omitted |
| `notes` | String | ❌ | Optional qualitative remarks about the shift |

- **Response:** The newly created `WorkLog` document (HTTP 201)

## Model Used

`WorkLog` (see `server/models/WorkLog.js`) — stores `userId`, `platform`, `hours`, `date`, and `notes`.
