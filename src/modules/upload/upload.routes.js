const express = require('express');
const upload = require('../../config/multer.config');
const { uploadSingleMedia, uploadMultipleMedia, deleteMediaFile } = require('./upload.controller');

const router = express.Router();

// Upload single photo or video
router.post('/', upload.single('file'), uploadSingleMedia);
router.post('/single', upload.single('file'), uploadSingleMedia);

// Upload multiple photos or videos
router.post('/multiple', upload.array('files', 10), uploadMultipleMedia);

// Delete file from disk
router.delete('/:filename', deleteMediaFile);

module.exports = router;
