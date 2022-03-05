const mongoose = require('mongoose');

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
      enum: ['string', 'number', 'radio', 'multiple'],
    },
    possibleAnswers: {
      required: () =>
        this.answerType === 'radio' || this.answerType === 'multiple',
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model('Question', questionSchema);

module.exports = { Question, questionSchema };
