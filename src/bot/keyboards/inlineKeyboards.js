const { Markup } = require('telegraf');
const buttons = require('./buttons');

const inlineKeyboards = {
  startWorkout: Markup.inlineKeyboard([
    [Markup.button.callback('Старт', 'Start')],
    [Markup.button.callback('Назад', 'Back')],
  ]),
};

module.exports = inlineKeyboards;
