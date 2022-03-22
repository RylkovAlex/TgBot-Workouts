const createUserSheet = require('../scenes/createUserSheet');
const keyboardMarkup = require('../keyboards/keyboards');
const User = require('../../models/user');
const commands = require('../enums/commands');

module.exports = async (ctx) => {
  const s = await ctx.getSpreadSheet();
  console.log(s.getId());
  s.deleteSheet('Test2');
  /*   try {
    const user = await ctx.getUser();
    if (!user.spreadSheetId) {
      return ctx.scene.enter(createUserSheet.id);
    }
    await ctx.reply(
      `Ваша таблица доступна по ссылке ниже.

При желании можно создать новую таблицу с помощью команды ${commands.NEW_TABLE}
Но учитывайте, что в этом случае вся Ваша текущая статистика пропадёт!`,
      keyboardMarkup.link_table(user.spreadSheetId)
    );
  } catch (error) {
    console.log({ error });

    return ctx.reply(`Ошибка! ${error.message}`);
  } */
};
