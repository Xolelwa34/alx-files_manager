const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const imageThumbnail = require('image-thumbnail');
const { addJob } = require('../utils/queue'); // Import queue utility

const storagePath = process.env.FOLDER_PATH || '/tmp/files_manager';

const postUpload = async (req, res) => {
  try {
    const { name, type, data, parentId = '0', isPublic = false } = req.body;
    const userId = req.userId; // User ID from middleware (see AuthController)

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const allowedTypes = ['folder', 'file', 'image'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing or invalid type' });
    }

    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== '0') {
      const parentFile = await dbClient
        .client.db()
        .collection('files')
        .findOne({ _id: new ObjectId(parentId) });

      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }

      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type !== 'folder') {
      const uniqueFileName = uuidv4();
      const filePath = path.join(storagePath, uniqueFileName);

      // Decode Base64 data and write to file
      const buffer = Buffer.from(data, 'base64');
      await fs.writeFile(filePath, buffer);

      newFile.localPath = filePath;

      // Add job to queue for image thumbnail generation
      if (type === 'image') {
        addJob('fileQueue', { userId, fileId: newFile._id.toString() });
      }
    }

    const result = await dbClient
      .client.db()
      .collection('files')
      .insertOne(newFile);

    res.status(201).json({ id: result.insertedId.toString(), ...newFile });
  } catch (error) {
    console.error('postUpload Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getShow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // User ID from middleware (see AuthController)

    const file = await dbClient
      .client.db()
      .collection('files')
      .findOne({ _id: new ObjectId(id), $or: [{ userId }, { isPublic: true }] });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.status(200).json(file);
  } catch (error) {
    console.error('getShow Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getIndex = async (req, res) => {
  try {
    const userId = req.userId; // User ID from middleware (see AuthController)
    const { parentId = '0', page = 0 } = req.query;

    const files = await dbClient
      .client.db()
      .collection('files')
      .find({ $or: [{ userId }, { isPublic: true }], parentId: new ObjectId(parentId) })
      .skip(page * 20) // Pagination: 20 items per page
      .limit(20)
      .toArray();

    res.status(200).json(files);
  } catch (error) {
    console.error('getIndex Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const putPublish = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // User ID from middleware (see AuthController)

    const file = await dbClient
      .client.db()
      .collection('files')
      .findOne({ _id: new ObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await dbClient
      .client.db()
      .collection('files')
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: true } });

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json({ ...file, isPublic: true });
  } catch (error) {
    console.error('putPublish Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const putUnpublish = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId; // User ID from middleware (see AuthController)

    const file = await dbClient
      .client.db()
      .collection('files')
      .findOne({ _id: new ObjectId(id), userId });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const result = await dbClient
      .client.db()
      .collection('files')
      .updateOne({ _id: new ObjectId(id) }, { $set: { isPublic: false } });

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.status(200).json({ ...file, isPublic: false });
  } catch (error) {
    console.error('putUnpublish Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { size } = req.query;
    const userId = req.userId; // User ID from middleware (see AuthController)

    const file = await dbClient
      .client.db()
      .collection('files')
      .findOne({ _id: new ObjectId(id), $or: [{ userId }, { isPublic: true }] });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = file.localPath;

    if (size && file.type === 'image') {
      filePath += `_${size}`;
    }

    try {
      const fileData = await fs.readFile(filePath);
      const mimeType = mime.lookup(file.name);

      res.setHeader('Content-Type', mimeType);
      res.send(fileData);
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('getFile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  postUpload,
  getShow,
  getIndex,
  putPublish,
  putUnpublish,
  getFile,
};
