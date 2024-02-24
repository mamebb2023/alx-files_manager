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
    } else if (parentId && parentId !== 0) {
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

  static async getFilesOfParentId(query) {
    const fileList = await dbClient.filesCollection.aggregate(query);
    return fileList;
  }

  static async updateFile(query, set) {
    const fileList = await dbClient.filesCollection.findOneAndUpdate(
      query,
      set,
      { returnOriginal: false },
    );
    return fileList;
  }

  static async saveFile(userId, fileParams, FOLDER_PATH) {
    const {
      name, type, isPublic, data,
    } = fileParams;
    let { parentId } = fileParams;

    if (parentId !== 0) parentId = ObjectId(parentId);

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

  static processFile(doc) {
    // Changes _id for id and removes localPath

    const file = { id: doc._id, ...doc };

    delete file.localPath;
    delete file._id;

    return file;
  }

  static async publishUnpublish(request, setPublish) {
    const { id: fileId } = request.params;

    if (!userUtils.isValidId(fileId)) { return { error: 'Unauthorized', code: 401 }; }

    const { userId } = await userUtils.getUserIdAndKey(request);

    if (!userUtils.isValidId(userId)) { return { error: 'Unauthorized', code: 401 }; }

    const userObjId = ObjectId(userId);
    const user = await userUtils.getUser({
      _id: userObjId,
    });

    if (!user) return { error: 'Unauthorized', code: 401 };

    const fileObjId = ObjectId(fileId);
    const file = await this.getFile({
      _id: fileObjId,
      userId: userObjId,
    });

    if (!file) return { error: 'Not found', code: 404 };

    const result = await this.updateFile(
      {
        _id: fileObjId,
        userId: userObjId,
      },
      { $set: { isPublic: setPublish } },
    );

    const {
      _id: id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    } = result.value;

    const updatedFile = {
      id,
      userId: resultUserId,
      name,
      type,
      isPublic,
      parentId,
    };

    return { error: null, code: 200, updatedFile };
  }

  static isOwnerAndPublic(file, userId) {
    if (
      (!file.isPublic && !userId)
      || (userId && file.userId.toString() !== userId && !file.isPublic)
    ) { return false; }

    return true;
  }

  static async getFileData(file, size) {
    let { localPath } = file;
    let data;

    if (size) localPath = `${localPath}_${size}`;

    try {
      data = await promises.readFile(localPath);
    } catch (err) {
      // console.log(err.message);
      return { error: 'Not found', code: 404 };
    }

    return { data };
  }
}

export default fileUtils;
