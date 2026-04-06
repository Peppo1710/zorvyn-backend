const canListUsers = (user) => user.role === 'admin';

const canViewUserById = (actor, targetUserId) =>
  actor.role === 'admin' || actor.id === targetUserId;

const canUpdateUser = (actor) => actor.role === 'admin';

module.exports = {
  canListUsers,
  canViewUserById,
  canUpdateUser,
};
