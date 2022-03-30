const mongoose = require('mongoose');
const answerTypes = require('../bot/enums/answerTypes');

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Question',
    },
    answer: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

const Answer = mongoose.model('Answer', answerSchema);

module.exports = { Answer, answerSchema };
