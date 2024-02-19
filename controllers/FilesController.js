import { ObjectId } from 'mongodb';

import userUtils from '../utils/user';
import fileUtils from '../utils/file';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    const { userId } = await userUtils.getUserIdAndKey(req);
    if (!userUtils.isValidId(userId)) return res.status(401).send({ error: 'Unauthorized' });

    const userObjId = ObjectId(userId);
    const user = await userUtils.getUser({ _id: userObjId }, { projection: { password: 0 } });

    if (!user) return res.status(401).send('Unauthorized');

    const { error: validationError, fileParams } = await fileUtils.validateBody(req);
    if (validationError) return res.status(400).send({ error: validationError });

    if (fileParams.parentId !== '0' && !userUtils.isValidId(fileParams.parentId)) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    const { error, code, sanitizedFile } = await fileUtils.saveFile(
      userId,
      fileParams,
      FOLDER_PATH,
    );

    if (error) return res.status(code).send(error);

    return res.status(201).send(sanitizedFile);
  }
}

export default FilesController;
