const mongoose = require('mongoose');
const User = require('./models/User');
const EarningsEntry = require('./models/EarningsEntry');
const Nudge = require('./models/Nudge');
require('dotenv').config({ path: './.env' });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gigone');
    
    const user = await User.create({
      name: 'Spark Tester ' + Date.now(),
      email: 'spark@test.' + Date.now() + '.com',
      dailyTarget: 10000, // Set very high so they DON'T hit it immediately
    });
    
    console.log(`Created test user: ${user._id} with target ₹10000`);

    await EarningsEntry.create({
      userId: user._id,
      job: 'Uber',
      amount: 150,
      hours: 2,
    });
    
    console.log(`Created EarningsEntry of ₹150 for user ${user._id}. Waiting for Instant Spark (12s)...`);
    
    let found = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const nudge = await Nudge.findOne({ userId: user._id, title: '✨ Instant Spark!' });
      if (nudge) {
        console.log(`FOUND NUDGE after ${i+1}s: ${nudge.body}`);
        found = true;
        break;
      }
    }
    
    if (!found) console.log('Nudge NOT found within 30s');
    
    await mongoose.disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
run();
