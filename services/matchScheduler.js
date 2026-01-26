import Match from '../models/Match.js';
import Team from '../models/Team.js';
import { processMatch } from '../controllers/matchController.js';

// Store active timeouts
const activeTimeouts = new Map();

// Store active polling intervals
const activeIntervals = new Map();

// Calculate match priority based on team rankings
async function getMatchPriority(match) {
    try {
        let homeTeam = null;
        let awayTeam = null;

        if (match.homeTeamId) {
            homeTeam = await Team.findById(match.homeTeamId);
        }
        if (match.awayTeamId) {
            awayTeam = await Team.findById(match.awayTeamId);
        }

        if (homeTeam && awayTeam) {
            // Both teams tracked: average priority
            return (homeTeam.priority + awayTeam.priority) / 2;
        } else if (homeTeam || awayTeam) {
            // Only one team tracked: (11 + priority) / 2
            const trackedTeam = homeTeam || awayTeam;
            return (11 + trackedTeam.priority) / 2;
        }

        return 100; // No tracked teams (lowest priority)
    } catch (error) {
        console.error('Error calculating match priority:', error.message);
        return 100;
    }
}

// Get matches within ±2 hours of given time
async function getActiveMatches(matchTime) {
    const twoHoursBefore = new Date(matchTime.getTime() - (2 * 60 * 60 * 1000));
    const twoHoursAfter = new Date(matchTime.getTime() + (2 * 60 * 60 * 1000));

    return await Match.find({
        matchDateTime: { $gte: twoHoursBefore, $lte: twoHoursAfter },
        status: { $in: ['pending', 'live'] }
    });
}

// Check if match should be scheduled based on concurrent limit
async function shouldScheduleMatch(match, matchTime) {
    const activeMatches = await getActiveMatches(matchTime);

    // Filter out the current match if it's already in the list
    const otherMatches = activeMatches.filter(m => m._id.toString() !== match._id.toString());

    if (otherMatches.length < 3) {
        return { shouldSchedule: true, reason: 'Under limit' };
    }

    if (otherMatches.length === 3) {
        const newPriority = await getMatchPriority(match);

        // Sort descending (higher priority number = lower priority)
        // When tied, bump the most recently created match (last scheduled)
        const sorted = otherMatches.sort((a, b) => {
            if (a.priority === b.priority) {
                return new Date(b.createdAt) - new Date(a.createdAt); // Descending - most recent first
            }
            return b.priority - a.priority; // Descending
        });

        const lowestPriorityMatch = sorted[0];

        if (newPriority < lowestPriorityMatch.priority) {
            return {
                shouldSchedule: true,
                reason: 'Higher priority (lower number)',
                bumpMatch: lowestPriorityMatch
            };
        }
    }

    return { shouldSchedule: false, reason: 'Limit reached (3/3)' };
}

// Schedule a match with priority-based limit checking
export async function scheduleMatch(match) {
    try {
        const now = new Date();
        const matchTime = new Date(match.matchDateTime);
        const delay = matchTime - now;

        // If match has already started, schedule it immediately
        if (delay <= 0) {
            console.log(`⚠️  Match already started: ${match.homeTeam} vs ${match.awayTeam} - Starting immediately`);

            // Calculate and store priority
            const priority = await getMatchPriority(match);
            match.priority = priority;
            await match.save();

            // Start the match immediately
            await handleMatchStart(match._id);
            return;
        }

        // Calculate and store priority
        const priority = await getMatchPriority(match);
        match.priority = priority;
        await match.save();

        // Check if should schedule based on concurrent limit
        const decision = await shouldScheduleMatch(match, matchTime);

        if (!decision.shouldSchedule) {
            // Mark as skipped
            match.status = 'skipped';
            match.skippedReason = decision.reason;
            await match.save();
            console.log(`⏭️  SKIPPED: ${match.homeTeam} vs ${match.awayTeam} - ${decision.reason}`);
            return;
        }

        // If bumping another match
        if (decision.bumpMatch) {
            const bumpedMatch = decision.bumpMatch;
            bumpedMatch.status = 'skipped';
            bumpedMatch.skippedReason = `Bumped by higher priority match`;
            await bumpedMatch.save();

            // Cancel its schedule
            cancelMatchSchedule(bumpedMatch._id);

            console.log(`🔄 BUMPED: ${bumpedMatch.homeTeam} vs ${bumpedMatch.awayTeam} (priority ${bumpedMatch.priority})`);
        }

        // Schedule the match
        const timeoutId = setTimeout(async () => {
            await handleMatchStart(match._id);
        }, delay);

        // Store timeout ID
        activeTimeouts.set(match._id.toString(), timeoutId);

        const minutesUntil = Math.round(delay / 60000);
        console.log(`⏰ Scheduled: ${match.homeTeam} vs ${match.awayTeam} (priority ${priority}) in ${minutesUntil} minutes`);
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
        const matchIdStr = match._id.toString();

        // Check if interval already exists for this match
        if (activeIntervals.has(matchIdStr)) {
            console.log(`⚠️  Interval already exists for ${match.homeTeam} vs ${match.awayTeam}, clearing old interval`);
            clearInterval(activeIntervals.get(matchIdStr));
            activeIntervals.delete(matchIdStr);
        }

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
        activeIntervals.set(matchIdStr, intervalId);

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
