const {
  Scenes: { WizardScene },
} = require('telegraf');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const User = require('../../models/user');
const answerTypes = require('../enums/answerTypes');
const Workout = require('../../models/workout');
const { Question } = require('../../models/question');

const MAX_NAME_LENGTH = 64;
const MAX_QUESTION_LENGTH = 256;
const MAX_PARAMNAME_LENGTH = 256;
const MAX_ANSWER_LENGTH = 64;

const enter = async (ctx, { silent }) => {
  ctx.scene.state = {};
  ctx.wizard.steps.splice(1, ctx.wizard.steps.length);

  console.log({ cursor: ctx.wizard.cursor });

  if (silent) {
    await ctx.reply(`Введите название тренировки:`, keyboards.exit_keyboard);
    ctx.wizard.steps.push(nameHandler);
    return ctx.wizard.next();
  }

  await ctx.reply(
    `Отлично! Давай создадим новую тренировку.\n Если процесс создания вызовет сложности, используй команду /help для просмотра инструкций.`
  );

  await ctx.reply(
    `Для начала, введи название тренировки:`,
    keyboards.exit_keyboard
  );

  ctx.wizard.steps.push(nameHandler);

  return ctx.wizard.next();
};

const nameHandler = async (ctx) => {
  const name = ctx.message.text.trim();

  if (name.length > MAX_NAME_LENGTH) {
    return await ctx.reply(
      `Это название слишком длинное, попробуй сократить до ${MAX_NAME_LENGTH} символов`,
      keyboards.exit_keyboard
    );
  }

  ctx.scene.state.workoutName = name;
  console.log(ctx.wizard.cursor);
  console.log(ctx.wizard.steps);
  ctx.wizard.steps.push(timeHandler);
  ctx.wizard.next();
  ctx.scene.state.isBackAllowed = true;

  return await ctx.reply(
    `Хорошо. Запоминать ли мне длительность тренировки?`,
    keyboards.alert({
      yes: true,
      no: true,
      back: true,
      cancel: true,
    })
  );
};

const timeHandler = async (ctx) => {
  const answer = ctx.message.text.trim();
  ctx.scene.state.isBackAllowed = true;

  if (answer === buttons.yes || answer === buttons.no) {
    ctx.scene.state.time = answer === buttons.yes;
    ctx.scene.state.isBeforeDone = false;
    ctx.scene.state.before = [];
    ctx.scene.state.after = [];
    ctx.wizard.next();
    ctx.wizard.steps.push(questionHandler);

    return await ctx.replyWithHTML(
      `Хорошо.

Теперь можно сконфигурировать сбор параметров <b>ДО</b> тренировки.
Для этого составим список вопросов, который я буду задавать Вам <b>ДО</b> начала тренировки, каждому вопросу будет соответствовать один параметр заданного типа.

<b><i>Например:</i></b>
<b>Вопрос:</b> <i>Оцените ваше самочувствие и настрой на тренировку по 5 бальной шкале</i>
<b>Параметр:</b> <i>Самочувствие и настрой</i>
<b>Тип ответа:</b> <i>Выбор варианта</i>
<b>Варианты ответа:</b> <i>1,2,3,4,5</i>

Введите текст первого вопроса (или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b>, если вопросы <b>ДО</b> тренировки задавать не нужно)`,
      {
        reply_markup: keyboards.makeAnswersKeyboard(null, {
          back: true,
          next: true,
          cancel: true,
        }).reply_markup,
      }
    );
  }

  return await ctx.reply(
    `Я вас не понял. Попробуйте воспользоваться клавиатурой`,
    keyboards.alert({
      yes: true,
      no: true,
      back: true,
      cancel: true,
    })
  );
};

const questionHandler = async (ctx) => {
  const text = ctx.message.text.trim();

  if (text === buttons.next) {
    return newQuestionHandler(ctx);
  }

  if (text.length > MAX_QUESTION_LENGTH) {
    return await ctx.reply(
      `Максимальная длина вопроса: ${MAX_QUESTION_LENGTH} символов. Попробуйте сократить вопрос и введит его ещё раз:`,
      keyboards.exit_keyboard
    );
  }

  const { isBeforeDone } = ctx.scene.state;
  if (isBeforeDone) {
    ctx.scene.state.after.push({
      question: text,
    });
  } else {
    ctx.scene.state.before.push({
      question: text,
    });
  }

  ctx.wizard.steps.push(paramNameHandler);
  ctx.wizard.next();
  ctx.scene.state.isBackAllowed = true;

  return await ctx.reply(
    `Хорошо. Теперь введите название параметра, который будет привязан к этому вопросу.`,
    keyboards.makeAnswersKeyboard(null, {
      back: true,
      cancel: true,
    })
  );
};

const paramNameHandler = async (ctx) => {
  const paramName = ctx.message.text.trim();

  if (paramName.length > MAX_PARAMNAME_LENGTH) {
    return await ctx.reply(
      `Максимальная длина имени параметра: ${MAX_PARAMNAME_LENGTH} символов. Попробуйте сократить имя и введит его ещё раз:`,
      keyboards.exit_keyboard
    );
  }

  const { isBeforeDone } = ctx.scene.state;
  if (isBeforeDone) {
    const { after } = ctx.scene.state;
    after[after.length - 1].paramName = paramName;
  } else {
    const { before } = ctx.scene.state;
    before[before.length - 1].paramName = paramName;
  }

  ctx.wizard.steps.push(answerTypeHandler);
  ctx.wizard.next();
  return await ctx.reply(
    `Хорошо. Теперь выберите тип ответа (параметра) для введённого вопроса:`,
    keyboards.answerTypes
  );
};

const answerTypeHandler = async (ctx) => {
  const { isBeforeDone } = ctx.scene.state;
  const questionCollection = isBeforeDone
    ? ctx.scene.state.after
    : ctx.scene.state.before;

  const answerType = ctx.message.text.trim();
  let flag = false;

  switch (answerType) {
    case buttons.answerTypeString:
      questionCollection[questionCollection.length - 1].answerType =
        answerTypes.STRING;
      break;
    case buttons.answerTypeNumber:
      questionCollection[questionCollection.length - 1].answerType =
        answerTypes.NUMBER;
      break;
    case buttons.answerTypeRadio:
      questionCollection[questionCollection.length - 1].answerType =
        answerTypes.RADIO;
      flag = !flag;
      break;
    case buttons.answerTypeMultiple:
      questionCollection[questionCollection.length - 1].answerType =
        answerTypes.MULTIPLE;
      flag = !flag;
      break;

    default:
      return await ctx.reply(
        `Введено неправильное значение, воспользуйтесь клавиатурой:`,
        keyboards.answerTypes
      );
  }

  if (flag) {
    ctx.wizard.steps.push(possibleAnswersHandler);
    ctx.wizard.next();
    ctx.scene.state.isBackAllowed = true;

    return await ctx.reply(
      `Перечислите возможные варианты ответа через запятую:`,
      keyboards.makeAnswersKeyboard(null, {
        back: true,
        cancel: true,
      })
    );
  }

  ctx.wizard.steps.push(newQuestionHandler);
  ctx.wizard.next();
  return await ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован.
Если хотите дабавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, нажмите кнопку <b>${buttons.addQuestion.toUpperCase()}</b>.
Или нажмите кнопку <b>${buttons.next.toUpperCase()}</b> для продолжения.`,
    {
      reply_markup: keyboards.makeAnswersKeyboard([buttons.addQuestion], {
        next: true,
        cancel: true,
      }).reply_markup,
    }
  );
};

const possibleAnswersHandler = async (ctx) => {
  const text = ctx.message.text.trim();
  const answers = text.split(',').map((a) => a.trim());

  if (answers.length <= 2) {
    ctx.scene.state.isBackAllowed = true;
    return await ctx.reply(
      `Должно быть как минимум 2 варианта. Перечислите возможные варианты ответа через запятую:`,
      keyboards.makeAnswersKeyboard(null, {
        back: true,
        cancel: true,
      })
    );
  }

  if (answers.some((answer) => answer.length > MAX_ANSWER_LENGTH)) {
    ctx.scene.state.isBackAllowed = true;
    return await ctx.reply(
      `Варианты ответы должны быть длиной не более ${MAX_ANSWER_LENGTH} символов. Попробуйте сократить их и перечислите новые возможные варианты ответа через запятую:`,
      keyboards.makeAnswersKeyboard(null, {
        back: true,
        cancel: true,
      })
    );
  }

  const { isBeforeDone } = ctx.scene.state;
  const questionCollection = isBeforeDone
    ? ctx.scene.state.after
    : ctx.scene.state.before;

  questionCollection[questionCollection.length - 1].possibleAnswers = answers;
  ctx.wizard.steps.push(newQuestionHandler);
  ctx.wizard.next();
  ctx.scene.state.isBackAllowed = false;

  return await ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован!
Если хотите дабавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, нажмите кнопку <b><i>${buttons.addQuestion.toUpperCase()}</i></b>.
Или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения.`,
    {
      reply_markup: keyboards.makeAnswersKeyboard([buttons.addQuestion], {
        // back: true,
        next: true,
        cancel: true,
      }).reply_markup,
    }
  );
};

const newQuestionHandler = async (ctx) => {
  const text = ctx.message.text.trim();
  ctx.scene.state.isBackAllowed = false;

  switch (text) {
    case buttons.next:
      if (!ctx.scene.state.isBeforeDone) {
        ctx.scene.state.isBeforeDone = true;
        ctx.wizard.next();
        ctx.wizard.steps.push(questionHandler);

        return await ctx.replyWithHTML(
          `Хорошо. Аналогично, можно сконфигурировать сбор параметров <b>ПОСЛЕ</b> тренировки.
Введите текст первого вопроса (или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b>, если вопросы <b>ПОСЛЕ</b> тренировки задавать не нужно)`,
          {
            reply_markup: keyboards.makeAnswersKeyboard(null, {
              // back: true,
              next: true,
              cancel: true,
            }).reply_markup,
          }
        );
      }
      return ctx.scene.leave();

    case buttons.addQuestion:
      const { isBeforeDone } = ctx.scene.state;
      ctx.wizard.next();
      ctx.wizard.steps.push(questionHandler);
      return await ctx.replyWithHTML(
        `Введите текст следующего вопроса (или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения)`,
        {
          reply_markup: keyboards.makeAnswersKeyboard(null, {
            // back: true,
            next: true,
            cancel: true,
          }).reply_markup,
        }
      );

    default:
      return await ctx.reply(
        `Не понял. Попробуйте воспользоваться клавиатурой и выбрать нужный вариант:`,
        keyboards.makeAnswersKeyboard([buttons.addQuestion], {
          next: true,
          cancel: true,
        })
      );
  }
};

const createWorkout = new WizardScene(`createWorkout`, enter);

createWorkout.leave(async (ctx) => {
  if (ctx.message.text.trim() === buttons.cancel) {
    return ctx.reply(
      `Создание тренировки отменено!`,
      keyboards.remove_keyboard
    );
  }

  const { workoutName, before, after, time } = ctx.scene.state;
  const beforeQuestions = before.map((q) => new Question(q));
  const afterQuestions = after.map((q) => new Question(q));

  let { user } = ctx.session;
  if (!user) {
    user = await User.findOne({ tgId: ctx.from.id });
  }

  await new Workout({
    name: workoutName,
    params: {
      time,
      before: beforeQuestions,
      after: afterQuestions,
    },
    owner: user._id,
  }).save();

  await ctx.reply(
    `Отлично! Тренировка сохранена и доступна для выбора в общем каталоге:`,
    keyboards.remove_keyboard
  );
  return ctx.scene.enter(`chouseWorkout`); //TODO
});

createWorkout.hears(buttons.back, (ctx) => {
  if (!ctx.scene.state.isBackAllowed) {
    return;
  }

  const step = ctx.wizard.cursor - 2;
  if (step <= 0) {
    ctx.wizard.selectStep(0);
    return enter(ctx, { silent: true });
  }
  ctx.wizard.selectStep(step);
  console.log({ cursor: ctx.wizard.cursor });
  ctx.wizard.steps.splice(ctx.wizard.cursor + 1, ctx.wizard.steps.length);
  console.log({ steps: ctx.wizard.steps });

  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
});

module.exports = createWorkout;
