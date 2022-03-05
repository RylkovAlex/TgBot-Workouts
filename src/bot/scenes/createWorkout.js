const {
  Scenes: { WizardScene, BaseScene },
  Telegraf,
} = require('telegraf');
const { Markup } = require('telegraf');
const scenes = require('./scenes');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const combineArrElems = require('../../utils/combineArrElems');
const Workout = require('../../models/workout');
const inlineKeyboards = require('../keyboards/inlineKeyboards');

const enter = (ctx) => {
  ctx.reply(`Let's Create workout!`);
};

const createWorkout = new WizardScene(scenes.createWorkout, enter);

/* createWorkout.on(`callback_query`, (ctx) => {
  const data = ctx.getCbData();

  ctx.scene.leave();
  ctx.answerCbQuery();
  return ctx.scene.enter(data.scene, data);
}); */

createWorkout.leave((ctx) => {
  /*   if (ctx.callbackQuery) {
    return;
  } */

  if (ctx.message?.text === buttons.cancel) {
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

createWorkout.hears(buttons.back, (ctx) => {
  const step = ctx.wizard.cursor - 3;
  if (step > 0) {
    ctx.wizard.selectStep(step);
    return ctx.wizard.steps[ctx.wizard.cursor](ctx);
  }
  ctx.wizard.back();
  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
});

module.exports = createWorkout;
