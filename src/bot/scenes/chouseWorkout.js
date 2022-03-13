const {
  Scenes: { BaseScene },
} = require('telegraf');

const Workout = require('../../models/workout');

const startWorkout = require('./startWorkout');
const createWorkout = require('./createWorkout');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const actions = require('../enums/actions');
const answerTypes = require('../enums/answerTypes');

const chouseWorkout = new BaseScene(`chouseWorkout`);

// Scene action handler:
chouseWorkout.handle = (action, ctx) => {
  switch (action) {
    case actions.ENTER:
      return enterHandler(ctx);
    case actions.START:
      return startHandler(ctx);
    case actions.BACK:
      return backHandler(ctx);
    case actions.WORKOUT:
      return workoutClickHandler(ctx);
    case actions.CREATEWORKOUT:
      return createWorkoutClickHandler(ctx);

    default:
      throw new Error(
        `Wrong action: ${action} is not supported by ${chouseWorkout.id} Scene`
      );
  }
};

// Action Handlers

async function enterHandler(ctx) {
  const { action, silent } = ctx.scene.state;

  if (action) {
    return chouseWorkout.handle(action, ctx);
  }

  const keyboardMarkup = await keyboards.makeWorkoutKeyboard(
    ctx,
    chouseWorkout.id
  );

  // TODO: if no workouts => only one button: create
  if (keyboardMarkup.reply_markup.length === 1) {
    if (silent) {
      return ctx.editMessageText(
        `У вас нет доступных тренировок. Создайте их:`,
        {
          reply_markup: keyboardMarkup.reply_markup,
        }
      );
    }

    return ctx.reply(
      `У вас нет доступных тренировок. Создайте их:`,
      keyboardMarkup
    );
  }

  if (silent) {
    return ctx.editMessageText(`Доступные тренировки:`, {
      reply_markup: keyboardMarkup.reply_markup,
    });
  }

  return ctx.reply(`Доступные тренировки:`, keyboardMarkup);
}

async function startHandler(ctx) {
  const { payload: workoutId } = ctx.getCbData();
  const workout = await Workout.findById(workoutId);

  if (!workout) {
    ctx.answerCbQuery();
    await ctx.reply(`Данная тренировка больше не доступна!`);
    return ctx.scene.enter(chouseWorkout.id, { silent: true });
  }
  ctx.session.handlers = getStartWorkoutHandlers(workout);

  await ctx.deleteMessage();
  return ctx.scene.enter(startWorkout.id);
}

async function backHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(chouseWorkout.id, { silent: true });
}

async function createWorkoutClickHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(createWorkout.id);
}

async function workoutClickHandler(ctx) {
  ctx.answerCbQuery();
  const keyboardMarkup = keyboards.makeStartTrainingAlert(
    ctx,
    chouseWorkout.id
  );
  return ctx.editMessageText(`Начать тренировку?`, {
    reply_markup: keyboardMarkup.reply_markup,
  });
}

function getStartWorkoutHandlers(workout) {
  const { time, before, after } = workout.params;
  const handlers = [];

  before.forEach((q) => handlers.push(...getQuestionHandlers(q)));
  handlers.push(...getTimeHandlers(time));
  after.forEach((q) => handlers.push(...getQuestionHandlers(q)));

  return handlers;
}

function getQuestionHandlers(q) {
  const { question, paramName, answerType, possibleAnswers } = q;

  const questionHandler = async (ctx) => {
    if (
      answerType === answerTypes.STRING ||
      answerType === answerTypes.NUMBER
    ) {
      await ctx.reply(question, keyboards.training_keyboard);
    } else {
      const keyboard = keyboards.makeAnswersKeyboard(possibleAnswers, {
        cancel: true,
        next: true,
        back: true,
      });
      ctx.reply(question, keyboard);
    }

    if (answerType === answerTypes.MULTIPLE) {
      ctx.scene.state.result[paramName] = [];
    }

    return ctx.wizard.next();
  };

  const answerHandler = async (ctx) => {
    const answer = ctx.message.text.trim();
    if (answer === buttons.next) {
      ctx.wizard.next();
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }

    switch (answerType) {
      case answerTypes.STRING: {
        ctx.scene.state.result[paramName] = answer;
        ctx.wizard.next();
        break;
      }

      case answerTypes.NUMBER: {
        const number = Number(answer.replace(/,/g, '.'));
        if (isNaN(number)) {
          return ctx.reply(
            `Параметром должно быть число. Попробуем ещё раз. \n${question}`,
            keyboards.training_keyboard
          );
        } else {
          ctx.scene.state.result[paramName] = number;
          ctx.wizard.next();
          break;
        }
      }

      case answerTypes.MULTIPLE: {
        const givenAnswers = ctx.scene.state.result[paramName];

        if (possibleAnswers.includes(answer)) {
          givenAnswers.push(answer);
          const updatedPossibleAnswers = possibleAnswers.filter(
            (a) => !givenAnswers.includes(a)
          );

          return ctx.reply(
            `Можно выбрать несколько вариантов или нажать "далее" для продолжения`,
            keyboards.makeAnswersKeyboard(updatedPossibleAnswers, {
              cancel: true,
              next: true,
              back: true,
            })
          );
        }

        return ctx.reply(
          `Введён неверный ответ. Выберите один из вариантов: \n`,
          keyboards.makeAnswersKeyboard(possibleAnswers, {
            cancel: true,
            next: true,
            back: true,
          })
        );
      }

      case answerTypes.RADIO: {
        if (possibleAnswers.includes(answer)) {
          ctx.scene.state.result[paramName] = answer;
          ctx.wizard.next();
          break;
        }
        return ctx.reply(
          `Введён неверный ответ. Выберите один из вариантов: \n`,
          keyboards.makeAnswersKeyboard(possibleAnswers, {
            cancel: true,
            next: true,
            back: true,
          })
        );
      }

      default:
        throw new Error(`Wrong answer type: ${answerType}`);
    }
    return ctx.wizard.steps[ctx.wizard.cursor](ctx);
  };

  return [questionHandler, answerHandler];
}

function getTimeHandlers(time) {
  if (!time) {
    const firstHandler = (ctx) => {
      ctx.reply(
        `Тренировочная сессия запущена. После тренировки нажмите "далее"`,
        keyboards.training_keyboard
      );
      return ctx.wizard.next();
    };
    const secondHandler = (ctx) => {
      const text = ctx.message.text.trim();
      if (text === buttons.next) {
        ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      } else {
        return ctx.reply(
          `Тренирока в процессе. После тренировки нажмите "далее"`,
          keyboards.training_keyboard
        );
      }
    };
    return [firstHandler, secondHandler];
  }

  const firstHandler = (ctx) => {
    ctx.scene.state.startTime = Date.now();
    ctx.reply(
      `Тренировочная сессия запущена. После тренировки нажмите "далее"`,
      keyboards.training_keyboard
    );
    return ctx.wizard.next();
  };
  const secondHandler = async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === buttons.next) {
      const { startTime } = ctx.scene.state;
      const finishTime = Date.now();
      const time = (finishTime - startTime) / 60000;

      ctx.scene.state.result.time = time;
      ctx.wizard.next();
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    } else {
      return ctx.reply(
        `Тренировка в процессе. После тренировки нажмите "далее"`,
        keyboards.training_keyboard
      );
    }
  };

  return [firstHandler, secondHandler];
}

chouseWorkout.enter((ctx) => chouseWorkout.handle(actions.ENTER, ctx));

module.exports = chouseWorkout;
