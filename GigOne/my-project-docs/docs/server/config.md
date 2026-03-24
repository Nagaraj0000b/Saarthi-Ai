# Server Config

## MongoDB connection (`db.js`)
- Located at `server/config/db.js`, the `connectDB` helper uses Mongoose to connect to the URI in `process.env.MONGO_URI`.  
- It logs success (`MongoDB Connected: <host>`) or the error message and leaves the process running so `index.js` can decide whether to continue starting the server.

## Google OAuth (`passport.js`)
- `server/config/passport.js` wires up the Passport Google strategy and maps any returned profile to the `User` model.  
- It reuses an existing email (adding `googleId` if needed) or creates a new user with a placeholder password hash, then lets the auth route turn that into a JWT.  
- Minimal `serializeUser`/`deserializeUser` functions are present only to satisfy Passport’s requirements since the app issues stateless JWTs instead of sessions.
