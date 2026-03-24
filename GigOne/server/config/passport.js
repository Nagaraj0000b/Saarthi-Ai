/**
 * @fileoverview Passport configuration for Google OAuth 2.0 authentication.
 */

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const AppError = require("../utils/appError");

const googleOAuthEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (googleOAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value;

          if (!email) {
            done(
              new AppError("Google account email is unavailable", 400, {
                code: "OAUTH_PROFILE_INVALID",
              }),
              null
            );
            return;
          }

          let user = await User.findOne({ email });

          if (user) {
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }

            done(null, user);
            return;
          }

          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            passwordHash: "google_oauth_no_password",
          });

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
} else {
  console.warn("Google OAuth credentials are missing. Google login routes are disabled.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = { googleOAuthEnabled };
