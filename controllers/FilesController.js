import RedisClient from '../utils/redis'; // Redis client for managing cache
import { v4 as uuidv4 } from 'uuid'; // UUID for generating unique IDs
import DBClient from '../utils/db'; // Database client for MongoDB

const { ObjectId } = require('mongodb'); // MongoDB's ObjectId for querying
const fs = require('fs'); // File system module for managing files
const mime = require('mime-types'); // Module for determining MIME type of files
const Bull = require('bull'); // Queue system for job processing

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
    await fs.mkdir(pathDir, { recursive: true }, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

    await fs.writeFile(pathFile, buff, (error) => {
      if (error) return res.status(400).send({ error: error.message });
      return true;
    });

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

  // Show file details
  static async getShow(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const idFile = req.params.id || '';
    const fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: 'Not found' });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // List files (pagination)
  static async getIndex(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const pagination = req.query.page || 0;

    const aggregationMatch = { $and: [{ parentId }] };
    let aggregateData = [
      { $match: aggregationMatch },
      { $skip: pagination * 20 },
      { $limit: 20 },
    ];
    if (parentId === 0) aggregateData = [{ $skip: pagination * 20 }, { $limit: 20 }];

    const files = await DBClient.db
      .collection('files')
      .aggregate(aggregateData);
    const filesArray = [];
    await files.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return res.send(filesArray);
  }

  // Publish a file (make it public)
  static async putPublish(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const idFile = req.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update({ _id: ObjectId(idFile) }, { $set: { isPublic: true } });
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // Unpublish a file (make it private)
  static async putUnpublish(req, res) {
    const token = req.header('X-Token') || null;
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const redisToken = await RedisClient.get(`auth_${token}`);
    if (!redisToken) return res.status(401).send({ error: 'Unauthorized' });

    const user = await DBClient.db
      .collection('users')
      .findOne({ _id: ObjectId(redisToken) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    const idFile = req.params.id || '';

    let fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });
    if (!fileDocument) return res.status(404).send({ error: 'Not found' });

    await DBClient.db
      .collection('files')
      .update(
        { _id: ObjectId(idFile), userId: user._id },
        { $set: { isPublic: false } },
      );
    fileDocument = await DBClient.db
      .collection('files')
      .findOne({ _id: ObjectId(idFile), userId: user._id });

    return res.send({
      id: fileDocument._id,
      userId: fileDocument.userId,
      name: fileDocument.name,
      type: fileDocument.type,
      isPublic: fileDocument.isPublic,
      parentId: fileDocument.parentId,
    });
  }

  // Download a file
  static async getFile(req, res) {
    const idFile = req.params.id || '';
    const size = req.query.size || 0;

    const file

