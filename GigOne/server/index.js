/**
 * @fileoverview Main entry point for the GigOne Express server.
 * Orchestrates environment configuration, database connectivity,
 * authentication initialization, and API route mapping.
 */

const express = require("express");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const passport = require("passport");
const connectDB = require("./config/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

dotenv.config({ path: path.join(__dirname, ".env") });

require("./config/passport");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(passport.initialize());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/earnings", require("./routes/earnings"));
app.use("/api/worklogs", require("./routes/worklogs"));
app.use("/api/chat", require("./routes/chat"));

app.get("/", (req, res) => {
  res.json({ message: "GigOne API is running" });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  let server;

  const shutdown = (label, error) => {
    if (error) {
      console.error(`${label}:`, error);
    }

    if (!server) {
      process.exit(error ? 1 : 0);
      return;
    }

    server.close(() => {
      process.exit(error ? 1 : 0);
    });
  };

  process.once("unhandledRejection", (reason) => {
    shutdown("Unhandled promise rejection", reason);
  });

  process.once("uncaughtException", (error) => {
    shutdown("Uncaught exception", error);
  });

  await connectDB();

  server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (bound to 0.0.0.0)`);
  });

  return server;
};

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("Server failed to start:", error);
    process.exit(1);
  });
}

module.exports = { app, bootstrap };
