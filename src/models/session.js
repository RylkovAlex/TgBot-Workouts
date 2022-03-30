const mongoose = require('mongoose');
const { answerSchema } = require('./answer');

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
    answers: [answerSchema],
    /*     before: [answerSchema],
    after: [answerSchema], */
  },
  {
    timestamps: true,
  }
);

sessionSchema.method(`getData`, async function () {
  if (!this.populated('workout')) {
    await this.populate('workout').execPopulate();
  }
  const questionMap = this.workout.getQuestionsMap();
  const data = {};
  data.createdAt = this.createdAt;
  if (this.workout.params.time) {
    data.time = this.time;
  }
  for (let id in questionMap) {
    const paramName = questionMap[id].paramName;
    const answerDoc = this.answers.find((a) => a.question.toString() === id);
    if (answerDoc) {
      const answer = answerDoc.answer;
      if (answer instanceof Array) {
        data[paramName] = answer.join(`, `);
      } else {
        data[paramName] = answer;
      }
    } else {
      data[paramName] = null;
    }
  }
  return data;
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = { Session, sessionSchema };
