const {
  Scenes: { WizardScene },
} = require('telegraf');

const { Question } = require('../../models/question');
const Workout = require('../../models/workout');
const answerTypes = require('../enums/answerTypes');
const scenes = require('../enums/scenes');
const commands = require('../enums/commands');
const keyboardMarkup = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');

const {
  MAX_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_PARAMNAME_LENGTH,
  MAX_ANSWER_LENGTH,
} = require('../config/constants');

const enter = async (ctx, { silent }) => {
  ctx.scene.state = {};
  ctx.wizard.steps.splice(1, ctx.wizard.steps.length);

  if (silent) {
    await ctx.reply(`Введите название тренировки:`, keyboardMarkup.cancelBtn);
    ctx.wizard.steps.push(nameHandler);
    return ctx.wizard.next();
  }

  await ctx.reply(
    `Отлично! Давай создадим новую конфигурацию для тренировок.\n Если процесс создания вызовет сложности, используй команду ${commands.HELP} для просмотра инструкций.`
  );

  await ctx.reply(
    `Для начала, введи название тренировки:`,
    keyboardMarkup.cancelBtn
  );

  ctx.wizard.steps.push(nameHandler);

  return ctx.wizard.next();
};

const nameHandler = async (ctx) => {
  const name = ctx.message.text.trim();

  if (name.length > MAX_NAME_LENGTH) {
    return ctx.reply(
      `Это название слишком длинное, попробуй сократить до ${MAX_NAME_LENGTH} символов`,
      keyboardMarkup.cancelBtn
    );
  }

  ctx.scene.state.workoutName = name;
  ctx.wizard.steps.push(timeHandler);
  ctx.wizard.next();
  ctx.scene.state.isBackAllowed = true;

  return ctx.reply(
    `Хорошо. Запоминать ли мне длительность тренировки?`,
    keyboardMarkup.alert({
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

    return ctx.replyWithHTML(
      `Хорошо.

Теперь можно сконфигурировать сбор параметров <b>ДО</b> тренировки.
Для этого составим список вопросов, который я буду задавать тебе <b>ДО</b> начала тренировки и <b>ПОСЛЕ</b> её окончания, каждому вопросу будет соответствовать один параметр заданного типа. Начнём с конфигурации вопросов <b>ДО:</b>

<b><i>Пример конфигурации:</i></b>
<b>Текст вопроса:</b> <i>Оцените своё самочувствие и настрой на тренировку по 5-ти бальной шкале</i>
<b>Название параметра:</b> <i>Самочувствие и настрой</i>
<b>Тип ответа:</b> <i>Выбор варианта</i>
<b>Варианты ответа:</b> <i>1,2,3,4,5</i>

Итак, введи текст первого вопроса (или используй кнопку <b><i>${buttons.next.toUpperCase()}</i></b>, если вопросы <b>ДО</b> тренировки задавать не нужно)`,
      {
        reply_markup: keyboardMarkup.make([
          [buttons.back, buttons.next],
          [buttons.cancel],
        ]).reply_markup,
      }
    );
  }

  return ctx.reply(
    `Я не понял. Попробуйте воспользоваться клавиатурой`,
    keyboardMarkup.alert({
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
    return ctx.reply(
      `Максимальная длина вопроса: ${MAX_QUESTION_LENGTH} символов. Попробуйте сократить вопрос и введит его ещё раз:`,
      keyboardMarkup.cancelBtn
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

  return ctx.reply(
    `Хорошо. Теперь введи название параметра, который будет привязан к этому вопросу. Это название будет использовано в сводной таблице по сбору статистики.`,
    keyboardMarkup.make([[buttons.back], [buttons.cancel]])
  );
};

const paramNameHandler = async (ctx) => {
  const paramName = ctx.message.text.trim();

  if (paramName.length > MAX_PARAMNAME_LENGTH) {
    return ctx.reply(
      `Максимальная длина имени параметра: ${MAX_PARAMNAME_LENGTH} символов. Попробуй сократить имя и введит его ещё раз:`,
      keyboardMarkup.cancelBtn
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
  return ctx.reply(
    `Хорошо. Теперь выбери тип ответа (параметра) для введённого вопроса:`,
    keyboardMarkup.answerTypes
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
      return ctx.reply(
        `Введено неправильное значение, воспользуйтесь клавиатурой:`,
        keyboardMarkup.answerTypes
      );
  }

  if (flag) {
    ctx.wizard.steps.push(possibleAnswersHandler);
    ctx.wizard.next();
    ctx.scene.state.isBackAllowed = true;

    return ctx.reply(
      `Ок. Теперь перечисли возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.back], [buttons.cancel]])
    );
  }

  ctx.wizard.steps.push(newQuestionHandler);
  ctx.wizard.next();
  return ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован.
Если нужно добавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, используй кнопку <b>${buttons.addQuestion.toUpperCase()}</b>.
Или нажми кнопку <b>${buttons.next.toUpperCase()}</b> для продолжения.`,
    {
      reply_markup: keyboardMarkup.combineAndMake([buttons.addQuestion], {
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
    return ctx.reply(
      `Должно быть как минимум 2 варианта. Перечисли возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.back], [buttons.cancel]])
    );
  }

  if (answers.some((answer) => answer.length > MAX_ANSWER_LENGTH)) {
    ctx.scene.state.isBackAllowed = true;
    return ctx.reply(
      `Варианты ответы должны быть длиной не более ${MAX_ANSWER_LENGTH} символов. Попробуй сократить их и перечисли новые возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.back], [buttons.cancel]])
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

  return ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован!
Если нужно добавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, используй кнопку <b><i>${buttons.addQuestion.toUpperCase()}</i></b>.
Или нажми кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения.`,
    {
      reply_markup: keyboardMarkup.combineAndMake([buttons.addQuestion], {
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

        return ctx.replyWithHTML(
          `Хорошо. Перейдём к настройке параметров <b>ПОСЛЕ</b> тренировки. Тут всё аналогично.
Введи текст первого вопроса (или используй кнопку <b><i>${buttons.next.toUpperCase()}</i></b>, если вопросы <b>ПОСЛЕ</b> тренировки задавать не нужно)`,
          {
            reply_markup: keyboardMarkup.make([
              [buttons.next],
              [buttons.cancel],
            ]).reply_markup,
          }
        );
      }
      return ctx.scene.leave();

    case buttons.addQuestion:
      const { isBeforeDone } = ctx.scene.state;
      ctx.wizard.next();
      ctx.wizard.steps.push(questionHandler);
      return ctx.replyWithHTML(
        `Введи текст следующего вопроса (или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения)`,
        {
          reply_markup: keyboardMarkup.make([[buttons.next], [buttons.cancel]])
            .reply_markup,
        }
      );

    default:
      return ctx.reply(
        `Не понял. Попробуй воспользоваться клавиатурой и выбрать нужный вариант:`,
        keyboardMarkup.combineAndMake([buttons.addQuestion], {
          next: true,
          cancel: true,
        })
      );
  }
};

const createWorkout = new WizardScene(`createWorkout`, enter);

createWorkout.leave(async (ctx) => {
  try {
    if (ctx.message.text.trim() === buttons.cancel) {
      await ctx.reply(
        `Создание тренировки отменено!
Возвращаю тебя к списку доступных тренировок:`,
        keyboardMarkup.remove()
      );
      return ctx.scene.enter(scenes.chouseWorkout);
    }
    await ctx.reply(`Сохраняю конфигурацию...`, keyboardMarkup.remove());
    const { workoutName, before, after, time } = ctx.scene.state;
    const user = await ctx.getUser();
    const workout = await new Workout({
      name: workoutName,
      params: {
        time,
        before: before.map((q) => new Question(q)),
        after: after.map((q) => new Question(q)),
      },
      owner: user._id,
    }).save();

    const spreadSheet = await ctx
      .getSpreadSheet()
      .then((s) => s.updateWorkoutSheet(workout));

    await ctx.reply(
      `Отлично! Тренировка сохранена и доступна для выбора в общем каталоге:`
    );
    return ctx.scene.enter(scenes.chouseWorkout);
  } catch (error) {
    ctx.handleError(error);
  }
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
  ctx.wizard.steps.splice(ctx.wizard.cursor + 1, ctx.wizard.steps.length);
  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
});

module.exports = createWorkout;
