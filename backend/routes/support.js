const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const supportController = require('../controllers/supportController');

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
    '/create-ticket',
    attachUserIfPresent,
    validate([
        body('category')
            .optional()
            .isIn(['general', 'technical', 'appointment', 'account', 'data', 'other'])
            .withMessage('Invalid category'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('email').isEmail().withMessage('Valid email is required'),
    ]),
    supportController.createTicket
);

module.exports = router;
