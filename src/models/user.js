const mongoose = require('mongoose');
const Workout = require('./workout');
const { Question } = require('./question');

const userSchema = new mongoose.Schema(
  {
    tgName: {
      type: String,
      required: true,
      trim: true,
    },
    tgId: {
      type: Number,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.virtual(`workouts`, {
  ref: 'Workout',
  localField: `_id`,
  foreignField: `owner`,
});

userSchema.statics.create = async function ({ id, first_name }) {
  const user =
    (await User.findOne({ tgId: id })) ||
    (await new User({
      tgId: id,
      tgName: first_name,
    }).save());

  return user;
};

const runQuestions = {
  before: [
    {
      question:
        'Оцените самочувствие и настрой на тренировку по 10-бальной шкале:',
      paramName: 'Самочувствие и настрой',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
  ],
  after: [
    {
      question: 'Количество киллометров:',
      paramName: 'Количество киллометров',
      answerType: 'number',
    },
    {
      question: 'Кака была погода? Выбери подходящие варианты:',
      paramName: 'Погодные условия',
      answerType: 'multiple',
      possibleAnswers: ['солнечно', 'облачно', 'дождь', 'снег', 'ветер'],
    },
    {
      question: 'Средний пульс?',
      paramName: 'Средний пульс',
      answerType: 'number',
    },
    {
      question: 'Оцените эффективность тренировки по 5-бальной шкале:',
      paramName: 'Оценка эффективности тренировки',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5],
    },
    {
      question: 'При желании, напиши комментарий:',
      paramName: 'Комментарий',
      answerType: 'string',
    },
  ],
};
const swimmQuestions = {
  before: [
    {
      question:
        'Оцените самочувствие и настрой на тренировку по 10-бальной шкале:',
      paramName: 'Самочувствие и настрой',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
  ],
  after: [
    {
      question: 'Количество киллометров:',
      paramName: 'Количество киллометров',
      answerType: 'number',
    },
    {
      question: 'Кака была погода? Выбери подходящие варианты:',
      paramName: 'Погодные условия',
      answerType: 'multiple',
      possibleAnswers: ['солнечно', 'облачно', 'дождь', 'снег', 'ветер'],
    },
    {
      question: 'Средний пульс?',
      paramName: 'Средний пульс',
      answerType: 'number',
    },
    {
      question: 'Оцените эффективность тренировки по 5-бальной шкале:',
      paramName: 'Оценка эффективности тренировки',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5],
    },
    {
      question: 'При желании, напиши комментарий:',
      paramName: 'Комментарий',
      answerType: 'string',
    },
  ],
};

const climbQuestions = {
  before: [
    {
      question: 'Что будем лазать?',
      paramName: 'Вид',
      answerType: 'radio',
      possibleAnswers: ['трудность', 'боулдеринг'],
    },
    {
      question:
        'Оцените самочувствие и настрой на тренировку по 10-бальной шкале:',
      paramName: 'Самочувствие и настрой',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
  ],
  after: [
    {
      question: 'Оцените эффективность тренировки по 5-бальной шкале:',
      paramName: 'Оценка эффективности тренировки',
      answerType: 'radio',
      possibleAnswers: [1, 2, 3, 4, 5],
    },
    {
      question: 'Максимальная категория на флэш?',
      paramName: 'флэш',
      answerType: 'radio',
      possibleAnswers: ['6b/6b+', '6c/6c+', '7a', '7a+', '7b', '7b+'],
    },
    {
      question: 'Максимальная категория (redpoint)?',
      paramName: 'redpoint',
      answerType: 'radio',
      possibleAnswers: ['6b/6b+', '6c/6c+', '7a', '7a+', '7b', '7b+'],
    },
    {
      question: 'Количество попыток на самый сложный топ?',
      paramName: 'Количество попыток на самый сложный топ',
      answerType: 'number',
    },
    {
      question: 'Выбери cамые слабые стороны:',
      paramName: 'Cамые слабые стороны',
      answerType: 'multiple',
      possibleAnswers: [
        'мизера',
        'пассивы',
        'нависание',
        'баланс',
        'прыжки',
        'гибкость',
        'координация/комбо',
      ],
    },
    {
      question: 'При желании, напиши комментарий:',
      paramName: 'Комментарий',
      answerType: 'string',
    },
  ],
};

userSchema.pre('save', async function (next) {
  if (!this.populated('workouts')) {
    await this.populate('workouts').execPopulate();
  }

  if (this.workouts.length === 0) {
    await new Workout({
      name: 'Бег',
      owner: this._id,
      params: {
        time: true,
        before: runQuestions.before.map((q) => new Question(q)),
        after: runQuestions.after.map((q) => new Question(q)),
      },
    }).save();

    await new Workout({
      name: 'Скалолазание',
      owner: this._id,
      params: {
        time: true,
        before: climbQuestions.before.map((q) => new Question(q)),
        after: climbQuestions.after.map((q) => new Question(q)),
      },
    }).save();
    await new Workout({
      name: 'Плавание',
      owner: this._id,
      params: {
        time: true,
        before: swimmQuestions.before.map((q) => new Question(q)),
        after: swimmQuestions.after.map((q) => new Question(q)),
      },
    }).save();
  }

  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
