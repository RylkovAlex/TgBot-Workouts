/* const User = require('../../models/user');

module.exports = async (ctx, next) => {
  const user =
    (await User.findOne({ tgId: ctx.from.id })) ||
    (await new User({
      tgId: ctx.from.id,
      tgName: ctx.from.first_name,
    }).save());

  await user.populate('workouts').execPopulate();

  ctx.state = {
    user,
  };

  // console.log({setState: ctx.state});

  return next();
};
 */
