import Match from '../models/Match.js';
import Team from '../models/Team.js';
import axios from 'axios';
import { likeAndCommentOnFacebook } from '../utils/facebookInteractions.js';

// Store active prediction timeouts
const activePredictionTimeouts = new Map();

// Get team with highest priority from a match
async function getHighestPriorityTeam(match) {
    try {
        let homeTeam = null;
        let awayTeam = null;

        if (match.homeTeamId) {
            homeTeam = await Team.findById(match.homeTeamId);
        }
        if (match.awayTeamId) {
            awayTeam = await Team.findById(match.awayTeamId);
        }

        // If both teams exist, return the one with lower priority number (higher priority)
        if (homeTeam && awayTeam) {
            return homeTeam.priority <= awayTeam.priority ? match.homeTeam : match.awayTeam;
        }

        // If only one team exists, return that team
        if (homeTeam) return match.homeTeam;
        if (awayTeam) return match.awayTeam;

        // If neither team exists in database, default to home team
        return match.homeTeam;
    } catch (error) {
        console.error('Error getting highest priority team:', error.message);
        return match.homeTeam; // Default to home team on error
    }
}

// Randomly select a prediction from available options
async function selectRandomPrediction(match) {
    const highestPriorityTeam = await getHighestPriorityTeam(match);

    const predictions = [
        `${highestPriorityTeam} win`,
        `over 2.5`,
        `under 2.5`,
        `Yes`,
        `${highestPriorityTeam} halftime win`,
        `${highestPriorityTeam} win + over 2.5`
    ];

    const randomIndex = Math.floor(Math.random() * predictions.length);
    return predictions[randomIndex];
}

// Format the prediction post message
async function formatPredictionPost(match, prediction) {
    return `#Suredeal\n🚩 ${match.homeTeam} – ${match.awayTeam}\n⚽ ${prediction}\n\nMuterekeho`;
}

// Post prediction to Facebook
async function postPredictionToFacebook(message) {
    const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
    const page_id = process.env.FACEBOOK_PAGE_ID;

    if (!access_token || !page_id) {
        console.log('⚠️  No Facebook credentials found, skipping prediction post');
        return null;
    }

    try {
        const data = { message, access_token };
        const fbResponse = await axios.post(
            `https://graph.facebook.com/v23.0/${page_id}/feed`,
            null,
            { params: data }
        );
        const postId = fbResponse?.data?.id || null;
        console.log(`📘 Posted prediction to Facebook${postId ? ` (id: ${postId})` : ''}`);
        return postId;
    } catch (error) {
        console.error('❌ Error posting prediction to Facebook:', error.response?.data || error.message);
        return null;
    }
}

// Handle prediction post (called when timeout fires)
async function handlePredictionPost(matchId) {
    try {
        const match = await Match.findById(matchId);
        if (!match) {
            console.log(`⚠️  Match not found for prediction: ${matchId}`);
            return;
        }

        // Select random prediction
        const prediction = await selectRandomPrediction(match);

        // Format the message
        const message = await formatPredictionPost(match, prediction);

        // Post to Facebook
        const postId = await postPredictionToFacebook(message);

        // Like and comment on the post
        if (postId) {
            await likeAndCommentOnFacebook(postId, message, {
                type: 'prediction',
                match: `${match.homeTeam} vs ${match.awayTeam}`,
                prediction: prediction
            });
        }

        console.log(`✅ Prediction posted: ${match.homeTeam} vs ${match.awayTeam} - ${prediction}`);

        // Remove from active timeouts
        activePredictionTimeouts.delete(matchId.toString());
    } catch (error) {
        console.error(`❌ Error handling prediction post:`, error.message);
    }
}

// Schedule prediction posts for all matches
export async function schedulePredictionPosts() {
    try {
        console.log('\n📊 Scheduling prediction posts...');

        // Get all scheduled matches (not skipped) sorted by match time
        const scheduledMatches = await Match.find({
            status: { $in: ['pending', 'live'] },
            predictionScheduled: false
        }).sort({ matchDateTime: 1 });

        if (scheduledMatches.length === 0) {
            console.log('📭 No matches to schedule predictions for');
            return;
        }

        const now = new Date();
        let scheduledCount = 0;

        scheduledMatches.forEach((match, index) => {
            // Calculate posting time: 06:00, 07:00, 08:00, etc. UTC
            const postHour = 6 + index;
            const postTime = new Date();
            postTime.setUTCHours(postHour, 0, 0, 0);

            // If the time has already passed today, skip this prediction
            if (postTime <= now) {
                console.log(`⏭️  Skipped prediction ${index + 1} (time already passed: ${postHour}:00 UTC)`);
                return;
            }

            const delayMs = postTime - now;
            const hoursUntil = Math.floor(delayMs / (60 * 60 * 1000));
            const minutesUntil = Math.floor((delayMs % (60 * 60 * 1000)) / (60 * 1000));

            // Schedule the prediction post
            const timeoutId = setTimeout(async () => {
                await handlePredictionPost(match._id);
            }, delayMs);

            // Store timeout ID
            activePredictionTimeouts.set(match._id.toString(), timeoutId);

            // Mark as scheduled
            match.predictionScheduled = true;
            match.save();

            console.log(`⏰ Prediction scheduled: ${match.homeTeam} vs ${match.awayTeam} at ${postHour}:00 UTC (in ${hoursUntil}h ${minutesUntil}m)`);
            scheduledCount++;
        });

        if (scheduledCount === 0) {
            console.log('📭 No predictions scheduled (all times have passed)\n');
        } else {
            console.log(`✅ Scheduled ${scheduledCount} prediction posts\n`);
        }
    } catch (error) {
        console.error('❌ Error scheduling prediction posts:', error.message);
    }
}

// Cancel all prediction schedules
export async function cancelAllPredictionSchedules() {
    console.log('🛑 Cancelling all prediction schedules...');

    for (const [matchId, timeoutId] of activePredictionTimeouts.entries()) {
        clearTimeout(timeoutId);
    }
    activePredictionTimeouts.clear();

    console.log('✅ All prediction schedules cancelled');
}

// Re-schedule pending predictions (called on server startup)
export async function reschedulePendingPredictions() {
    try {
        console.log('\n📊 Re-scheduling pending predictions...');

        // Get all matches that haven't had predictions scheduled yet
        const matches = await Match.find({
            status: { $in: ['pending', 'live'] },
            predictionScheduled: false
        }).sort({ matchDateTime: 1 });

        if (matches.length === 0) {
            console.log('📭 No pending predictions to schedule');
            return;
        }

        const now = new Date();
        let scheduledCount = 0;

        matches.forEach((match, index) => {
            // Calculate posting time: 06:00, 07:00, 08:00, etc. UTC
            const postHour = 6 + index;
            const postTime = new Date();
            postTime.setUTCHours(postHour, 0, 0, 0);

            // Only schedule if the prediction time hasn't passed yet
            if (postTime > now) {
                const delayMs = postTime - now;
                const hoursUntil = Math.floor(delayMs / (60 * 60 * 1000));
                const minutesUntil = Math.floor((delayMs % (60 * 60 * 1000)) / (60 * 1000));

                // Schedule the prediction post
                const timeoutId = setTimeout(async () => {
                    await handlePredictionPost(match._id);
                }, delayMs);

                // Store timeout ID
                activePredictionTimeouts.set(match._id.toString(), timeoutId);

                // Mark as scheduled
                match.predictionScheduled = true;
                match.save();

                console.log(`⏰ Prediction re-scheduled: ${match.homeTeam} vs ${match.awayTeam} at ${postHour}:00 UTC (in ${hoursUntil}h ${minutesUntil}m)`);
                scheduledCount++;
            }
        });

        if (scheduledCount === 0) {
            console.log('📭 No predictions to re-schedule (all times have passed)');
        } else {
            console.log(`✅ Re-scheduled ${scheduledCount} prediction posts\n`);
        }
    } catch (error) {
        console.error('❌ Error re-scheduling prediction posts:', error.message);
    }
}
