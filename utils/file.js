import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { promises } from 'fs';

import dbClient from './db';
import userUtils from './user';

class fileUtils {
  static async validateBody(req) {
    const {
      name, type, isPublic = false, data,
    } = req.body;
    let { parentId = 0 } = req.body;
    if (parentId === '0') parentId = 0;

    const acceptedTypes = ['file', 'image', 'folder'];
    let msg = null;

    if (!name) {
      msg = 'Missing name';
    } else if (!type || !acceptedTypes.includes(type)) {
      msg = 'Missing type';
    } else if (!data && type !== 'folder') {
      msg = 'Missing data';
    } else if (parentId && parentId !== '0') {
      let file;
      if (userUtils.isValidId(parentId)) {
        file = await this.getFile({ _id: ObjectId(parentId) });
      } else {
        file = null;
      }

      if (!file) {
        msg = 'Parent not found';
      } else if (file.type !== 'folder') {
        msg = 'Parent is not a folder';
      }
    }

    return {
      error: msg,
      fileParams: {
        name,
        type,
        parentId,
        isPublic,
        data,
      },
    };
  }

  static async getFile(...query) {
    const file = await dbClient.filesCollection.findOne(...query);
    return file;
  }

  static async saveFile(userId, fileParams, FOLDER_PATH) {
    const {
      name, type, isPublic, data,
    } = fileParams;
    let { parentId } = fileParams;

    if (parentId !== '0') parentId = ObjectId(parentId);

    const userObjId = ObjectId(userId);
    const query = {
      userId: userObjId, name, type, isPublic, parentId,
    };

    if (fileParams.type !== 'folder') {
      const fileNameUUID = uuidv4();
      const fileDataDecoded = Buffer.from(data, 'base64');
      const path = `${FOLDER_PATH}/${fileNameUUID}`;

      query.localPath = path;

      try {
        await promises.mkdir(FOLDER_PATH, { recursive: true });
        await promises.writeFile(path, fileDataDecoded);
      } catch (error) {
        return { error: error.message, code: 400 };
      }
    }

    try {
      await dbClient.filesCollection.insertOne(query);
    } catch (err) {
      return { error: 'Server Error', code: 500 };
    }

    const file = await this.getFile(query, { projection: { localPath: false } });
    const sanitizedFile = { id: file._id, ...file };
    delete sanitizedFile._id;

    return { error: null, sanitizedFile };
  }
}

export default fileUtils;
