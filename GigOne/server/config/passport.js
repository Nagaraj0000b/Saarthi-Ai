/**
 * @fileoverview Passport configuration for Google OAuth 2.0 authentication.
 * Manages the strategy implementation, user lookup/creation, and session-less serialization.
 * 
 * @module server/config/passport
 * @requires passport
 * @requires passport-google-oauth20
 * @requires ../models/User
 */

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

/**
 * Google OAuth 2.0 Strategy Configuration
 * 
 * Defines the logic for verifying users authenticated via Google. 
 * Maps Google profile data to the internal User model and handles JIT (Just-In-Time) provisioning.
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Search for existing user by email to prevent duplicate accounts
        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Sync Google ID if it's the first time this existing local user is using OAuth
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Provision a new user if no match is found
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          // Placeholder hash for OAuth users to satisfy schema constraints without exposing local auth
          passwordHash: "google_oauth_no_password", 
        });

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

/**
 * Serialization Logic
 * Since the application uses stateless JWTs, these are minimal implementations 
 * to satisfy Passport's internal requirements.
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => done(err, user));
});

module.exports = passport;
