const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get user notifications
 * GET /api/notifications
 */
exports.getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = 'false' } = req.query;

    const result = await notificationService.getUserNotifications(
        userId,
        parseInt(page),
        parseInt(limit),
        unreadOnly === 'true'
    );

    res.json({
        success: true,
        ...result
    });
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
exports.markAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    res.json({
        success: true,
        notification
    });
});

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    await notificationService.markAllAsRead(userId);

    res.json({
        success: true,
        message: 'All notifications marked as read'
    });
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);

    res.json({
        success: true,
        message: 'Notification deleted'
    });
});

/**
 * Get unread count
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const count = await notificationService.getUnreadCount(userId);

    res.json({
        success: true,
        unreadCount: count
    });
});
