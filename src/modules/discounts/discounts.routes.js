const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    getDiscountOffers,
    getDiscountOfferById,
    createDiscountOffer,
    updateDiscountOffer,
    deleteDiscountOffer,
    changeDiscountStatus,
    duplicateDiscountOffer,
    validatePromoCode
} = require('./discounts.controller');
const { validateDiscountOffer } = require('./discounts.validation');
const { verifyToken, optionalToken, authorizeRoles } = require('../../middleware/auth.middleware');

// Multer Storage Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../../public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'discount-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
const requireOwnerOrAdmin = [verifyToken, authorizeRoles(['OWNER', 'SUPER_ADMIN'])];

// Public browsing (offers are shown to customers) -- optionalToken lets owner-scoped filtering apply when logged in
router.get('/', optionalToken, getDiscountOffers);
router.post('/validate-promo', optionalToken, validatePromoCode);
router.get('/:id', optionalToken, getDiscountOfferById);

// Owner/Admin mutation routes
router.post(
    '/',
    ...requireOwnerOrAdmin,
    upload.fields([
        { name: 'banner', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ]),
    validateDiscountOffer,
    createDiscountOffer
);
router.put('/:id', ...requireOwnerOrAdmin, updateDiscountOffer);
router.delete('/:id', ...requireOwnerOrAdmin, deleteDiscountOffer);
router.patch('/:id/status', ...requireOwnerOrAdmin, changeDiscountStatus);
router.post('/:id/duplicate', ...requireOwnerOrAdmin, duplicateDiscountOffer);

module.exports = router;
