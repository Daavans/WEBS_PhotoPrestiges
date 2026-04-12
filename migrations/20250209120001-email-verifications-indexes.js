module.exports = {
  async up(db) {
    const coll = db.collection('email_verifications');
    await coll.createIndex({ token: 1 }, { unique: true });
    await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  },

  async down(db) {
    const coll = db.collection('email_verifications');
    await coll.dropIndex('token_1').catch(() => {});
    await coll.dropIndex('expiresAt_1').catch(() => {});
  }
};
