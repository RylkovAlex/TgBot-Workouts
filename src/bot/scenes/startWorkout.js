const {
  Scenes: { WizardScene, BaseScene },
  Telegraf,
} = require('telegraf');
const { Markup } = require('telegraf');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const combineArrElems = require('../../utils/combineArrElems');
const Workout = require('../../models/workout');
const inlineKeyboards = require('../keyboards/inlineKeyboards');

const enter = (ctx) => {
  ctx.scene.state = {
    result: {},
  };

  const { handlers } = ctx.session;
  handlers.push((ctx) => {
    ctx.scene.leave();
  });

  startWorkout.steps.splice(1, startWorkout.steps.length);
  startWorkout.steps.push(...handlers);

  ctx.wizard.next();

  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
};

const startWorkout = new WizardScene(`startWorkout`, enter);

startWorkout.leave((ctx) => {
  if (ctx.message.text === buttons.cancel) {
    return ctx.reply(
      `Тренировочная сессия отменена`,
      keyboards.remove_keyboard
    );
  }
  const { result } = ctx.scene.state;
  let resultString = '';

  for (answer in result) {
    if (
      typeof result[answer] === 'string' ||
      typeof result[answer] === 'number' ||
      result[answer].length > 0
    ) {
      resultString = `${resultString}\n${answer}: ${result[answer]}`;
    } else {
      delete result[answer];
    }
  }

  return ctx.reply(
    `Тренировочная сессия сохранена:\n${resultString}`,
    keyboards.remove_keyboard
  );
});

startWorkout.hears(buttons.back, (ctx) => {
  const step = ctx.wizard.cursor - 3;
  if (step > 0) {
    ctx.wizard.selectStep(step);
    return ctx.wizard.steps[ctx.wizard.cursor](ctx);
  }
  ctx.wizard.back();
  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
});

module.exports = startWorkout;
