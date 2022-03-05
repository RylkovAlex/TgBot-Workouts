const { Markup } = require('telegraf');
const buttons = require('./buttons');

const User = require('../../models/user');
const combineArrElems = require('../../utils/combineArrElems');
const scenes = require('../scenes/scenes');

const keyboards = {
  exit_keyboard: Markup.keyboard([buttons.cancel]).oneTime().resize(),
  training_keyboard: Markup.keyboard([
    [buttons.back, buttons.next],
    [buttons.cancel],
  ])
    .oneTime()
    .resize(),
  remove_keyboard: Markup.removeKeyboard(),

  async makeWorkoutKeyboard(ctx) {
    const user = await User.findOne({ tgId: ctx.from.id });
    await user.populate('workouts').execPopulate();
    const { workouts } = user;

    if (!workouts || workouts.length === 0) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback(
            buttons.createWorkout,
            ctx.makeCbData({
              scene: scenes.chouseWorkout,
              action: 'createWorkoutClick',
            })
          ),
        ],
      ]);
    }

    const mapper = (workout) => {
      return Markup.button.callback(
        `${workout.name}`,
        ctx.makeCbData({
          scene: scenes.chouseWorkout,
          action: 'workoutClick',
          payload: workout._id,
        })
      );
    };
    const btns = combineArrElems(workouts, 2, mapper);

    btns.push(
      [
        Markup.button.callback(
          buttons.createWorkout,
          ctx.makeCbData({
            scene: scenes.chouseWorkout,
            action: 'createWorkoutClick',
          })
        ),
      ],
      [
        Markup.button.callback(
          buttons.editWorkouts,
          ctx.makeCbData({
            scene: scenes.chouseWorkout,
            action: 'editWorkoutClick',
          })
        ),
      ]
    );

    return Markup.inlineKeyboard(btns);
  },

  makeAnswersKeyboard(answers, options) {
    const btns = combineArrElems(answers, 3);
    const { cancel, back, next } = options;
    if (back && next) {
      btns.push([buttons.back, buttons.next]);
    } else if (back || next) {
      btns.push([buttons.back || buttons.next]);
    }
    if (cancel) {
      btns.push([buttons.cancel]);
    }
    return Markup.keyboard(btns).oneTime().resize();
  },
};

module.exports = keyboards;
