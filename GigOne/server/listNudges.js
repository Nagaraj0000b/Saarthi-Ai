const mongoose = require('mongoose');
const Nudge = require('./models/Nudge');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_db';
(async () => {
  await mongoose.connect(MONGO_URI);
  const userId = '69de809042784de0d8f06ba0';
  const nudges = await Nudge.find({userId}).lean();
  console.log('Nudges count', nudges.length);
  console.log(nudges.map(n => ({type:n.type, priority:n.priority, title:n.title})));
  await mongoose.disconnect();
})();
