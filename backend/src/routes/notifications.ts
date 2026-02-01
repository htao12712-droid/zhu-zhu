import { Router } from 'express';
import notificationService from '../services/notificationService';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { type, read, limit = 20, offset = 0 } = req.query;

    const result = await notificationService.getUserNotifications(userId!, {
      type: type as any,
      read: read as any,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const count = notificationService.getUnreadCount(userId!);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    await notificationService.markAsRead(userId!, [id]);
    res.json({ message: '标记已读成功' });
  } catch (error) {
    next(error);
  }
});

router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;

    await notificationService.markAllAsRead(userId!);
    res.json({ message: '全部标记已读成功' });
  } catch (error) {
    next(error);
  }
});

router.delete('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: '请提供要删除的通知ID列表' });
    }

    await notificationService.deleteNotifications(userId!, ids);
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

export default router;
