require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const connectDB = require("./config/db");

// Mocking dispatchNudge so it doesn't actually spam users
const nudgeDispatch = require("./services/nudgeDispatchService");
nudgeDispatch.dispatchNudge = async (userId, data) => {
    console.log("\n==================================");
    console.log("🔥 ENVIRONMENTAL NUDGE FIRED! 🔥");
    console.log("==================================");
    console.log("User:", userId);
    console.log("Type:", data.type);
    console.log("Title:", data.title);
    console.log("Body:", data.body);
    console.log("Metadata:", data.metadata);
    console.log("==================================\n");
    return true;
};

const weatherService = require("./services/weatherService");
const originalGetWeatherContext = weatherService.getWeatherContext;

const { evaluate } = require("./services/nudgeEvaluators/environmentalNudgeEvaluator");

async function testCases() {
    await connectDB();
    console.log("\n--- Testing Extreme Heat ---");
    weatherService.getWeatherContext = async () => ({
        current: { condition: "Clear", temp: 42 }
    });
    // Dummy ObjectId
    await evaluate(new mongoose.Types.ObjectId().toString(), 0, 0);

    console.log("\n--- Testing Heavy Rain ---");
    weatherService.getWeatherContext = async () => ({
        current: { condition: "Thunderstorm", temp: 25 }
    });
    await evaluate(new mongoose.Types.ObjectId().toString(), 0, 0);

    console.log("\n--- Testing Normal Weather (Should NOT fire) ---");
    weatherService.getWeatherContext = async () => ({
        current: { condition: "Clouds", temp: 28 }
    });
    await evaluate(new mongoose.Types.ObjectId().toString(), 0, 0);

    process.exit(0);
}

testCases();
