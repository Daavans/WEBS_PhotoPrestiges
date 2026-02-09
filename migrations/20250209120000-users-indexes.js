module.exports = {
  async up(db) {
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ username: 1 }, { unique: true, sparse: true });
    await users.createIndex({ deletedAt: 1 });
  },

  async down(db) {
    const users = db.collection('users');
    await users.dropIndex('email_1').catch(() => {});
    await users.dropIndex('username_1').catch(() => {});
    await users.dropIndex('deletedAt_1').catch(() => {});
  }
};
