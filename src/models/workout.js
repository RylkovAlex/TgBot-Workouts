const mongoose = require('mongoose');
const { questionSchema } = require('./question');
const { sessionSchema } = require('./session');

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
    // sessions: [sessionSchema]
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

workoutSchema.method(`getParamNames`, function () {
  const paramNames = [];
  this.params.before.forEach((p) => paramNames.push(p.paramName));
  this.params.after.forEach((p) => paramNames.push(p.paramName));
  return paramNames;
});

workoutSchema.method(`getQuestionsMap`, function () {
  const questionMap = {};
  this.params.before.forEach((q) => (questionMap[q._id.toString()] = q));
  this.params.after.forEach((q) => (questionMap[q._id.toString()] = q));
  return questionMap;
});

workoutSchema.pre('remove', async function (next) {
  await this.populate('sessions').execPopulate();
  this.sessions.forEach((session) => session.remove());
  next();
});

/* workoutSchema.pre('save', () => {
  const questions = [...this.params.before, ...this.params.after];
  await this.populate('sessions').execPopulate();
  this.sessions.forEach((session) => {
    if (questionSchema.includes)
  });
}); */

module.exports = mongoose.model('Workout', workoutSchema);
