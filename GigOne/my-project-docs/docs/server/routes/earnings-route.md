`server/routes/earnings.js` maps the `/api/earnings` CRUD paths to `earningsController` behind JWT auth.

- It always runs the shared `auth` middleware before calling the controller so only authenticated users can access earnings data (`earnings.js:11-14`).  
- `GET /api/earnings` calls `getEarnings`, `POST /api/earnings` calls `addEarning`, and the `PUT/DELETE /api/earnings/:id` routes call `updateEarning`/`deleteEarning`, meaning each HTTP method is wired to its controller counterpart (`earnings.js:17-45`).  
- The file contains no other logic; the controller handles persistence while this layer just composes middleware and routes.
