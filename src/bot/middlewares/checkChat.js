module.exports = async (ctx, next) => {
  const chat = ctx.chat;

  if (chat.type !== 'private') {
    return ctx.reply(`Данный бот работает только в личном чате`)
  }

  next();
};
