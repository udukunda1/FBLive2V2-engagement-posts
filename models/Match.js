import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  eventID: { type: String, required: true, unique: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  status: { type: String, default: 'pending' },
  watch: { type: Boolean, default: false },
  kickoffannounced: { type: Boolean, default: false },
  htannounced: { type: Boolean, default: false },
  ftannounced: { type: Boolean, default: false },
  competition: { type: String, default: '' },
  evaluatedIncidents: { type: [String], default: [] } // Store incident IDs that have been evaluated
}, {
  timestamps: true
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
