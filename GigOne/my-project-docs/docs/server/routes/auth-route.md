`server/routes/auth.js` wires authentication endpoints to the controller and Passport.

**Core behavior**
`POST /api/auth/register` and `POST /api/auth/login` simply call `register` and `login` from `authController` so the controller handles account creation and password verification (`auth.js:17-29`).  
`GET /api/auth/google` starts the Google OAuth flow via `passport.authenticate("google", { scope: ["profile", "email"] })`, redirecting the browser to Google consent (`auth.js:35-40`).  
`GET /api/auth/google/callback` lets Passport handle Google’s response (`passport.authenticate("google", { session: false, failureRedirect: "/login" })`) and then signs a JWT for `req.user`, redirecting back to the frontend with the token and user info encoded (`auth.js:43-63`).

No business logic lives in this file; it only composes middleware (Passport) and routes so the rest of the app can focus on controllers.
