import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as videoController from '../controllers/video.controller';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

router.post('/generate', videoController.generateVideo);
router.get('/today', videoController.getTodayVideo);
router.get('/status/:jobId', videoController.getJobStatus);
router.get('/list', videoController.listUserJobs);

export default router;

