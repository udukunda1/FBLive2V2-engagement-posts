import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    nickname: {
        type: String,
        default: '',
        trim: true
    },
    livescoreId: {
        type: String,
        default: ''
    },
    priority: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
    },
    trackStatus: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Team = mongoose.model('Team', teamSchema);
export default Team;
