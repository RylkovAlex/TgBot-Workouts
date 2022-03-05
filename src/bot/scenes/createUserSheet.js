const {
  Scenes: { BaseScene },
} = require('telegraf');
const scenes = require('./scenes');
const keyboards = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const User = require('../../models/user');

const createUserSheet = new BaseScene(scenes.createUserSheet);

createUserSheet.enter((ctx) => {
  ctx.reply(
    `Для работы мне нужно будет создать сводную гугл-таблицу, потребуется твой email привязанный к Google-аккаунту\n\nПожалуйста, указывай реальную почту (@gmail.com), иначе ты не получишь доступа к таблице со статистикой!`,
    keyboards.exit_keyboard
  );
});

createUserSheet.on(`text`, async (ctx) => {
  const user = await User.findOne({ tgId: ctx.from.id });
  console.log(user)

  const { text } = ctx.message;

  const emailRegexp = new RegExp(
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
  );

  if (text.match(emailRegexp) && text.includes(`@gmail.com`)) {
    ctx.reply(`Отлично! Создаю таблицу... Скоро пришлю ссылку.`);

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
      keyboards.exit_keyboard
    );
  }
});

createUserSheet.leave((ctx) => {
  if (ctx.message.text === buttons.cancel) {
    return ctx.reply(
      `Команда отменена. Для продолжения используй команду:\n/start`,
      keyboards.remove_keyboard
    );
  }
  ctx.reply(
    `Готово! Сейчас пришлю тебе дефолтный список тренировок.\nЕсли что-то не понятно, используй команду:\n/help`,
    keyboards.remove_keyboard
  );

  return ctx.scene.enter(scenes.chouseWorkout);
});

module.exports = createUserSheet;
