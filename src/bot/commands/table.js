const createUserSheet = require('../scenes/createUserSheet');
const keyboardMarkup = require('../keyboards/keyboards');
const commands = require('../enums/commands');

module.exports = async (ctx) => {
  try {
    const user = await ctx.getUser();
    if (!user.spreadSheetId) {
      return ctx.scene.enter(createUserSheet.id);
    }
    await ctx.reply(
      `Таблица доступна по ссылке ниже.

При желании можно создать новую таблицу с помощью команды ${commands.NEW_TABLE}`,
      keyboardMarkup.link_table(user.spreadSheetId)
    );
  } catch (error) {
    return ctx.handleError(error);
  }
};
