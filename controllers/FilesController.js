import RedisClient from '../utils/redis'; // Redis client for managing cache
import { v4 as uuidv4 } from 'uuid'; // UUID for generating unique IDs
import DBClient from '../utils/db'; // Database client for MongoDB
import { ObjectId } from 'mongodb'; // MongoDB's ObjectId for querying
import fs from 'fs'; // File system module for managing files
import mime from 'mime-types'; // Module for determining MIME type of files
import Bull from 'bull'; // Queue system for job processing

class FilesController {
  // Handle file upload
  static async postUpload(req, res) {
    const fileQueue = new Bull('fileQueue'); // Job queue for file processing

    const token = req.header('X-Token') || null; // Get the token from the request header
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    // Check if the token is valid using Redis for caching
    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    // Retrieve user information from the database using the token
    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const fileName = req.body.name; // Extract file name from request
    if (!fileName) return res.status(400).send({ error: 'Missing name' });

    const fileType = req.body.type; // Extract file type
    if (!fileType || !['folder', 'file', 'image'].includes(fileType)) 
      return res.status(400).send({ error: 'Missing type' });

    const fileData = req.body.data; // Extract file data
    if (!fileData && ['file', 'image'].includes(fileType)) 
      return res.status(400).send({ error: 'Missing data' });

    const fileIsPublic = req.body.isPublic || false; // Check if file is public
    let idParent = req.body.parentId || 0; // Parent file ID (for nested files/folders)
    idParent = idParent === '0' ? 0 : idParent;

    // If there is a parent, verify it exists and is a folder
    if (idParent !== 0) {
      const parentFile = await DBClient.db
        .collection('files')
        .findOne({ _id: ObjectId(idParent) });
      if (!parentFile) return res.status(400).send({ error: 'Parent not found' });
      if (!['folder'].includes(parentFile.type)) return res.status(400).send({ error: 'Parent is not a folder' });
    }

    // Prepare the file object for insertion into the database
    const dbFile = {
      userId: user._id,
      name: fileName,
      type: fileType,
      isPublic: fileIsPublic,
      parentId: idParent,
    };

    // If file is a folder, simply insert into the database
    if (['folder'].includes(fileType)) {
      await DBClient.db.collection('files').insertOne(dbFile);
      return res.status(201).send({
        id: dbFile._id,
        userId: dbFile.userId,
        name: dbFile.name,
        type: dbFile.type,
        isPublic: dbFile.isPublic,
        parentId: dbFile.parentId,
      });
    }

    // For other file types, handle file storage and queue processing
    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager'; // Directory to store files
    const uuidFile = uuidv4(); // Generate a unique identifier for the file

    const buff = Buffer.from(fileData, 'base64'); // Convert base64 file data to buffer
    const pathFile = `${pathDir}/${uuidFile}`; // Define file path

    // Ensure the directory exists and write the file
    try {
      await fs.promises.mkdir(pathDir, { recursive: true });
      await fs.promises.writeFile(pathFile, buff);
    } catch (error) {
      return res.status(400).send({ error: error.message });
    }

    // Add file path to the database record
    dbFile.localPath = pathFile;
    await DBClient.db.collection('files').insertOne(dbFile);

    // Add job to the queue for file processing (e.g., resizing, virus scanning)
    fileQueue.add({
      userId: dbFile.userId,
      fileId: dbFile._id,
    });

    return res.status(201).send({
      id: dbFile._id,
      userId: dbFile.userId,
      name: dbFile.name,
      type: dbFile.type,
      isPublic: dbFile.isPublic,
      parentId: dbFile.parentId,
    });
  }

  // Other methods (getShow, getIndex, putPublish, putUnpublish, etc.) will also need similar fixes if needed.
}

