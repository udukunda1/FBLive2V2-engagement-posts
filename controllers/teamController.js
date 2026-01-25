import Team from '../models/Team.js';

// Get all teams
export const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find().sort({ name: 1 });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching teams', details: error.message });
    }
};

// Create new team
export const createTeam = async (req, res) => {
    try {
        const { name, nickname, livescoreId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Team name is required' });
        }

        const team = new Team({
            name: name.trim(),
            nickname: nickname?.trim() || '',
            livescoreId: livescoreId?.trim() || ''
        });

        await team.save();
        res.status(201).json(team);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Team already exists' });
        }
        res.status(500).json({ error: 'Error creating team', details: error.message });
    }
};

// Update team
export const updateTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, nickname, livescoreId } = req.body;

        const team = await Team.findById(id);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        if (name && name.trim()) {
            team.name = name.trim();
        }
        if (nickname !== undefined) {
            team.nickname = nickname.trim();
        }
        if (livescoreId !== undefined) {
            team.livescoreId = livescoreId.trim();
        }

        await team.save();
        res.json(team);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Team name already exists' });
        }
        res.status(500).json({ error: 'Error updating team', details: error.message });
    }
};

// Delete team
export const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await Team.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting team', details: error.message });
    }
};
