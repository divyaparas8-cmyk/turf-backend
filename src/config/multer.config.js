const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDirectory = path.join(__dirname, '../../public/uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedImageExts = /jpeg|jpg|png|webp|gif|svg/;
    const allowedVideoExts = /mp4|webm|ogg|mov|mkv|avi/;
    
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isImage = allowedImageExts.test(ext) || file.mimetype.startsWith('image/');
    const isVideo = allowedVideoExts.test(ext) || file.mimetype.startsWith('video/');

    if (isImage || isVideo) {
        return cb(null, true);
    } else {
        cb(new Error('Only photos (JPEG, PNG, WEBP, GIF) and videos (MP4, WEBM, MOV, MKV) are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit to support video uploads
    }
});

module.exports = upload;
