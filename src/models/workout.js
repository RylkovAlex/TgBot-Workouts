const mongoose = require('mongoose');
const { questionSchema } = require('./question');

const workoutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    params: {
      time: {
        type: Boolean,
        default: true,
      },
      before: [questionSchema],
      after: [questionSchema],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

workoutSchema.virtual(`sessions`, {
  ref: 'Session',
  localField: `_id`,
  foreignField: `workout`,
});

module.exports = mongoose.model('Workout', workoutSchema);
