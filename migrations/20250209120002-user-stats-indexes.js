module.exports = {
  async up(db) {
    const coll = db.collection('user_stats');
    await coll.createIndex({ userId: 1 }, { unique: true });
  },

  async down(db) {
    const coll = db.collection('user_stats');
    await coll.dropIndex('userId_1').catch(() => {});
  }
};
