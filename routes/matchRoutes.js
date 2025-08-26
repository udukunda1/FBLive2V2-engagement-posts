import express from 'express';
import {
  searchAndSaveMatch,
  getAllMatches,
  removeMatch,
  toggleWatch,
  updateTeamNames,
  startLiveMatches,
  stopLiveMatches
} from '../controllers/matchController.js';

const router = express.Router();

router.post('/match/search', searchAndSaveMatch);
router.get('/matches', getAllMatches);
router.delete('/match/:id', removeMatch);
router.patch('/match/:id/toggle-watch', toggleWatch);
router.patch('/match/:id/teams', updateTeamNames);
router.post('/matches/start-live', startLiveMatches);
router.post('/matches/stop-live', stopLiveMatches);

export default router;
