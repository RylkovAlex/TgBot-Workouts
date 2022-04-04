const mongoose = require('mongoose');
const Workout = require('./workout');
const { Question } = require('./question');
const answerTypes = require('../bot/enums/answerTypes');

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
    spreadSheetId: {
      type: String,
      trim: true,
    },
    _errors: {
      type: Array,
      default: [],
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
      isNew: true,
    }).save());

  return user;
};

const runQuestions = {
  before: [
    {
      question:
        'Оцените самочувствие и настрой на тренировку по 10-бальной шкале:',
      paramName: 'Самочувствие и настрой',
      answerType: answerTypes.RADIO,
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      question: 'При желании оставь комментарий до тренировки:',
      paramName: 'Комментарий до',
      answerType: answerTypes.STRING,
    },
  ],
  after: [
    {
      question: 'Количество киллометров:',
      paramName: 'Количество киллометров',
      answerType: answerTypes.NUMBER,
    },
    {
      question: 'Кака была погода? Выбери подходящие варианты:',
      paramName: 'Погодные условия',
      answerType: answerTypes.MULTIPLE,
      possibleAnswers: ['солнечно', 'облачно', 'дождь', 'снег', 'ветер'],
    },
    {
      question: 'Какой был средний пульс на пробежке?',
      paramName: 'Средний пульс',
      answerType: answerTypes.NUMBER,
    },
    {
      question: 'Оцените эффективность тренировки по 10-бальной шкале:',
      paramName: 'Оценка эффективности тренировки',
      answerType: answerTypes.RADIO,
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      question: 'При желании, напиши комментарий:',
      paramName: 'Комментарий после',
      answerType: answerTypes.STRING,
    },
  ],
};

const climbQuestions = {
  before: [
    {
      question: 'Что будем лазать?',
      paramName: 'Вид',
      answerType: answerTypes.RADIO,
      possibleAnswers: ['трудность', 'боулдеринг'],
    },
    {
      question:
        'Оцени своё самочувствие и настрой на тренировку по 10-бальной шкале:',
      paramName: 'Самочувствие и настрой',
      answerType: answerTypes.RADIO,
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      question: 'При желании оставь комментарий до тренировки:',
      paramName: 'Комментарий до',
      answerType: answerTypes.STRING,
    },
  ],
  after: [
    {
      question: 'Оцените эффективность тренировки по 10-бальной шкале:',
      paramName: 'Эффективность тренировки',
      answerType: answerTypes.RADIO,
      possibleAnswers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    },
    {
      question: 'Сколько трасс пролез? (если помнишь)',
      paramName: 'количество трасс',
      answerType: answerTypes.NUMBER,
    },
    {
      question: 'Максимальная категория на флэш?',
      paramName: 'флэш',
      answerType: answerTypes.RADIO,
      possibleAnswers: [
        '6a/6a+',
        '6b/6b+',
        '6c/6c+',
        '7a/7a+',
        '7b/7b+',
        '8a/8a+',
      ],
    },
    {
      question: 'Максимальная категория насосом?',
      paramName: 'насосом',
      answerType: answerTypes.RADIO,
      possibleAnswers: [
        '6a/6a+',
        '6b/6b+',
        '6c/6c+',
        '7a/7a+',
        '7b/7b+',
        '8a/8a+',
      ],
    },
    {
      question: 'Количество попыток на самый сложный топ?',
      paramName: 'Количество попыток на самый сложный топ',
      answerType: answerTypes.NUMBER,
    },
    {
      question: 'Выбери cамые СЛАБЫЕ стороны сегодня:',
      paramName: 'Cамые слабые стороны',
      answerType: answerTypes.MULTIPLE,
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
      question: 'Выбери cамые СИЛЬНЫЕ стороны сегодня:',
      paramName: 'Cамые сильные стороны',
      answerType: answerTypes.MULTIPLE,
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
      question: 'ОФП делал?',
      paramName: 'офп',
      answerType: answerTypes.RADIO,
      possibleAnswers: ['да', 'нет'],
    },
    {
      question: 'При желании, напиши комментарий по тренировке:',
      paramName: 'Комментарий',
      answerType: answerTypes.STRING,
    },
  ],
};

userSchema.pre('save', async function (next) {
  if (!this.populated('workouts')) {
    await this.populate('workouts').execPopulate();
  }

  if (this.workouts.length === 0 && this.isNew) {
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
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
