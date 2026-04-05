const canReadRecord = (user, record) => {
  if (user.role === 'admin' || user.role === 'analyst') return true;
  return record.user_id === user.id;
};

const canCreateRecord = (user) => {
  return true; // Any authenticated user can create their own records
};

const canUpdateRecord = (user, record) => {
  if (user.role === 'admin') return true;
  return record.user_id === user.id;
};

const canDeleteRecord = (user, record) => {
  if (user.role === 'admin') return true;
  return record.user_id === user.id;
};

module.exports = {
  canReadRecord,
  canCreateRecord,
  canUpdateRecord,
  canDeleteRecord,
};
