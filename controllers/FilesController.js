import { ObjectId } from 'mongodb';
import mime from 'mime-types';
import Queue from 'bull';

import userUtils from '../utils/user';
import fileUtils from '../utils/file';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const { userId } = await userUtils.getUserIdAndKey(req);
    if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });

    const userObjId = ObjectId(userId);
    const user = await userUtils.getUser({ _id: userObjId }, { projection: { password: 0 } });

    if (!user) return res.status(401).send('Unauthorized');

    const { error: validationError, fileParams } = await fileUtils.validateBody(req);
    if (validationError) return res.status(400).send({ error: validationError });

    if (fileParams.parentId !== 0 && !userUtils.isValidId(fileParams.parentId)) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    const { error, code, sanitizedFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH,
    );

    if (error) {
      if (res.body.type === 'image') await fileQueue.add({ userId });
      return res.status(code).send(error);
    }

    if (fileParams.type === 'image') {
      await fileQueue.add({
        fileId: sanitizedFile.id.toString(),
        userId: sanitizedFile.userId.toString(),
      });
    }

    return res.status(201).send(sanitizedFile);
  }

  static async getShow(request, response) {
    const fileId = request.params.id;

    const { userId } = await userUtils.getUserIdAndKey(request);

    const userObjId = ObjectId(userId);
    const user = await userUtils.getUser({
      _id: userObjId,
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    // Mongo Condition for Id
    if (!userUtils.isValidId(fileId) || !userUtils.isValidId(userId)) {
      return response.status(404).send({ error: 'Not found' });
    }

    const fileObjId = ObjectId(fileId);
    const result = await fileUtils.getFile({
      _id: fileObjId,
      userId: userObjId,
    });

    if (!result) return response.status(404).send({ error: 'Not found' });

    const file = fileUtils.processFile(result);

    return response.status(200).send(file);
  }

  static async getIndex(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);

    const userObjId = ObjectId(userId);
    const user = await userUtils.getUser({
      _id: userObjId,
    });

    if (!user) return response.status(401).send({ error: 'Unauthorized' });

    let parentId = request.query.parentId || '0';

    if (parentId === '0') parentId = 0;

    let page = Number(request.query.page) || 0;

    if (Number.isNaN(page)) page = 0;

    if (parentId !== 0 && parentId !== '0') {
      if (!userUtils.isValidId(parentId)) { return response.status(401).send({ error: 'Unauthorized' }); }

      parentId = ObjectId(parentId);
      const folder = await fileUtils.getFile({
        _id: parentId,
      });

      if (!folder || folder.type !== 'folder') { return response.status(200).send([]); }
    }

    const pipeline = [
      { $match: { parentId } },
      { $skip: page * 20 },
      {
        $limit: 20,
      },
    ];

    const fileCursor = await fileUtils.getFilesOfParentId(pipeline);

    const fileList = [];
    await fileCursor.forEach((doc) => {
      const document = fileUtils.processFile(doc);
      fileList.push(document);
    });

    return response.status(200).send(fileList);
  }

  static async putPublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      true,
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  static async putUnpublish(request, response) {
    const { error, code, updatedFile } = await fileUtils.publishUnpublish(
      request,
      false,
    );

    if (error) return response.status(code).send({ error });

    return response.status(code).send(updatedFile);
  }

  static async getFile(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);
    const { id: fileId } = request.params;
    const size = request.query.size || 0;

    // Mongo Condition for Id
    if (!userUtils.isValidId(fileId)) { return response.status(404).send({ error: 'Not found' }); }

    const fileObjId = ObjectId(fileId);
    const file = await fileUtils.getFile({
      _id: fileObjId,
    });

    if (!file || !fileUtils.isOwnerAndPublic(file, userId)) { return response.status(404).send({ error: 'Not found' }); }

    if (file.type === 'folder') {
      return response
        .status(400)
        .send({ error: "A folder doesn't have content" });
    }

    const { error, code, data } = await fileUtils.getFileData(file, size);

    if (error) return response.status(code).send({ error });

    const mimeType = mime.contentType(file.name);

    response.setHeader('Content-Type', mimeType);

    return response.status(200).send(data);
  }
}

export default FilesController;
