const {
  Scenes: { WizardScene },
} = require('telegraf');
const keyboardMarkup = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const scenes = require('../enums/scenes');
const answerTypes = require('../enums/answerTypes');
const { Question } = require('../../models/question');
const _ = require('lodash');

const {
  MAX_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_PARAMNAME_LENGTH,
  MAX_ANSWER_LENGTH,
} = require('../config/constants');

const enter = async (ctx) => {
  ctx.wizard.steps.splice(1, ctx.wizard.steps.length);
  ctx.wizard.cursor = 0;

  const { workout } = ctx.scene.state;

  ctx.scene.state = {
    ...ctx.scene.state,
    original: _.cloneDeep(workout),
    name: workout.name,
    time: workout.params.time,
    before: workout.params.before || [],
    after: workout.params.after || [],
    deleted: [],
  };

  await ctx.reply(
    `Выберите необходимое действие:`,
    keyboardMarkup.make([
      [buttons.editWorkout],
      [buttons.deleteWorkout],
      [buttons.cancel],
    ])
  );
  ctx.wizard.steps.push(workoutChouseActionHandler);
  return ctx.wizard.next();
};

const workoutChouseActionHandler = async (ctx) => {
  const text = ctx.message.text.trim();
  switch (text) {
    case buttons.editWorkout: {
      const { original } = ctx.scene.state;

      await ctx.replyWithHTML(
        `Старое название тренировки:
<b><i>${original.name}</i></b>

Введите новое название или нажмите <b>${buttons.next.toUpperCase()}</b> если название менять не нужно`,
        keyboardMarkup.make([[buttons.next], [buttons.cancel]])
      );
      ctx.wizard.steps.push(nameHandler);
      return ctx.wizard.next();
    }

    case buttons.deleteWorkout: {
      ctx.wizard.steps.push(workoutDeleteHandler);
      ctx.wizard.next();
      return ctx.reply(
        `Вы точно решили удалить тренировку?`,
        keyboardMarkup.alert({ yes: true, no: true, cancel: true })
      );
    }

    default:
      return ctx.reply(
        `Я вас не понял. Выберите необходимое действие:`,
        keyboardMarkup.make([
          [buttons.editWorkout],
          [buttons.deleteWorkout],
          [buttons.cancel],
        ])
      );
  }
};

const workoutDeleteHandler = async (ctx) => {
  const text = ctx.message.text.trim();

  switch (text) {
    case buttons.yes:
      ctx.scene.state.deleteWorkout = true;
      return ctx.scene.leave();
    case buttons.no: {
      return enter(ctx);
    }

    default:
      return ctx.reply(
        `Я вас не понял. Вы точно решили удалить тренировку?`,
        keyboardMarkup.alert({ yes: true, no: true, cancel: true })
      );
  }
};

const nameHandler = async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.length > MAX_NAME_LENGTH) {
    return ctx.reply(
      `Это название слишком длинное, попробуйте сократить его до ${MAX_NAME_LENGTH} символов и введите ещё раз:`,
      keyboardMarkup.make([[buttons.next], [buttons.cancel]])
    );
  }

  if (text !== buttons.next) {
    ctx.scene.state.name = text;
  }

  ctx.wizard.steps.push(timeHandler);
  ctx.wizard.next();

  return ctx.reply(
    `Хорошо. Запоминать ли мне длительность тренировки?`,
    keyboardMarkup.alert({
      yes: true,
      no: true,
      cancel: true,
    })
  );
};

const timeHandler = async (ctx) => {
  const answer = ctx.message.text.trim();

  if (answer === buttons.yes || answer === buttons.no) {
    ctx.scene.state.time = answer === buttons.yes;
    ctx.scene.state.isBeforeDone = false;
    ctx.scene.state.questionIndex = 0;
    return editQuestion(ctx);
  }

  return ctx.reply(
    `Я вас не понял. Попробуйте воспользоваться клавиатурой.`,
    keyboardMarkup.answerTypes({
      yes: true,
      no: true,
      cancel: true,
    })
  );
};

const editQuestion = async (ctx) => {
  ctx.wizard.next();
  ctx.wizard.steps.push(chouseQuestionActionHandler);

  const { isBeforeDone, questionIndex } = ctx.scene.state;

  const collection = isBeforeDone
    ? ctx.scene.state.after
    : ctx.scene.state.before;

  const question = collection[questionIndex];
  ctx.scene.state.question = question;

  if (question) {
    return ctx.replyWithHTML(
      `Хорошо. Рассмотрим ваш старый вопрос <b>${
        isBeforeDone ? 'ПОСЛЕ' : 'ДО'
      }</b> тренировки:
<b><i>${question.question}</i></b>

Выберите необходимое действие или нажмите кнопку <b>${buttons.next.toUpperCase()}</b>, если вопрос редактировать не нужно.`,
      {
        reply_markup: keyboardMarkup.combineAndMake(
          [buttons.deleteQuestion, buttons.editQuestion],
          {
            next: true,
            cancel: true,
          }
        ).reply_markup,
      }
    );
  }

  ctx.scene.state.isLast = true;
  const extra = {
    reply_markup: keyboardMarkup.combineAndMake([buttons.addQuestion], {
      next: true,
      cancel: true,
    }).reply_markup,
  };

  const answer = `Если хотите добавить вопрос ${
    isBeforeDone ? 'ПОСЛЕ' : 'ДО'
  } тренировки, нажмите на кнопку <b>${buttons.addQuestion.toUpperCase()}</b> или нажмите кнопку <b>${buttons.next.toUpperCase()}</b> для продолжения`;

  return ctx.replyWithHTML(answer, extra);
};

const chouseQuestionActionHandler = async (ctx) => {
  const text = ctx.message.text.trim();
  const { isBeforeDone, isLast } = ctx.scene.state;

  switch (text) {
    case buttons.next:
      {
        if (isLast) {
          if (isBeforeDone) {
            // END
            ctx.scene.leave();
          } else {
            ctx.scene.state.isBeforeDone = true;
            ctx.scene.state.questionIndex = 0;
            ctx.scene.state.isLast = false;

            return editQuestion(ctx);
          }
        } else {
          ctx.scene.state.questionIndex++;
          return editQuestion(ctx);
        }
      }
      break;

    case buttons.addQuestion: {
      ctx.scene.state.question = null;
      ctx.wizard.next();
      ctx.wizard.steps.push(questionHandler);
      return ctx.replyWithHTML(
        `Введите текст нового вопроса ${
          isBeforeDone ? 'ПОСЛЕ' : 'ДО'
        } тренировки или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения)`,
        {
          reply_markup: keyboardMarkup.make([[buttons.next], [buttons.cancel]])
            .reply_markup,
        }
      );
    }

    case buttons.editQuestion: {
      ctx.wizard.next();
      ctx.wizard.steps.push(questionHandler);
      const { question } = ctx.scene.state;
      return ctx.replyWithHTML(
        `Старый текст вопроса:
<b><i>${question.question}</i></b>

Введите новый текст или нажмите кнопку <b>${buttons.next.toUpperCase()}</b> если текст вопроса редактировать не нужно.`,
        {
          reply_markup: keyboardMarkup.make([[buttons.next], [buttons.cancel]])
            .reply_markup,
        }
      );
    }

    case buttons.deleteQuestion: {
      ctx.wizard.next();
      ctx.wizard.steps.push(deleteAlertHandler);
      return ctx.replyWithHTML(
        `<b>Вы уверены, что хотите удалить вопрос?</b>`,
        {
          reply_markup: keyboardMarkup.combineAndMake(
            [buttons.yes, buttons.no],
            {
              cancel: true,
            }
          ).reply_markup,
        }
      );
    }

    default:
      return ctx.reply(
        `Не понял. Попробуйте воспользоваться клавиатурой и выбрать нужный вариант:`,
        keyboardMarkup.combineAndMake([buttons.addQuestion], {
          next: true,
          cancel: true,
        })
      );
  }
};

const deleteAlertHandler = async (ctx) => {
  let text = ctx.message.text.trim();
  switch (text) {
    case buttons.yes: {
      const { question, isBeforeDone, deleted } = ctx.scene.state;
      deleted.push(question._id);
      isBeforeDone
        ? (ctx.scene.state.after = ctx.scene.state.after.filter(
            (q) => q._id !== question._id
          ))
        : (ctx.scene.state.before = ctx.scene.state.before.filter(
            (q) => q._id !== question._id
          ));

      ctx.scene.state.question = null;
      await ctx.replyWithHTML(`<b>Ваш вопрос удалён.</b>`);
      return editQuestion(ctx);
    }
    case buttons.no: {
      await ctx.replyWithHTML(`<b>Отмена удаления.</b>`);
      return editQuestion(ctx);
    }
    default:
      return ctx.replyWithHTML(
        `<b>Не понял. Вы уверены что хотите удалить вопрос?</b>`,
        {
          reply_markup: keyboardMarkup.combineAndMake(
            [buttons.yes, buttons.no],
            {
              cancel: true,
            }
          ).reply_markup,
        }
      );
  }
};

const questionHandler = async (ctx) => {
  let text = ctx.message.text.trim();
  const { question } = ctx.scene.state;

  if (text === buttons.next && !question) {
    return newQuestionHandler(ctx);
  }

  if (text.length > MAX_QUESTION_LENGTH) {
    return ctx.reply(
      `Максимальная длина вопроса: ${MAX_QUESTION_LENGTH} символов. Попробуйте сократить вопрос и введит его ещё раз:`,
      keyboardMarkup.cancelBtn
    );
  }

  if (!question) {
    const { isBeforeDone } = ctx.scene.state;
    isBeforeDone
      ? ctx.scene.state.after.push({
          question: text,
        })
      : ctx.scene.state.before.push({
          question: text,
        });
  } else if (text !== buttons.next) {
    question.question = text;
  }

  ctx.wizard.steps.push(paramNameHandler);
  ctx.wizard.next();

  const answer = question
    ? `Старое название параметра: <b><i> ${question.paramName}</i></b>
Введите новое название параметра, который будет привязан к этому вопросу или нажмите кнопку <b>${buttons.next.toUpperCase()}</b> для продолжения)`
    : `Хорошо. Теперь введите название параметра, который будет привязан к этому вопросу`;

  const btns = [[buttons.cancel]];
  if (question) {
    btns.unshift([buttons.next]);
  }

  return ctx.replyWithHTML(answer, {
    reply_markup: keyboardMarkup.make(btns).reply_markup,
  });
};

const paramNameHandler = async (ctx) => {
  const text = ctx.message.text.trim();
  const { question } = ctx.scene.state;

  if (text.length > MAX_PARAMNAME_LENGTH) {
    return ctx.reply(
      `Максимальная длина имени параметра: ${MAX_PARAMNAME_LENGTH} символов. Попробуйте сократить имя и введит его ещё раз:`,
      keyboardMarkup.cancelBtn
    );
  }

  if (!question) {
    const { isBeforeDone } = ctx.scene.state;
    const collection = isBeforeDone
      ? ctx.scene.state.after
      : ctx.scene.state.before;
    collection[collection.length - 1].paramName = text;
  } else if (text !== buttons.next) {
    question.paramName = text;
  }

  ctx.wizard.steps.push(answerTypeHandler);
  ctx.wizard.next();
  return ctx.reply(
    `Хорошо. Теперь выберите тип ответа (параметра) для введённого вопроса:`,
    keyboardMarkup.answerTypes
  );
};

const answerTypeHandler = async (ctx) => {
  const { isBeforeDone } = ctx.scene.state;
  const { question } = ctx.scene.state;

  const questionCollection = isBeforeDone
    ? ctx.scene.state.after
    : ctx.scene.state.before;

  const answerType = ctx.message.text.trim();
  let flag = false;

  switch (answerType) {
    case buttons.answerTypeString:
      question
        ? (question.answerType = answerTypes.STRING)
        : (questionCollection[questionCollection.length - 1].answerType =
            answerTypes.STRING);
      break;
    case buttons.answerTypeNumber:
      question
        ? (question.answerType = answerTypes.NUMBER)
        : (questionCollection[questionCollection.length - 1].answerType =
            answerTypes.NUMBER);
      break;
    case buttons.answerTypeRadio:
      question
        ? (question.answerType = answerTypes.RADIO)
        : (questionCollection[questionCollection.length - 1].answerType =
            answerTypes.RADIO);
      flag = !flag;
      break;
    case buttons.answerTypeMultiple:
      question
        ? (question.answerType = answerTypes.MULTIPLE)
        : (questionCollection[questionCollection.length - 1].answerType =
            answerTypes.MULTIPLE);
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

    return ctx.reply(
      `Перечислите возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.cancel]])
    );
  }

  if (question) {
    question.possibleAnswers = [];
    await ctx.reply(
      `Отлично. Вопрос успешно отредактирован. Идём дальше...`,
      keyboardMarkup.remove()
    );
    ctx.scene.state.question = null;
    ctx.scene.state.questionIndex++;
    return editQuestion(ctx);
  }

  ctx.wizard.steps.push(newQuestionHandler);
  ctx.wizard.next();

  return ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован. ${
      question ? JSON.stringify(question) : ''
    }
Если хотите добавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, нажмите кнопку <b>${buttons.addQuestion.toUpperCase()}</b>.
Или нажмите кнопку <b>${buttons.next.toUpperCase()}</b> для продолжения.`,
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
    return ctx.reply(
      `Должно быть как минимум 2 варианта. Перечислите возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.cancel]])
    );
  }

  if (answers.some((answer) => answer.length > MAX_ANSWER_LENGTH)) {
    return ctx.reply(
      `Варианты ответы должны быть длиной не более ${MAX_ANSWER_LENGTH} символов. Попробуйте сократить их и перечислите новые возможные варианты ответа через запятую:`,
      keyboardMarkup.make([[buttons.back], [buttons.cancel]])
    );
  }

  const { question } = ctx.scene.state;
  const { isBeforeDone } = ctx.scene.state;
  const questionCollection = isBeforeDone
    ? ctx.scene.state.after
    : ctx.scene.state.before;

  question
    ? (question.possibleAnswers = answers)
    : (questionCollection[questionCollection.length - 1].possibleAnswers =
        answers);

  if (question) {
    await ctx.reply(
      `Отлично. Вопрос успешно отредактирован. Идём дальше...`,
      keyboardMarkup.remove()
    );
    ctx.scene.state.question = null;
    ctx.scene.state.questionIndex++;
    return editQuestion(ctx);
  }

  ctx.wizard.steps.push(newQuestionHandler);
  ctx.wizard.next();

  return ctx.replyWithHTML(
    `Отлично. Вопрос сконфигурирован!
Если хотите добавить ещё один вопрос ${
      isBeforeDone ? '<b>ПОСЛЕ</b>' : '<b>ДО</b>'
    } тренировки, нажмите кнопку <b><i>${buttons.addQuestion.toUpperCase()}</i></b>.
Или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения.`,
    {
      reply_markup: keyboardMarkup.combineAndMake([buttons.addQuestion], {
        next: true,
        cancel: true,
      }).reply_markup,
    }
  );
};

const newQuestionHandler = async (ctx) => {
  const text = ctx.message.text.trim();

  switch (text) {
    case buttons.next:
      if (!ctx.scene.state.isBeforeDone) {
        ctx.scene.state.isBeforeDone = true;
        return editQuestion(ctx);
      }
      return ctx.scene.leave();

    case buttons.addQuestion:
      ctx.wizard.next();
      ctx.wizard.steps.push(questionHandler);
      return ctx.replyWithHTML(
        `Введите текст следующего вопроса (или нажмите кнопку <b><i>${buttons.next.toUpperCase()}</i></b> для продолжения)`,
        {
          reply_markup: keyboardMarkup.make([[buttons.next], [buttons.cancel]])
            .reply_markup,
        }
      );

    default:
      return ctx.reply(
        `Не понял. Попробуйте воспользоваться клавиатурой и выбрать нужный вариант:`,
        keyboardMarkup.combineAndMake([buttons.addQuestion], {
          next: true,
          cancel: true,
        })
      );
  }
};

const editWorkout = new WizardScene(`editWorkout`, enter);

editWorkout.leave(async (ctx) => {
  // If SCENE CANCELED :
  if (ctx.message.text.trim() === buttons.cancel) {
    ctx.reply(`Редактирование тренировки отменено!`, keyboardMarkup.remove());
    return ctx.scene.enter(scenes.chouseWorkout);
  }

  const {
    original: originalWorkout,
    workout,
    name,
    before,
    after,
    time,
    deleted,
  } = ctx.scene.state;

  // If WORKOUT DELETED:
  if (ctx.scene.state.deleteWorkout) {
    await Promise.all([
      workout.remove(),
      ctx
        .getSpreadSheet()
        .then((spreadSheet) => spreadSheet.deleteSheet(workout.name)),
    ]);
    await ctx.reply(`Тренировка удалена!`, keyboardMarkup.remove());
    return ctx.scene.enter(scenes.chouseWorkout);
  }

  // If SOME QUESTION DELETED:
  if (deleted.length > 0) {
    const deletedIds = deleted.map((q) => q.toString());
    await workout.populate('sessions').execPopulate();
    workout.sessions.forEach((s) => {
      s.answers = s.answers.filter((a) => {
        return !deletedIds.includes(a.question.toString());
      });
      s.save();
    });
  }

  const beforeQuestions = before.map((q) => new Question(q));
  const afterQuestions = after.map((q) => new Question(q));

  workout.params.time = time;
  workout.name = name;
  workout.params.before = beforeQuestions;
  workout.params.after = afterQuestions;

  const spreadSheet = await ctx.getSpreadSheet();
  await workout.save().then((w) => spreadSheet.updateWorkoutSheet(w));

  await ctx.reply(
    `Отлично! Тренировка сохранена и доступна для выбора в общем каталоге:`,
    keyboardMarkup.remove()
  );
  return ctx.scene.enter(scenes.chouseWorkout);
});

module.exports = editWorkout;
