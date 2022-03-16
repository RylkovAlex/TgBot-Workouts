const {
  Telegraf,
  Scenes: { Stage },
  session,
  Context,
  Telegram,
} = require('telegraf');

const buttons = require('./keyboards/buttons');

const checkChat = require('./middlewares/checkChat');

const handleStart = require('./commands/start');
const scenes = require('./scenes/scenes');

const stage = new Stage(Object.values(scenes), {
  sessionName: 'chatSession',
});
// stage.register(startWorkout);
stage.hears(buttons.cancel, (ctx, next) => {
  if (ctx.session?.__scenes?.current) {
    return ctx.scene.leave();
  }
  return ctx.scene.enter('chouseWorkout'); //TODO:
});
stage.on('callback_query', (ctx) => {
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
}

const bot = new Telegraf(process.env.BOT_TOKEN, { contextType: CustomContext });

bot.use(session(), stage.middleware(), checkChat);

bot.start(handleStart);

//Menues with inlineKeyboard
bot.on(`callback_query`, (ctx) => {
  const data = ctx.getCbData();

  if (data.scene) {
    ctx.scene.leave();
    ctx.answerCbQuery();
    return ctx.scene.enter(data.scene, data);
  }
});

bot.catch((err, ctx) => {
  console.log(`An error for ${ctx.updateType}`, { err }, { ctx });
});

module.exports = bot;
