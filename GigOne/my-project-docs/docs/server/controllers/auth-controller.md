`server/controllers/authController.js` handles creating new accounts and signing in using bcrypt and JSON Web Tokens (JWT).

**Core Functions**
`generateToken(user)` creates a JWT that includes the user's ID and role. It is secured using `process.env.JWT_SECRET` and is valid for 7 days (`authController.js:7-21`).  
`register(req, res)` first checks if an account with the email already exists. It then scrambles the password using bcrypt, saves the new user, and sends back the new JWT along with basic user details (`authController.js:25-51`).  
`login(req, res)` searches for the user by email. It blocks users who only signed up with Google (those without a stored password). It then verifies the provided password against the stored scrambled one using bcrypt, and finally returns a new token and user data (`authController.js:53-72`).

The API paths `/api/auth/register` and `/api/auth/login` simply pass the request to these functions. This means the controller holds the main sign-in and sign-up logic, while depending on the `User` model to save the data.
