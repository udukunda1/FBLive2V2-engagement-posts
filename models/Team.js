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
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

const Team = mongoose.model('Team', teamSchema);
export default Team;
