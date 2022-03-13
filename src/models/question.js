const mongoose = require('mongoose');
const answerTypes = require('../bot/enums/answerTypes');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
    },
    paramName: {
      type: String,
      required: () => !!this.question,
    },
    answerType: {
      type: String,
      enum: [answerTypes.STRING, answerTypes.NUMBER, answerTypes.RADIO, answerTypes.MULTIPLE],
    },
    possibleAnswers: {
      required: () =>
        this.answerType === answerTypes.RADIO || this.answerType === answerTypes.MULTIPLE,
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model('Question', questionSchema);

module.exports = { Question, questionSchema };
