`server/routes/worklogs.js` routes `/api/worklogs` requests through the JWT guard to the work log controller.

- Both `GET /api/worklogs` and `POST /api/worklogs` run `auth` first to ensure the caller is authenticated (`worklogs.js:10-19`).  
- The GET handler calls `getWorkLogs`, and the POST handler calls `addWorkLog`, so each HTTP method is directly mapped to its controller function (`worklogs.js:21-39`).  
- Like the other route files, it handles no database logic itself; it just wires middleware and controller references together.
