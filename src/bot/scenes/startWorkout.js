const {
  Scenes: { WizardScene },
} = require('telegraf');
const keyboardMarkup = require('../keyboards/keyboards');
const buttons = require('../keyboards/buttons');
const answerTypes = require('../enums/answerTypes');

const basicSceneKeyboard = keyboardMarkup.make([
  [buttons.back, buttons.next],
  [buttons.cancel],
]);

const enterHandler = async (ctx) => {
  const { workout } = ctx.scene.state;

  ctx.scene.state = {
    result: {},
  };

  const handlers = getStartWorkoutHandlers(workout);
  handlers.push((ctx) => {
    ctx.scene.leave();
  });

  startWorkout.steps.splice(1, startWorkout.steps.length);
  startWorkout.steps.push(...handlers);

  ctx.wizard.next();

  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
};

const startWorkout = new WizardScene(`startWorkout`, enterHandler);

startWorkout.leave(async (ctx) => {
  if (ctx.message.text === buttons.cancel) {
    return ctx.reply(`Тренировочная сессия отменена`, keyboardMarkup.remove());
  }
  const { result } = ctx.scene.state;
  let resultString = '';

  for (answer in result) {
    if (
      typeof result[answer] === 'string' ||
      typeof result[answer] === 'number' ||
      result[answer].length > 0
    ) {
      resultString = `${resultString}\n${answer}: ${result[answer]}`;
    } else {
      delete result[answer];
    }
  }

  await ctx.reply(
    `Тренировочная сессия сохранена:\n${resultString}`,
    keyboardMarkup.remove()
  );
  return ctx.scene.enter(`chouseWorkout`); //TODO:
});

startWorkout.hears(buttons.back, (ctx) => {
  const step = ctx.wizard.cursor - 3;
  if (step > 0) {
    ctx.wizard.selectStep(step);
    return ctx.wizard.steps[ctx.wizard.cursor](ctx);
  }
  ctx.wizard.back();
  return ctx.wizard.steps[ctx.wizard.cursor](ctx);
});

module.exports = startWorkout;

// SCENE HANDLERS:

function getStartWorkoutHandlers(workout) {
  const { time, before, after } = workout.params;
  const handlers = [];

  before.forEach((q) => handlers.push(...getQuestionHandlers(q)));
  handlers.push(...getTimeHandlers(time));
  after.forEach((q) => handlers.push(...getQuestionHandlers(q)));

  return handlers;
}

function getQuestionHandlers(q) {
  const { question, paramName, answerType, possibleAnswers } = q;

  const questionHandler = async (ctx) => {
    if (
      answerType === answerTypes.STRING ||
      answerType === answerTypes.NUMBER
    ) {
      await ctx.reply(question, basicSceneKeyboard);
    } else {
      const keyboard = keyboardMarkup.combineAndMake(possibleAnswers, {
        cancel: true,
        next: true,
        back: true,
      });
      await ctx.reply(question, keyboard);
    }

    if (answerType === answerTypes.MULTIPLE) {
      ctx.scene.state.result[paramName] = [];
    }

    return ctx.wizard.next();
  };

  const answerHandler = async (ctx) => {
    const answer = ctx.message.text.trim();
    if (answer === buttons.next) {
      ctx.wizard.next();
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    }

    switch (answerType) {
      case answerTypes.STRING: {
        ctx.scene.state.result[paramName] = answer;
        ctx.wizard.next();
        break;
      }

      case answerTypes.NUMBER: {
        const number = Number(answer.replace(/,/g, '.'));
        if (isNaN(number)) {
          return ctx.reply(
            `Параметром должно быть число. Попробуем ещё раз. \n${question}`,
            basicSceneKeyboard
          );
        } else {
          ctx.scene.state.result[paramName] = number;
          ctx.wizard.next();
          break;
        }
      }

      case answerTypes.MULTIPLE: {
        const givenAnswers = ctx.scene.state.result[paramName];

        if (possibleAnswers.includes(answer)) {
          givenAnswers.push(answer);
          const updatedPossibleAnswers = possibleAnswers.filter(
            (a) => !givenAnswers.includes(a)
          );

          return ctx.reply(
            `Можно выбрать несколько вариантов или нажать "далее" для продолжения`,
            keyboardMarkup.combineAndMake(updatedPossibleAnswers, {
              cancel: true,
              next: true,
              back: true,
            })
          );
        }

        return ctx.reply(
          `Введён неверный ответ. Выберите один из вариантов: \n`,
          keyboardMarkup.combineAndMake(possibleAnswers, {
            cancel: true,
            next: true,
            back: true,
          })
        );
      }

      case answerTypes.RADIO: {
        if (possibleAnswers.includes(answer)) {
          ctx.scene.state.result[paramName] = answer;
          ctx.wizard.next();
          break;
        }
        return ctx.reply(
          `Введён неверный ответ. Выберите один из вариантов: \n`,
          keyboardMarkup.combineAndMake(possibleAnswers, {
            cancel: true,
            next: true,
            back: true,
          })
        );
      }

      default:
        throw new Error(`Wrong answer type: ${answerType}`);
    }
    return ctx.wizard.steps[ctx.wizard.cursor](ctx);
  };

  return [questionHandler, answerHandler];
}

function getTimeHandlers(time) {
  if (!time) {
    const firstHandler = async (ctx) => {
      await ctx.reply(
        `Тренировочная сессия запущена. После тренировки нажмите "далее"`,
        basicSceneKeyboard
      );
      return ctx.wizard.next();
    };
    const secondHandler = (ctx) => {
      const text = ctx.message.text.trim();
      if (text === buttons.next) {
        ctx.wizard.next();
        return ctx.wizard.steps[ctx.wizard.cursor](ctx);
      } else {
        return ctx.reply(
          `Тренирока в процессе. После тренировки нажмите "далее"`,
          basicSceneKeyboard
        );
      }
    };
    return [firstHandler, secondHandler];
  }

  const firstHandler = async (ctx) => {
    ctx.scene.state.startTime = Date.now();
    await ctx.reply(
      `Тренировочная сессия запущена. После тренировки нажмите "далее"`,
      basicSceneKeyboard
    );
    return ctx.wizard.next();
  };
  const secondHandler = async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === buttons.next) {
      const { startTime } = ctx.scene.state;
      const finishTime = Date.now();
      const time = (finishTime - startTime) / 60000;

      ctx.scene.state.result.time = time;
      ctx.wizard.next();
      return ctx.wizard.steps[ctx.wizard.cursor](ctx);
    } else {
      return ctx.reply(
        `Тренировка в процессе. После тренировки нажмите "далее"`,
        basicSceneKeyboard
      );
    }
  };

  return [firstHandler, secondHandler];
}
