import express from 'express';
import { getAllMatches } from '../controllers/matchController.js';

const router = express.Router();

// Only endpoint needed - view all matches
router.get('/matches', getAllMatches);

export default router;
