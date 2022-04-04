const {
  Telegraf,
  Scenes: { Stage },
  session,
  Context,
  Telegram,
} = require('telegraf');

const User = require('../models/user');
const SpreadSheet = require('../utils/spreadSheet');
const commands = require('./enums/commands');
const keyboardMarkup = require('./keyboards/keyboards');
const buttons = require('./keyboards/buttons');
const scenes = require('./scenes/scenes');
const checkChat = require('./middlewares/checkChat');
const handleStart = require('./commands/start');
const handleTable = require('./commands/table');

const stage = new Stage(Object.values(scenes), {
  sessionName: 'chatSession',
});

stage.hears(buttons.cancel, (ctx) => {
  if (ctx.session?.__scenes?.current) {
    return ctx.scene.leave();
  }
  return ctx.scene.enter(scenes.chouseWorkout.id);
});

// Works only if all scenes with callback keyboards has handle method!!!
stage.on('callback_query', (ctx) => {
  try {
    const data = ctx.getCbData();
    const { scene: sceneId, action } = data;

    if (
      ctx.session?.__scenes?.current &&
      ctx.session?.__scenes?.current === sceneId
    ) {
      ctx.answerCbQuery();
      const scene = scenes[sceneId];
      return scene.handle(action, ctx);
    }

    if (sceneId) {
      ctx.scene.leave();
      ctx.answerCbQuery();
      return ctx.scene.enter(sceneId, data);
    }
  } catch (error) {
    ctx.handleError(error, `Ошибка обработки кнопки!`);
  }
});

class CustomContext extends Context {
  constructor(update, telegram, botInfo) {
    super(update, telegram, botInfo);
  }

  makeCbData({ scene, action, payload }) {
    const data = [scene, action, payload].join('|');
    if (data.replace(/[^\x00-\xff]/gi, '--').length <= 64) {
      return data;
    }
    throw new Error(`CallBack Data is more than 64 bit!`);
  }

  getCbData() {
    if (!this.callbackQuery) {
      return;
    }
    const data = this.callbackQuery.data.split('|');

    return {
      scene: data[0],
      action: data[1],
      payload: data[2],
    };
  }

  async getUser() {
    return (
      this.session.user ||
      (this.session.user = await User.findOne({ tgId: this.from.id }).catch(
        (error) => {
          this.reply(
            `Ошибка получени пользователя из базы: ${error.message}`,
            keyboardMarkup.remove()
          );
        }
      ))
    );
  }

  async getSpreadSheet() {
    const user = await this.getUser();
    return (
      this.session.spreadsheet ||
      (this.session.spreadsheet = await SpreadSheet.build(user))
    );
  }

  async handleError(error, message) {
    console.log(error);
    await this.reply(`Error:`, keyboardMarkup.remove());
    await this.reply(message || error.message, keyboardMarkup.link_errorForm);
    const user = await this.getUser();
    user._errors.push(error);
    user.save();
  }
}

const bot = new Telegraf(process.env.BOT_TOKEN, { contextType: CustomContext });
bot.use(session(), stage.middleware(), checkChat);

bot.start(handleStart);
bot.command(commands.TABLE, handleTable);
bot.command(commands.MY_WORKOUTS, (ctx) =>
  ctx.scene.enter(scenes.chouseWorkout.id)
);
bot.command(commands.HELP, (ctx) =>
  ctx.reply(
    `Инструкция ещё не доступна! (бот проходит альфа-тестирование. За помощью обратитесь к разработчику)`
  )
);
bot.command(commands.NEW_TABLE, (ctx) =>
  ctx.scene.enter(scenes.createUserSheet.id, { forced: true })
);

bot.catch((error, ctx) =>
  ctx.handleError(error, `Ошибка в обработке ${ctx.updateType}`)
);

module.exports = bot;
