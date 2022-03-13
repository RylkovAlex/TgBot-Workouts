const scenes = require('../scenes/scenes');
const User = require('../../models/user');

module.exports = async (ctx) => {
  const user = await User.create(ctx.from);

  await ctx.reply(
    `Привет, ${user.tgName}!\n\nЯ помогу тебе вести дневник тренировок и собирать всю статистику.`
  );

  if (!user.email) {
    return ctx.scene.enter(scenes.createUserSheet.id);
  }

  ctx.reply(`Если что-то не понятно, используй команду: /help`);

  return ctx.scene.enter(scenes.chouseWorkout.id);
};
