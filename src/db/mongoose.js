const mongoose = require('mongoose');

const connectionURL = process.env.MONGODB_URL;

module.exports = async () => {
  try {
    await mongoose.connect(connectionURL, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
    });

    console.log(`DB connection SUCCESS!`);
  } catch (e) {
    console.log(`DB connection ERROR:`, e);
  }
};
