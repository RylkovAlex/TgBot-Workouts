const { Markup } = require('telegraf');
const buttons = require('./buttons');

const User = require('../../models/user');
const combineArrElems = require('../../utils/combineArrElems');
const actions = require('../enums/actions');

const keyboardMarkup = {
  remove() {
    return Markup.removeKeyboard();
  },

  make(markup) {
    return Markup.keyboard(markup).oneTime().resize();
  },
};

const keyboards = {
  remove_keyboard: Markup.removeKeyboard(),
  exit_keyboard: Markup.keyboard([buttons.cancel]).oneTime().resize(),

  training_keyboard: Markup.keyboard([
    [buttons.back, buttons.next],
    [buttons.cancel],
  ])
    .oneTime()
    .resize(),

  answerTypes: Markup.keyboard([
    [buttons.answerTypeString, buttons.answerTypeNumber],
    [buttons.answerTypeRadio],
    [buttons.answerTypeMultiple],
    [buttons.back],
    [buttons.cancel],
  ])
    .oneTime()
    .resize(),

  workoutActions: Markup.keyboard([
    [buttons.editWorkout],
    [buttons.deleteWorkout],
    [buttons.cancel],
  ])
    .oneTime()
    .resize(),

  alert: ({ yes, no, back, cancel }) => {
    const btns = [];
    if (yes && no) {
      btns.push([buttons.no, buttons.yes]);
    } else if (yes || no) {
      btns.push([buttons[yes || no]]);
    }

    if (back) {
      btns.push([buttons.back]);
    }
    if (cancel) {
      btns.push([buttons.cancel]);
    }

    return Markup.keyboard(btns).oneTime().resize();
  },

  makeStartTrainingAlert: (ctx, sceneId) => {
    const { payload } = ctx.getCbData();

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          'Старт',
          ctx.makeCbData({
            scene: sceneId,
            action: actions.START,
            payload,
          })
        ),
      ],
      [
        Markup.button.callback(
          buttons.back,
          ctx.makeCbData({
            scene: sceneId,
            action: actions.BACK,
          })
        ),
      ],
    ]);
  },

  async makeWorkoutsKeyboard(ctx, { sceneId, action, addBtns }) {
    const user = await User.findOne({ tgId: ctx.from.id });
    await user.populate('workouts').execPopulate();
    ctx.session.user = user;
    const { workouts } = user;

    if (!workouts || workouts.length === 0) {
      return Markup.inlineKeyboard([
        [
          Markup.button.callback(
            buttons.createWorkout,
            ctx.makeCbData({
              scene: sceneId,
              action,
            })
          ),
        ],
      ]);
    }

    const mapper = (workout) => {
      return Markup.button.callback(
        `${workout.name}`,
        ctx.makeCbData({
          scene: sceneId,
          action,
          payload: workout._id,
        })
      );
    };
    const btns = combineArrElems(workouts, 2, mapper);

    const { edit, create, back } = addBtns;

    if (create) {
      btns.push([
        Markup.button.callback(
          buttons.createWorkout,
          ctx.makeCbData({
            scene: sceneId,
            action: actions.CREATE_WORKOUT,
          })
        ),
      ]);
    }

    if (edit) {
      btns.push([
        Markup.button.callback(
          buttons.editWorkouts,
          ctx.makeCbData({
            scene: sceneId,
            action: actions.EDIT_WORKOUT,
          })
        ),
      ]);
    }

    if (back) {
      btns.push([
        Markup.button.callback(
          buttons.back,
          ctx.makeCbData({
            scene: sceneId,
            action: actions.BACK,
          })
        ),
      ]);
    }

    return Markup.inlineKeyboard(btns);
  },

  makeAnswersKeyboard(answers, options) {
    const btns = answers ? combineArrElems(answers, 3) : [];

    const { cancel, back, next } = options;
    if (back && next) {
      btns.push([buttons.back, buttons.next]);
    } else if (back || next) {
      btns.push([back ? buttons.back : buttons.next]);
    }
    if (cancel) {
      btns.push([buttons.cancel]);
    }
    return Markup.keyboard(btns).oneTime().resize();
  },
};

module.exports = keyboards;
