const path = require('path');

const uploadSingleMedia = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const isVideo = req.file.mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(req.file.originalname);
        const fileUrl = `/uploads/${req.file.filename}`;

        return res.status(200).json({
            success: true,
            message: `${isVideo ? 'Video' : 'Photo'} uploaded successfully`,
            data: {
                url: fileUrl,
                type: isVideo ? 'video' : 'image',
                thumbnail: isVideo ? '' : fileUrl,
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('Error uploading single file:', error);
        return res.status(500).json({ success: false, message: 'Server Error during upload' });
    }
};

const uploadMultipleMedia = (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => {
            const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(file.originalname);
            const fileUrl = `/uploads/${file.filename}`;
            return {
                url: fileUrl,
                type: isVideo ? 'video' : 'image',
                thumbnail: isVideo ? '' : fileUrl,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size
            };
        });

        return res.status(200).json({
            success: true,
            message: 'Files uploaded successfully',
            data: uploadedFiles
        });
    } catch (error) {
        console.error('Error uploading multiple files:', error);
        return res.status(500).json({ success: false, message: 'Server Error during upload' });
    }
};

const fs = require('fs');

const deleteMediaFile = (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename) {
            return res.status(400).json({ success: false, message: 'Filename is required' });
        }

        const safeFilename = path.basename(filename);
        const filePath = path.join(__dirname, '../../../public/uploads', safeFilename);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return res.status(200).json({ success: true, message: `File ${safeFilename} deleted successfully from disk.` });
        } else {
            return res.status(200).json({ success: true, message: `File reference removed.` });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return res.status(500).json({ success: false, message: 'Server Error during file deletion' });
    }
};

module.exports = {
    uploadSingleMedia,
    uploadMultipleMedia,
    deleteMediaFile
};
