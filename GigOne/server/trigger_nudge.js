require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Nudge = require("./models/Nudge");
const User = require("./models/User");

const testNudges = {
  weather: {
    type: "environmental",
    title: "🔥 Extreme Heat Warning",
    body: "Temperature is 42°C — dangerously hot for outdoor work! Take frequent breaks and stay hydrated. Consider switching to indoor delivery platforms: Swiggy Instamart, Blinkit, Zepto.",
    emoji: "🔥",
    priority: "high",
    status: "pending",
    metadata: { trigger: "extreme_heat", temp: 42, condition: "clear" }
  },
  rain: {
    type: "environmental",
    title: "🌦️ Rain Expected Tonight",
    body: "Heavy rain is forecast for tonight around 8 PM. If you plan to work the night shift, pack rain gear or switch to indoor platforms like Swiggy Instamart, Blinkit.",
    emoji: "🌦️",
    priority: "normal",
    status: "pending",
    metadata: { trigger: "predictive_rain", condition: "thunderstorm", pop: 0.85 }
  },
  target: {
    type: "daily_target",
    title: "🎉 Daily Target Hit!",
    body: "You earned ₹1500 today — ₹500 above your ₹1000 goal. Rest well, you've earned it!",
    emoji: "🎯",
    priority: "high",
    status: "pending",
    data: { screen: "earnings", todayTotal: 1500, target: 1000 },
    metadata: { todayTotal: 1500, target: 1000, surplus: 500 }
  },
  burnout: {
    type: "burnout",
    title: "🛑 Rest Needed — High Burnout Risk",
    body: "⚠️ Your wellbeing risk score is 85/100. High cumulative fatigue detected. Recovery: 1 rest day or significantly lighter shift tomorrow. If you must work: Grocery delivery (Blinkit/Zepto) — indoor-friendly, low stress.",
    emoji: "😓",
    priority: "urgent",
    status: "pending",
    metadata: { riskScore: 85, riskLevel: "high", recovery: "1 rest day", reasons: ["High fatigue"] }
  },
  earnings: {
    type: "earnings_optimization",
    title: "Blinkit Could Earn You 35% More",
    body: "💰 Based on current conditions, Blinkit is predicted to earn ~₹270/hr vs ₹200/hr on Zomato. Surge pricing detected in your area.",
    emoji: "💰",
    priority: "normal",
    status: "pending",
    data: { suggestedPlatform: "Blinkit", improvement: 35 },
    metadata: { currentPlatform: "Zomato", suggestedPlatform: "Blinkit", improvement: 35 }
  }
};

const run = async () => {
  await connectDB();
  
  // Find a real user in the DB to attach the nudges to
  const user = await User.findOne({}).sort({ updatedAt: -1 });
  if (!user) {
    console.log("❌ No users found in database. Cannot create test nudges.");
    process.exit(1);
  }

  // Which nudge to send?
  const arg = process.argv[2];
  if (!arg || !testNudges[arg]) {
    console.log("\n==================================");
    console.log("🛠️ NUDGE TEST HARNESS");
    console.log("==================================");
    console.log("Usage: node trigger_nudge.js [type]");
    console.log("Available types:");
    Object.keys(testNudges).forEach(k => console.log(`  - ${k}`));
    console.log("Example: node trigger_nudge.js burnout\n");
    process.exit(0);
  }

  const payload = { ...testNudges[arg], userId: user._id };
  await Nudge.create(payload);

  console.log("\n✅ NUDGE SUCCESSFULLY FIRED!");
  console.log("============================");
  console.log(`Sent to User : ${user.name || user.phone} (ID: ${user._id})`);
  console.log(`Type Fired   : ${payload.type}`);
  console.log(`Title        : ${payload.title}`);
  console.log("============================");
  console.log("📱 Open your Android app (pull down to refresh) to view it!\n");

  process.exit(0);
};

run();
