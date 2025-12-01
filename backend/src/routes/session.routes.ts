import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { startSession, actionSession, getSessionState, getNextQuestions } from '../controllers/session.controller';

const router = Router();
router.use(authenticateToken);

router.post('/start', startSession);
router.post('/action', actionSession);
router.get('/:sessionId/state', getSessionState);
router.get('/:sessionId/next-questions', getNextQuestions);

export default router;
