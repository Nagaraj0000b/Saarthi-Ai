/**
 * @fileoverview Database configuration and connection utility for the GigOne application.
 * Utilizes Mongoose for MongoDB interaction and object data modeling.
 * 
 * @module server/config/db
 * @requires mongoose
 */

const mongoose = require("mongoose");

/**
 * Establishes a singleton connection to the MongoDB database using the URI provided in environment variables.
 * Implements basic error handling for connection failures.
 * 
 * @async
 * @function connectDB
 * @returns {Promise<void>} Resolves when the connection is successfully established.
 * @throws {Error} Logs any connection errors encountered during the initialization process.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        // Consider process.exit(1) in a production environment if the DB is critical for startup
    }
}

module.exports = connectDB;
