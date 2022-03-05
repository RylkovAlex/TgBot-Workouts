const express = require(`express`);
const bot = require('./bot/bot');

const connectToDb = require(`./db/mongoose`);

connectToDb();
const app = express();
const port = process.env.PORT;

const secretPath = `/telegraf/${bot.secretPathComponent()}`;

if (process.env.DEV_MODE) {
  bot.launch();
} else {
  bot.telegram.setWebhook(`${process.env.DOMAIN}${secretPath}`);
}

app.use(bot.webhookCallback(secretPath));

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
