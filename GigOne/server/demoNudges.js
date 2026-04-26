const mongoose = require("mongoose");
const Nudge = require("./models/Nudge");
const User = require("./models/User");

// Configuration: MongoDB Connection String
// Ideally, this would be in your .env file. For this script, we attempt to load from process.env
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/project_db";

const SCENARIOS = {
  heavyrainfall: {
    type: "environmental",
    title: "⛈️ Heavy Rain Alert!",
    body: "Heavy rain detected in your area. Please drive safely and expect slower traffic.",
    emoji: "⛈️",
    priority: "high",
  },
  surge: {
    type: "surge",
    title: "⚡ Surge Pricing Active!",
    body: "High demand detected in the City Center. Head there now for 1.5x earnings!",
    emoji: "⚡",
    priority: "high",
  },
  burnout: {
    type: "burnout",
    title: "😓 Time for a Break",
    body: "You've been working hard for 6 hours. Take a 15-minute break to recharge and stay safe.",
    emoji: "😓",
    priority: "normal",
  },
  target: {
    type: "daily_target",
    title: "🎯 Almost at Your Goal!",
    body: "You're only ₹200 away from your daily target. One more trip and you're done for the day!",
    emoji: "🎯",
    priority: "normal",
  },
  optimization: {
    type: "earnings_optimization",
    title: "💰 Earning Tip",
    body: "Based on current trends, moving towards the Airport zone now could increase your earnings.",
    emoji: "💰",
    priority: "normal",
  },
  shift: {
    type: "next_day_shift",
    title: "📅 Tomorrow's Outlook",
    body: "Tomorrow is expected to be a high-demand day. Consider starting your shift 1 hour earlier!",
    emoji: "📅",
    priority: "normal",
  },
};

async function getLatestUserId() {
  try {
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) throw new Error("No users found in the database.");
    return user._id.toString();
  } catch (error) {
    throw new Error(`Could not find user: ${error.message}`);
  }
}

async function run() {
  const scenarioKey = process.argv[2];

  if (!scenarioKey) {
    console.log("\x1b[31mError: Please specify a scenario.\x1b[0m");
    console.log("\nAvailable scenarios: " + Object.keys(SCENARIOS).join(", "));
    process.exit(1);
  }

  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) {
    console.log(`\x1b[31mError: Scenario '${scenarioKey}' not found.\x1b[0m`);
    console.log("Available scenarios: " + Object.keys(SCENARIOS).join(", "));
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("\x1b[32mConnected to MongoDB.\x1b[0m");

    console.log("Searching for the most recently active user...");
    const targetUserId = await getLatestUserId();
    console.log(`\x1b[36mFound latest user: ${targetUserId}\x1b[0m`);

    // Bypass Throttling by inserting directly into the collection
    const nudge = await Nudge.create({
      userId: targetUserId,
        ...scenario,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24h
        isDemo: true, // Mark as demo so UI always notifies

    });

    console.log("\n\x1b[32m====================================================\x1b[0m");
    console.log(`\x1b[1m✅ NUDGE INJECTED SUCCESSFULLY\x1b[0m`);
    console.log(`\x1b[36mUser ID:\x1b[0m ${targetUserId}`);
    console.log(`\x1b[36mScenario:\x1b[0m ${scenarioKey}`);
    console.log(`\x1b[36mTitle:\x1b[0m ${scenario.title}`);
    console.log(`\x1b[36mPriority:\x1b[0m ${scenario.priority}`);
    console.log("\x1b[32m====================================================\x1b[0m");
    console.log("\n📱 Check the app now. The nudge will appear on the next poll.");

  } catch (error) {
    console.error("\x1b[31mCritical Error:\x1b[0m", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
