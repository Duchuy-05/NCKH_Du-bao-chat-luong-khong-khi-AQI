import { Router } from 'express';
import { healthAdviceController } from '../controllers/healthAdvice.controller';

const router = Router();
router.get('/', (req, res, next) => healthAdviceController.getHealthAdvice(req, res, next));

export default router;
