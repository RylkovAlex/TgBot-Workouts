const {
  Telegraf,
  Scenes: { Stage },
  session,
  Context,
  Telegram,
} = require('telegraf');

const buttons = require('./keyboards/buttons');

const setState = require('./middlewares/setState');
const checkChat = require('./middlewares/checkChat');

const handleStart = require('./commands/start');
const scenes = require('./scenes/scenes');

const stage = new Stage(Object.values(scenes), {
  sessionName: 'chatSession',
});
// stage.register(startWorkout);
stage.hears(buttons.cancel, (ctx) => {
  console.log(`STAGE`, ctx.session.__scenes);
  ctx.scene.leave();
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
    throw new Error(`CbData length more than 64 bit!`);
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

  /*   getCbData() {
    if (!this.callbackQuery) {
      return;
    }

    let data;
    try {
      data = JSON.parse(this.callbackQuery.data);
    } catch (e) {
      data = this.callbackQuery.data;
    }

    return data;
  } */
}

const bot = new Telegraf(process.env.BOT_TOKEN, { contextType: CustomContext });

bot.use(session(), stage.middleware(), checkChat);

/* bot.use(checkChat);
bot.use(setState); */

bot.start(handleStart);

bot.on(`message`, (ctx) => ctx.reply('Ok!'));
bot.on(`callback_query`, (ctx) => {
  const data = ctx.getCbData();

  if (data.scene) {
    ctx.scene.leave();
    ctx.answerCbQuery();
    return ctx.scene.enter(data.scene, data);
  }
});

/* bot.on(`callback_query`, (ctx) => {
  let data;
  try {
    data = JSON.parse(ctx.callbackQuery.data);
  } catch (e) {
    data = ctx.callbackQuery.data;
  }

  if (data.scene) {
    ctx.scene.leave();
    ctx.scene.enter(data.scene, data.sceneState);
  }
  return ctx.answerCbQuery();
}); */

/* bot.on('callback_query', (ctx) => {
  let data;
  try {
    data = JSON.parse(ctx.callbackQuery.data);
  } catch (e) {
    data = ctx.callbackQuery.data;
  }

  if (data.scene) {
    ctx.scene.enter(data.scene);
    return ctx.answerCbQuery();
  }

  console.log(data);
  ctx.answerCbQuery();
}); */

bot.catch((err, ctx) => {
  console.log(`An error for ${ctx.updateType}`, { err }, { ctx });
});

module.exports = bot;
