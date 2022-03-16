const {
  Scenes: { BaseScene },
} = require('telegraf');
const chouseWorkout = require('./chouseWorkout');
const keyboardMarkup = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const User = require('../../models/user');

const createUserSheet = new BaseScene(`createUserSheet`);

createUserSheet.enter(async (ctx) => {
  await ctx.reply(
    `Для работы мне нужно будет создать сводную гугл-таблицу, потребуется твой email привязанный к Google-аккаунту\n\nПожалуйста, указывай реальную почту (@gmail.com), иначе ты не получишь доступа к таблице со статистикой!`,
    keyboardMarkup.cancelBtn
  );
});

createUserSheet.on(`text`, async (ctx) => {
  const user = await User.findOne({ tgId: ctx.from.id });

  const { text } = ctx.message;

  const emailRegexp = new RegExp(
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  );

  if (text.match(emailRegexp) && text.includes(`@gmail.com`)) {
    await ctx.reply(`Отлично! Создаю таблицу... Скоро пришлю ссылку.`);

    user.email = text;

    try {
      await user.save();
      return ctx.scene.leave();
    } catch (error) {
      return ctx.reply(`Ошибка! ${error.message}/n`);
    }
  } else {
    return ctx.reply(
      `Неправильный формат email!\nПопробуйте ещё раз:`,
      keyboardMarkup.cancelBtn
    );
  }
});

createUserSheet.leave(async (ctx) => {
  if (ctx.message.text === buttons.cancel) {
    return ctx.reply(
      `Команда отменена. Для продолжения используй команду:\n/start`,
      keyboardMarkup.remove()
    );
  }
  await ctx.reply(
    `Готово! Сейчас пришлю тебе дефолтный список тренировок.\nЕсли что-то не понятно, используй команду:\n/help`,
    keyboardMarkup.remove()
  );

  return ctx.scene.enter(chouseWorkout.id);
});

module.exports = createUserSheet;
