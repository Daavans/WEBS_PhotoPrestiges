const { ObjectId } = require('mongodb');

// ── Photos ────────────────────────────────────────────────────────────────────

async function createPhoto(db, doc) {
  const photos = db.collection('photos');
  const now = new Date();
  const result = await photos.insertOne({
    ...doc,
    views: 0,
    uploadedAt: now,
    updatedAt: now,
  });
  return result.insertedId;
}

async function findPhotoById(db, id) {
  const photos = db.collection('photos');
  return photos.findOne({ _id: new ObjectId(id), status: { $ne: 'deleted' } });
}

async function findPhotosByUserId(db, userId, { page = 1, limit = 20 } = {}) {
  const photos = db.collection('photos');
  const skip = (page - 1) * limit;
  const filter = { userId: new ObjectId(userId), status: { $ne: 'deleted' } };
  const [items, total] = await Promise.all([
    photos.find(filter).sort({ uploadedAt: -1 }).skip(skip).limit(limit).toArray(),
    photos.countDocuments(filter),
  ]);
  return { items, total };
}

async function updatePhoto(db, id, updates) {
  const photos = db.collection('photos');
  const result = await photos.findOneAndUpdate(
    { _id: new ObjectId(id), status: { $ne: 'deleted' } },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  return result;
}

async function softDeletePhoto(db, id) {
  const photos = db.collection('photos');
  const result = await photos.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'deleted', deletedAt: new Date(), updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

async function incrementViews(db, id) {
  const photos = db.collection('photos');
  await photos.updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } });
}

async function updateAnalysis(db, id, analysis) {
  const photos = db.collection('photos');
  await photos.updateOne(
    { _id: new ObjectId(id) },
    { $set: { analysis, updatedAt: new Date() } }
  );
}

// ── Submissions ───────────────────────────────────────────────────────────────

async function createSubmission(db, doc) {
  const submissions = db.collection('submissions');
  const now = new Date();
  const result = await submissions.insertOne({ ...doc, submittedAt: now, updatedAt: now });
  return result.insertedId;
}

async function findSubmissionById(db, id) {
  const submissions = db.collection('submissions');
  return submissions.findOne({ _id: new ObjectId(id) });
}

async function findSubmissionByUserAndTarget(db, userId, targetPhotoId) {
  const submissions = db.collection('submissions');
  return submissions.findOne({
    userId: new ObjectId(userId),
    targetPhotoId: new ObjectId(targetPhotoId),
  });
}

async function findSubmissionsByTargetId(db, targetPhotoId, { page = 1, limit = 20 } = {}) {
  const submissions = db.collection('submissions');
  const skip = (page - 1) * limit;
  const filter = { targetPhotoId: new ObjectId(targetPhotoId) };
  const [items, total] = await Promise.all([
    submissions.find(filter).sort({ score: -1, submittedAt: -1 }).skip(skip).limit(limit).toArray(),
    submissions.countDocuments(filter),
  ]);
  return { items, total };
}

async function updateSubmission(db, id, updates) {
  const submissions = db.collection('submissions');
  return submissions.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}

module.exports = {
  createPhoto,
  findPhotoById,
  findPhotosByUserId,
  updatePhoto,
  softDeletePhoto,
  incrementViews,
  updateAnalysis,
  createSubmission,
  findSubmissionById,
  findSubmissionByUserAndTarget,
  findSubmissionsByTargetId,
  updateSubmission,
};
