const {
  Scenes: { BaseScene },
} = require('telegraf');
const { Markup } = require('telegraf');

const User = require('../../models/user');
const Workout = require('../../models/workout');

const scenes = require('./scenes');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');

const actions = {
  enter: 'enter',
  start: 'start',
  back: 'back',
  workoutClick: 'workoutClick',
  createWorkoutClick: 'createWorkoutClick',
};

const handle = (action, ctx) => {
  switch (action) {
    case actions.enter:
      return enterHandler(ctx);
    case actions.start:
      return startHandler(ctx);
    case actions.back:
      return backHandler(ctx);
    case actions.workoutClick:
      return workoutClickHandler(ctx);
    case actions.createWorkoutClick:
      return createWorkoutClickHandler(ctx);

    default:
      break;
  }
};

async function enterHandler(ctx) {
  const { action, silent } = ctx.scene.state;

  if (action) {
    return handle(action, ctx);
  }

  const markup = await keyboards.makeWorkoutKeyboard(ctx);

  // if no workouts => only one button: create
  if (markup.reply_markup.length === 1) {
    if (silent) {
      await ctx.editMessageText(`У вас нет доступных тренировок. Создайте их:`);
      return ctx.editMessageReplyMarkup(markup.reply_markup);
    }

    return ctx.reply(`У вас нет доступных тренировок. Создайте их:`, markup);
  }

  if (silent) {
    await ctx.editMessageText(`Доступные тренировки:`);
    return ctx.editMessageReplyMarkup(markup.reply_markup);
  }

  return ctx.reply(`Доступные тренировки:`, markup);
}

async function startHandler(ctx) {
  const { payload: workoutId } = ctx.getCbData();
  const workout = await Workout.findById(workoutId);
  ctx.session.handlers = getStartWorkoutHandlers(workout);

  // await ctx.scene.leave();
  await ctx.deleteMessage();

  return ctx.scene.enter(scenes.startWorkout);
}

async function backHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(scenes.chouseWorkout, { silent: true });
}

async function createWorkoutClickHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(scenes.createWorkout);
}

async function workoutClickHandler(ctx) {
  const { payload } = ctx.getCbData();
  ctx.answerCbQuery();
  await ctx.editMessageText(`Начать тренировку?`);
  return ctx.editMessageReplyMarkup({
    inline_keyboard: [
      [
        Markup.button.callback(
          'Старт',
          ctx.makeCbData({
            scene: scenes.chouseWorkout,
            action: actions.start,
            payload,
          })
        ),
      ],
      [
        Markup.button.callback(
          'Назад',
          ctx.makeCbData({
            scene: scenes.chouseWorkout,
            action: actions.back,
          })
        ),
      ],
    ],
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
    if (answerType === 'string' || answerType === 'number') {
      await ctx.reply(question, keyboards.training_keyboard);
    } else {
      const keyboard = keyboards.makeAnswersKeyboard(possibleAnswers, {
        cancel: true,
        next: true,
        back: true,
      });
      ctx.reply(question, keyboard);
    }

    if (answerType === 'multiple') {
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
      case 'string': {
        ctx.scene.state.result[paramName] = answer;
        ctx.wizard.next();
        break;
      }

      case 'number': {
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

      case 'multiple': {
        /*         if (!ctx.scene.state.result[paramName]) {
          ctx.scene.state.result[paramName] = [];
        } */

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

      case 'radio': {
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
        throw new Error('Wrong answer type!');
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

const chouseWorkout = new BaseScene(scenes.chouseWorkout);

chouseWorkout.enter((ctx) => handle(actions.enter, ctx));

chouseWorkout.on(`callback_query`, (ctx) => {
  const data = ctx.getCbData();

  if (
    ctx.session.__scenes.current &&
    ctx.session.__scenes.current === data.scene
  ) {
    ctx.answerCbQuery();
    return handle(actions[data.action], ctx);
  }

  if (data.scene) {
    ctx.scene.leave();
    ctx.answerCbQuery();
    return ctx.scene.enter(data.scene, data);
  }
});

module.exports = chouseWorkout;
