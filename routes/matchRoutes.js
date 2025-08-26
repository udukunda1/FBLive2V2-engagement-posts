import express from 'express';
import {
  searchAndSaveMatch,
  getAllMatches,
  removeMatch,
  toggleWatch,
  updateTeamNames
} from '../controllers/matchController.js';

const router = express.Router();

router.post('/match/search', searchAndSaveMatch);
router.get('/matches', getAllMatches);
router.delete('/match/:id', removeMatch);
router.patch('/match/:id/toggle-watch', toggleWatch);
router.patch('/match/:id/teams', updateTeamNames);

export default router;
