import Queue from 'bull';
import { ObjectId } from 'mongodb';
import { promises } from 'fs';

import fileUtils from './utils/file';
import userUtils from './utils/user';

const imageThumbnail = require('image-thumbnail');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  // Delete bull keys in redis
  //   redis-cli keys "bull*" | xargs redis-cli del

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!fileId) {
    console.log('Missing fileId');
    throw new Error('Missing fileId');
  }

  if (!userUtils.isValidId(fileId) || !userUtils.isValidId(userId)) throw new Error('File not found');

  const userObjId = ObjectId(userId);
  const fileObjId = ObjectId(fileId);
  const file = await fileUtils.getFile({
    _id: fileObjId,
    userId: userObjId,
  });

  if (!file) throw new Error('File not found');

  const { localPath } = file;
  const options = {};
  const widths = [500, 250, 100];

  widths.forEach(async (width) => {
    options.width = width;
    try {
      const thumbnail = await imageThumbnail(localPath, options);
      await promises.writeFile(`${localPath}_${width}`, thumbnail);
      //   console.log(thumbnail);
    } catch (err) {
      console.error(err.message);
    }
  });
});

userQueue.process(async (job) => {
  const { userId } = job.data;
  // Delete bull keys in redis
  //   redis-cli keys "bull*" | xargs redis-cli del

  if (!userId) {
    console.log('Missing userId');
    throw new Error('Missing userId');
  }

  if (!userUtils.isValidId(userId)) throw new Error('User not found');

  const userObjId = ObjectId(userId);
  const user = await userUtils.getUser({
    _id: userObjId,
  });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);
});