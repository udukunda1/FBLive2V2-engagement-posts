import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  eventID: { type: String, required: true, unique: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  homeTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  awayTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  matchDateTime: { type: Date }, // Match date and time (UTC timezone)
  status: {
    type: String,
    enum: ['pending', 'live', 'ended', 'skipped'],
    default: 'pending'
  },
  priority: {
    type: Number,
    default: 100  // Lower = higher priority
  },
  skippedReason: {
    type: String,
    default: ''
  },
  watch: {
    type: Boolean,
    default: false
  },
  kickoffannounced: { type: Boolean, default: false },
  htannounced: { type: Boolean, default: false },
  ftannounced: { type: Boolean, default: false },
  competition: { type: String, default: '' },
  evaluatedIncidents: { type: [String], default: [] }, // Store incident IDs that have been evaluated
  predictionScheduled: { type: Boolean, default: false } // Track if prediction post has been scheduled
}, {
  timestamps: true
});

const Match = mongoose.model('Match', matchSchema);
export default Match;
