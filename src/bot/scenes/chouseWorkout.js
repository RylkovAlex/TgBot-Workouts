const {
  Scenes: { BaseScene },
} = require('telegraf');

const Workout = require('../../models/workout');

const startWorkout = require('./startWorkout');
const createWorkout = require('./createWorkout');
const editWorkout = require('./editWorkout');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const actions = require('../enums/actions');
const answerTypes = require('../enums/answerTypes');

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

  const keyboardMarkup = await keyboards.makeWorkoutsKeyboard(ctx, {
    sceneId: chouseWorkout.id,
    action: actions.WORKOUT_CLICK_TO_START,
    addBtns: { edit: true, create: true },
  });

  // TODO: if no workouts => markup has only one button: create
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

async function backHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(chouseWorkout.id, { silent: true });
}

async function editWorkoutClickHandler(ctx) {
  const keyboardMarkup = await keyboards.makeWorkoutsKeyboard(ctx, {
    sceneId: chouseWorkout.id,
    action: actions.WORKOUT_CLICK_TO_EDIT,
    addBtns: { back: true },
  });
  ctx.answerCbQuery();

  // TODO: if no workouts => only one button: create
  if (keyboardMarkup.reply_markup.length === 1) {
    return await ctx.editMessageText(
      `У вас нет доступных тренировок. Создайте их:`,
      {
        reply_markup: keyboardMarkup.reply_markup,
      }
    );
  }

  return await ctx.editMessageText(`Выберите тренировку для редактирования:`, {
    reply_markup: keyboardMarkup.reply_markup,
  });
}

async function createWorkoutClickHandler(ctx) {
  ctx.answerCbQuery();
  return ctx.scene.enter(createWorkout.id);
}

async function workoutClickToStartHandler(ctx) {
  const keyboardMarkup = keyboards.makeStartTrainingAlert(
    ctx,
    chouseWorkout.id
  );
  return ctx.editMessageText(`Начать тренировку?`, {
    reply_markup: keyboardMarkup.reply_markup,
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
