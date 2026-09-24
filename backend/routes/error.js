const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const errorController = require('../controllers/errorController');

const router = express.Router();

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);

        if (errors.isEmpty()) return next();

        res.status(400).json({
            success: false,
            errors: errors.array().map((err) => err.msg),
        });
    };
};

// Public route, but attach user context when a valid token is present.
const attachUserIfPresent = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || !process.env.JWT_SECRET) {
        return next();
    }

    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_error) {
        // Ignore invalid token for this public endpoint.
    }

    next();
};

router.post(
    '/report',
    attachUserIfPresent,
    validate([
        body('url').optional().isString().isLength({ max: 2048 }),
        body('userAgent').optional().isString().isLength({ max: 1024 }),
        body('timestamp').optional().isISO8601().withMessage('timestamp must be a valid ISO datetime'),
    ]),
    errorController.reportClientError
);

module.exports = router;
