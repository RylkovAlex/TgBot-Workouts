const {
  Scenes: { BaseScene },
} = require('telegraf');

const Workout = require('../../models/workout');

const startWorkout = require('./startWorkout');
const createWorkout = require('./createWorkout');
const editWorkout = require('./editWorkout');
const keyboardMarkup = require('../keyboards/keyboards');
const actions = require('../enums/actions');
const buttons = require('../keyboards/buttons');

const chouseWorkout = new BaseScene(`chouseWorkout`);

chouseWorkout.enter((ctx) => chouseWorkout.handle(actions.ENTER, ctx));

// Action handler for scene:
chouseWorkout.handle = (action, ctx) => {
  switch (action) {
    case actions.ENTER:
      return enterHandler(ctx);
    case actions.START:
      return startHandler(ctx);
    case actions.BACK:
      return backHandler(ctx);
    case actions.WORKOUT_CLICK_TO_START:
      return workoutClickToStartHandler(ctx);
    case actions.WORKOUT_CLICK_TO_EDIT:
      return workoutClickToEditHandler(ctx);
    case actions.CREATE_WORKOUT:
      return createWorkoutClickHandler(ctx);
    case actions.EDIT_WORKOUT:
      return editWorkoutClickHandler(ctx);

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

  const reply_markup = await keyboardMarkup
    .inline_workouts(ctx, {
      sceneId: chouseWorkout.id,
      action: actions.WORKOUT_CLICK_TO_START,
      addBtns: { edit: true, create: true },
    })
    .then((markup) => markup?.reply_markup);

  if (!reply_markup) {
    const reply_markup = keyboardMarkup.makeInline(
      [[{ name: buttons.createWorkout, action: actions.CREATE_WORKOUT }]],
      {
        ctx,
        sceneId: chouseWorkout.id,
      }
    ).reply_markup;

    return silent
      ? ctx.editMessageText(`У вас нет доступных тренировок. Создайте их:`, {
          reply_markup,
        })
      : ctx.reply(`У вас нет доступных тренировок. Создайте их:`, {
          reply_markup,
        });
  }

  return silent
    ? ctx.editMessageText(`Доступные тренировки:`, {
        reply_markup,
      })
    : ctx.reply(`Доступные тренировки:`, { reply_markup });
}

async function backHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(chouseWorkout.id, { silent: true });
}

async function editWorkoutClickHandler(ctx) {
  const reply_markup = await keyboardMarkup
    .inline_workouts(ctx, {
      sceneId: chouseWorkout.id,
      action: actions.WORKOUT_CLICK_TO_EDIT,
      addBtns: { back: true },
    })
    .then((markup) => markup.reply_markup);
  ctx.answerCbQuery();

  // TODO: if no workouts => only one button: create
  if (reply_markup.length === 1) {
    return ctx.editMessageText(`У вас нет доступных тренировок. Создайте их:`, {
      reply_markup,
    });
  }

  return ctx.editMessageText(`Выберите тренировку для редактирования:`, {
    reply_markup,
  });
}

async function createWorkoutClickHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(createWorkout.id);
}

async function workoutClickToStartHandler(ctx) {
  const reply_markup = keyboardMarkup.inline_beforeStartWorkout(
    ctx,
    chouseWorkout.id
  ).reply_markup;
  return ctx.editMessageText(`Начать тренировку?`, {
    reply_markup,
  });
}

async function workoutClickToEditHandler(ctx) {
  const { payload: workoutId } = ctx.getCbData();
  ctx.answerCbQuery();

  const workout = await Workout.findById(workoutId);

  if (!workout) {
    ctx.answerCbQuery();
    //TODO: some reaction if no workout?
    return editWorkoutClickHandler(ctx);
  }

  await ctx.deleteMessage();
  return ctx.scene.enter(editWorkout.id, { workout });
}

async function startHandler(ctx) {
  const { payload: workoutId } = ctx.getCbData();
  const workout = await Workout.findById(workoutId);

  if (!workout) {
    ctx.answerCbQuery();
    await ctx.reply(`Данная тренировка больше не доступна!`);
    return ctx.scene.enter(chouseWorkout.id, { silent: true });
  }

  await ctx.deleteMessage();
  return ctx.scene.enter(startWorkout.id, { workout });
}

module.exports = chouseWorkout;
