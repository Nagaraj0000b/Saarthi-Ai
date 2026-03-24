/**
 * @fileoverview Database configuration and connection utility for the GigOne application.
 * Utilizes Mongoose for MongoDB interaction and object data modeling.
 */

const mongoose = require("mongoose");
const { requireEnv } = require("../utils/env");

const connectDB = async () => {
  const mongoUri = requireEnv("MONGO_URI");

  try {
    const conn = await mongoose.connect(mongoUri);

    if (mongoose.connection.listenerCount("error") === 0) {
      mongoose.connection.on("error", (error) => {
        console.error("MongoDB runtime error:", error);
      });
    }

    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

module.exports = connectDB;
