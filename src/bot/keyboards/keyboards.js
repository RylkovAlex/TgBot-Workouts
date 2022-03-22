const { Markup } = require('telegraf');
const buttons = require('./buttons');

const User = require('../../models/user');
const combineArrElems = require('../../utils/combineArrElems');
const actions = require('../enums/actions');
class KeyboardMarkup {
  answerTypes = this.make([
    [buttons.answerTypeString, buttons.answerTypeNumber],
    [buttons.answerTypeRadio],
    [buttons.answerTypeMultiple],
    [buttons.back],
    [buttons.cancel],
  ]);

  cancelBtn = this.make([[buttons.cancel]]);

  remove() {
    return Markup.removeKeyboard();
  }

  make(markup) {
    return Markup.keyboard(markup).oneTime().resize();
  }

  combineAndMake(btnsToCombine, options) {
    const { combiner = 3, cancel, back, next } = options;

    const btns = btnsToCombine ? combineArrElems(btnsToCombine, combiner) : [];

    if (back && next) {
      btns.push([buttons.back, buttons.next]);
    } else if (back || next) {
      btns.push([back ? buttons.back : buttons.next]);
    }
    if (cancel) {
      btns.push([buttons.cancel]);
    }
    return Markup.keyboard(btns).oneTime().resize();
  }

  alert({ yes, no, back, cancel }) {
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

    return this.make(btns).oneTime().resize();
  }

  makeInline(markup, { ctx, sceneId }) {
    return Markup.inlineKeyboard(
      markup.map((btnsRow) =>
        btnsRow.map((btnParams) =>
          Markup.button.callback(
            btnParams.name,
            ctx.makeCbData({
              scene: sceneId,
              action: btnParams.action,
            })
          )
        )
      )
    );
  }

  link_table(spreadSheetId) {
    return Markup.inlineKeyboard([
      Markup.button.url(
        'Статистика по тренировкам',
        `https://docs.google.com/spreadsheets/d/${spreadSheetId}`
      ),
    ]);
  }

  inline_beforeStartWorkout(ctx, sceneId) {
    const { payload } = ctx.getCbData();

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          buttons.start,
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
  }

  async inline_workouts(ctx, { sceneId, action, addBtns }) {
    const user = await ctx.getUser();
    await user.populate('workouts').execPopulate();
    ctx.session.user = user;
    const { workouts } = user;

    if (!workouts || workouts.length === 0) {
      return null;
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
  }
}

module.exports = new KeyboardMarkup();
