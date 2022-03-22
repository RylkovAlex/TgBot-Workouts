const {
  Scenes: { BaseScene },
} = require('telegraf');
const chouseWorkout = require('./chouseWorkout');
const keyboardMarkup = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const User = require('../../models/user');
const SpreadSheet = require('../../utils/spreadSheet');

const emailRegexp = new RegExp(
  /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i
);

const createUserSheet = new BaseScene(`createUserSheet`);

createUserSheet.enter(async (ctx) => {
  const { forced } = ctx.scene.state;
  const user = await ctx.getUser();
  if (forced || !user.spreadSheetId) {
    return ctx.replyWithHTML(
      `Для полноценной работы мне нужно будет создать сводную гугл-таблицу, потребуется твой email, привязанный к Google-аккаунту.

Пожалуйста, указывай реальную почту (на домене <b>gmail.com</b>), иначе ты не получишь доступа к таблице со своей статистикой тренировок!`,
      keyboardMarkup.cancelBtn
    );
  }

  return ctx.scene.leave();
});

createUserSheet.on(`text`, async (ctx) => {
  try {
    const user = await ctx.getUser();
    const email = ctx.message.text.trim();

    if (email.match(emailRegexp) && email.includes(`@gmail.com`)) {
      await ctx.reply(
        `Отлично! Создаю таблицу для сбора статистики... Скоро пришлю ссылку.`
      );

      const spreadSheet = await ctx.getSpreadSheet();

      const spreadSheetId = await spreadSheet.create({
        title: `My Workouts`,
        userEmail: user.email,
      });

      user.email = email;
      user.spreadSheetId = spreadSheetId;

      ctx.session.user = await user.save();
      await ctx.replyWithHTML(`Таблица готова:
<a href="https://docs.google.com/spreadsheets/d/${spreadSheetId}">ссылка</a>
Проверь пожалуйста свою почту и прими запрос на передачу прав владения таблицей.

Дальше она будет доступна по команде /table`);
      return ctx.scene.leave();
    } else {
      return ctx.reply(
        `Неправильный формат email!\nПопробуйте ещё раз:`,
        keyboardMarkup.cancelBtn
      );
    }
  } catch (error) {
    return ctx.reply(`Ошибка! ${error.message}`, keyboardMarkup.remove());
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
    `Сейчас пришлю тебе дефолтный список тренировок для примера.
Если что-то не понятно, используй команду:
/help`,
    keyboardMarkup.remove()
  );

  return ctx.scene.enter(chouseWorkout.id);
});

module.exports = createUserSheet;
