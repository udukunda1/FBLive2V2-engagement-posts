import express from 'express';
import {
    getAllTeams,
    createTeam,
    updateTeam,
    deleteTeam
} from '../controllers/teamController.js';

const router = express.Router();

router.get('/teams', getAllTeams);
router.post('/teams', createTeam);
router.patch('/teams/:id', updateTeam);
router.delete('/teams/:id', deleteTeam);

export default router;
