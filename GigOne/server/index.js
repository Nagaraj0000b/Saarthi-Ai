/**
 * @fileoverview Main entry point for the GigOne Express server.
 * Orchestrates the bootstrapping process including environment configuration,
 * database connectivity, authentication middleware initialization, and API route mapping.
 * 
 * @module server/index
 * @requires express
 * @requires cors
 * @requires dotenv
 * @requires ./config/db
 * @requires passport
 */

const express   = require("express");
const cors      = require("cors");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");

// Load environment variables from .env file to process.env
dotenv.config();

// Establish connection to MongoDB via Mongoose
connectDB();

const app = express();

/**
 * Middleware Configuration
 */
app.use(cors());           // Enables Cross-Origin Resource Sharing for frontend integration
app.use(express.json());   // Body-parser middleware for JSON payloads

/**
 * Passport Authentication Strategy Initialization
 * Configures the application to support Google OAuth 2.0.
 */
const passport = require("passport");
require("./config/passport");
app.use(passport.initialize());

/**
 * API Route Mounting
 * All domain-specific logic is encapsulated within its respective route module.
 */
app.use("/api/auth",     require("./routes/auth"));      // Authentication & Authorization (Local + OAuth)
app.use("/api/earnings", require("./routes/earnings"));  // Earnings tracking and management
app.use("/api/worklogs", require("./routes/worklogs"));  // Historical work session logs
app.use("/api/chat",     require("./routes/chat"));      // Gigi AI Voice/Text conversational interface


/**
 * Server Health Check
 * Standard endpoint to verify API availability.
 * @route GET /
 */
app.get("/", (req, res) => {
  res.json({ message: "GigOne API is running 🚀" });
});

const PORT = process.env.PORT || 5000;

/**
 * Start the Express listener
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
