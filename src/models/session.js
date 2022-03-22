const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    workout: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Workout',
    },
    time: {
      type: String,
    },
    before: [{}],
    after: [{}],
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
