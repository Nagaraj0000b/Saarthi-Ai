# Authentication API

The authentication system uses a hybrid approach supporting both local email/password credentials and Google OAuth 2.0.

## Endpoints

### Register User
`POST /api/auth/register`

Creates a new user account.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
Returns a JWT token and user profile.

### Login
`POST /api/auth/login`

Authenticates an existing user.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

### Google OAuth
`GET /api/auth/google`

Initiates the Google sign-in flow. Redirects to Google's consent screen.

`GET /api/auth/google/callback`

Callback URL handled by Passport.js. On success, redirects to the client application with the JWT token in the URL query parameters.

## Middleware

### `authMiddleware`
Located in `server/middleware/auth.js`.
-   Intercepts requests to protected routes.
-   Verifies the `Authorization: Bearer <token>` header.
-   Decodes the JWT and attaches the `user` object (`userId`, `role`) to `req`.
-   Returns `401 Unauthorized` if invalid.
