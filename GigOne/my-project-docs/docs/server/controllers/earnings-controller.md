`server/controllers/earningsController.js` manages `/api/earnings` CRUD for the authenticated user.

**Core Functions**  
`getEarnings(req, res)` fetches `EarningsEntry` records owned by `req.user.userId`, sorts them newest-first, and returns them so the dashboard sees the latest income history (`earningsController.js:9-17`).  
`addEarning(req, res)` reads `platform`, `amount`, `hours`, and an optional `date`, creates a new entry tied to the current user, and replies with the saved document (`earningsController.js:25-40`).  
`updateEarning(req, res)` finds the requested entry by `:id`, ensures it belongs to the authenticated user, applies the update, and returns the up-to-date record or `404` if not found (`earningsController.js:42-54`).  
`deleteEarning(req, res)` removes the entry when it matches both the provided `:id` and `req.user.userId`, and sends success/404 accordingly (`earningsController.js:56-70`).

`/api/earnings` routes simply forward requests to these functions after the JWT auth guard, so the controller encapsulates the earnings business rules while the `EarningsEntry` model handles database persistence.
