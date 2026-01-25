import Match from '../models/Match.js';
import { processMatch } from '../controllers/matchController.js';

// Store active timeouts
const activeTimeouts = new Map();

// Store active polling intervals
const activeIntervals = new Map();

// Schedule a match to auto-start at its scheduled time
export async function scheduleMatch(match) {
    try {
        const now = new Date();
        const matchTime = new Date(match.matchDateTime);
        // console.log(matchTime, now);
        const delay = matchTime - now;

        // Only schedule future matches
        if (delay > 0) {
            const timeoutId = setTimeout(async () => {
                await handleMatchStart(match._id);
            }, delay);

            // Store timeout ID
            activeTimeouts.set(match._id.toString(), timeoutId);

            const minutesUntil = Math.round(delay / 60000);
            console.log(`⏰ Scheduled: ${match.homeTeam} vs ${match.awayTeam} in ${minutesUntil} minutes`);
        } else {
            console.log(`⚠️  Match already started: ${match.homeTeam} vs ${match.awayTeam}`);
        }
    } catch (error) {
        console.error(`❌ Error scheduling match:`, error.message);
    }
}

// Handle match start (called when setTimeout fires)
async function handleMatchStart(matchId) {
    try {
        const match = await Match.findById(matchId);
        if (!match) {
            console.log(`⚠️  Match not found: ${matchId}`);
            return;
        }

        // Auto-toggle watch to true
        match.watch = true;
        await match.save();

        console.log(`\n🚀 AUTO-STARTING MATCH: ${match.homeTeam} vs ${match.awayTeam}`);
        console.log(`   Competition: ${match.competition}`);
        console.log(`   Time: ${match.matchDateTime.toISOString()}\n`);

        // Start live tracking with polling
        await startLiveTracking(match);

        // Remove from active timeouts
        activeTimeouts.delete(matchId.toString());
    } catch (error) {
        console.error(`❌ Error handling match start:`, error.message);
    }
}

// Start live tracking with polling
async function startLiveTracking(match) {
    try {
        // Process match immediately
        await processMatch(match);

        // Set up polling interval (30 seconds)
        const intervalId = setInterval(async () => {
            try {
                // Get fresh match data
                const currentMatch = await Match.findById(match._id);

                // Stop if match ended or watch toggled off
                if (!currentMatch || currentMatch.status === 'ended' || !currentMatch.watch) {
                    console.log(`⏹️  Stopping live tracking: ${match.homeTeam} vs ${match.awayTeam}`);
                    clearInterval(intervalId);
                    activeIntervals.delete(match._id.toString());
                    return;
                }

                // Process match
                await processMatch(currentMatch);
            } catch (error) {
                console.error(`❌ Error in polling cycle:`, error.message);
            }
        }, 30000); // 30 seconds

        // Store interval ID
        activeIntervals.set(match._id.toString(), intervalId);

        console.log(`✅ Live tracking started with 30-second polling`);
    } catch (error) {
        console.error(`❌ Error starting live tracking:`, error.message);
    }
}

// Re-schedule all pending matches (called on server startup)
export async function scheduleAllPendingMatches() {
    try {
        const now = new Date();
        const pendingMatches = await Match.find({
            status: 'pending',
            matchDateTime: { $gt: now }
        });

        if (pendingMatches.length === 0) {
            console.log('📅 No pending matches to schedule');
            return;
        }

        console.log(`📅 Re-scheduling ${pendingMatches.length} pending matches...`);

        for (const match of pendingMatches) {
            await scheduleMatch(match);
        }

        console.log(`✅ All pending matches scheduled`);
    } catch (error) {
        console.error('❌ Error scheduling pending matches:', error.message);
    }
}

// Cancel a specific match schedule
export function cancelMatchSchedule(matchId) {
    const matchIdStr = matchId.toString();

    // Clear timeout
    if (activeTimeouts.has(matchIdStr)) {
        clearTimeout(activeTimeouts.get(matchIdStr));
        activeTimeouts.delete(matchIdStr);
    }

    // Clear interval
    if (activeIntervals.has(matchIdStr)) {
        clearInterval(activeIntervals.get(matchIdStr));
        activeIntervals.delete(matchIdStr);
    }
}

// Cancel all schedules (called when deleting all matches)
export async function cancelAllSchedules() {
    console.log('🛑 Cancelling all active schedules...');

    // Clear all timeouts
    for (const [matchId, timeoutId] of activeTimeouts.entries()) {
        clearTimeout(timeoutId);
    }
    activeTimeouts.clear();

    // Clear all intervals
    for (const [matchId, intervalId] of activeIntervals.entries()) {
        clearInterval(intervalId);
    }
    activeIntervals.clear();

    console.log('✅ All schedules cancelled');
}
