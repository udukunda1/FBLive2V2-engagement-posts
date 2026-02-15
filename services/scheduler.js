import cron from 'node-cron';
import axios from 'axios';
import Match from '../models/Match.js';
import Team from '../models/Team.js';
import { scheduleMatch, cancelAllSchedules } from './matchScheduler.js';
import { schedulePredictionPosts, cancelAllPredictionSchedules } from './predictionScheduler.js';
import { scheduleEngagementPosts, cancelAllEngagementSchedules } from './engagementScheduler.js';

// Format date for Livescore API (YYYYMMDD)
export function formatDateForAPI(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Parse Livescore timestamp to UTC Date
export function parseMatchDateTime(esdString) {
    // Input: 20260125160000 (YYYYMMDDHHMMSS)
    const str = esdString.toString();
    const year = parseInt(str.substring(0, 4));
    const month = parseInt(str.substring(4, 6)) - 1;
    const day = parseInt(str.substring(6, 8));
    const hour = parseInt(str.substring(8, 10));
    const minute = parseInt(str.substring(10, 12));

    // Create UTC date (no timezone adjustment)
    return new Date(Date.UTC(year, month, day, hour, minute));
}

// Get team display name (nickname if exists, else original name)
// Works for all teams regardless of trackStatus
async function getTeamDisplayName(teamName) {
    const team = await Team.findOne({ name: teamName });
    if (team) {
        return team.nickname || team.name;
    }
    return teamName;
}

// Get team ID if exists (regardless of trackStatus)
// This allows non-tracked teams to still contribute priority to matches
async function getTeamId(teamName) {
    const team = await Team.findOne({ name: teamName });
    return team ? team._id : null;
}

// Delete all matches and cancel schedules
export async function deleteAllMatches() {
    try {
        console.log('🗑️  Deleting all matches...');

        // Cancel all active schedules
        await cancelAllSchedules();
        await cancelAllPredictionSchedules();
        await cancelAllEngagementSchedules();

        // Delete all matches
        const result = await Match.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} matches`);
    } catch (error) {
        console.error('❌ Error deleting matches:', error.message);
    }
}

// Fetch today's matches for tracked teams
export async function fetchTodayMatches() {
    try {
        console.log('📥 Fetching today\'s matches...');

        // Get all tracked teams (only those with trackStatus: true)
        const trackedTeams = await Team.find({ trackStatus: true });
        if (trackedTeams.length === 0) {
            console.log('⚠️  No teams marked for tracking. Add teams and enable tracking first!');
            return;
        }

        const teamNames = trackedTeams.map(t => t.name);
        console.log(`🎯 Tracking ${teamNames.length} teams: ${teamNames.join(', ')}`);

        // Get today's date in UTC
        const today = new Date();
        const dateString = formatDateForAPI(today);
        const url = `https://prod-cdn-mev-api.livescore.com/v1/api/app/date/soccer/${dateString}/locale=en`;

        console.log(`🌐 Fetching from Livescore API: ${dateString}`);
        const response = await axios.get(url);

        if (!response.data || !response.data.Stages) {
            console.log('⚠️  No data from Livescore API');
            return;
        }

        // Filter and save matches
        let matchCount = 0;

        for (const stage of response.data.Stages) {
            const competition = stage.Snm || stage.CompN || 'Unknown';

            if (!stage.Events || stage.Events.length === 0) continue;

            for (const event of stage.Events) {
                try {
                    const homeTeam = event.T1?.[0]?.Nm;
                    const awayTeam = event.T2?.[0]?.Nm;

                    if (!homeTeam || !awayTeam) continue;

                    // Check if either team is tracked
                    const isTracked = teamNames.includes(homeTeam) || teamNames.includes(awayTeam);

                    if (isTracked) {
                        // Get display names and IDs
                        const homeTeamDisplay = await getTeamDisplayName(homeTeam);
                        const awayTeamDisplay = await getTeamDisplayName(awayTeam);
                        const homeTeamId = await getTeamId(homeTeam);
                        const awayTeamId = await getTeamId(awayTeam);

                        // Parse match datetime
                        const matchDateTime = event.Esd ? parseMatchDateTime(event.Esd) : null;
                        // console.log(matchDateTime.toISOString() , event.Esd);

                        // Create match
                        const match = await Match.create({
                            eventID: event.Eid,
                            homeTeam: homeTeamDisplay,
                            awayTeam: awayTeamDisplay,
                            homeTeamId,
                            awayTeamId,
                            matchDateTime,
                            competition,
                            status: 'pending',
                            watch: false,
                            kickoffannounced: false,
                            htannounced: false,
                            ftannounced: false,
                            evaluatedIncidents: []
                        });

                        // Schedule the match
                        await scheduleMatch(match);

                        matchCount++;
                        console.log(`✅ Saved: ${homeTeamDisplay} vs ${awayTeamDisplay} (${competition})`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing match:`, error.message);
                }
            }
        }

        console.log(`\n🎉 Fetched ${matchCount} matches for ${dateString}`);
    } catch (error) {
        console.error('❌ Error fetching matches:', error.message);
    }
}

// Post today's scheduled matches to Facebook
async function postTodayMatchesToFacebook() {
    try {
        const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
        const page_id = process.env.FACEBOOK_PAGE_ID;

        if (!access_token || !page_id) {
            console.log('⚠️  No Facebook credentials found, skipping post');
            return;
        }

        // Get all scheduled matches (not skipped)
        const scheduledMatches = await Match.find({
            status: { $in: ['pending', 'live'] }
        }).sort({ matchDateTime: 1 });

        if (scheduledMatches.length === 0) {
            console.log('📭 No matches to post to Facebook');
            return;
        }

        // Build the message
        let message = `⚽ TODAY'S MATCHES ⚽\n\n`;

        scheduledMatches.forEach((match, index) => {
            const matchTime = new Date(match.matchDateTime);
            // Add 2 hours for local time (UTC+2)
            const localTime = new Date(matchTime.getTime() + (2 * 60 * 60 * 1000));
            const hours = String(localTime.getUTCHours()).padStart(2, '0');
            const minutes = String(localTime.getUTCMinutes()).padStart(2, '0');

            message += `${index + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
            message += `   🏆 ${match.competition}\n`;
            message += `   🕐 ${hours}:${minutes}\n\n`;
        });

        message += `Total: ${scheduledMatches.length} match${scheduledMatches.length > 1 ? 'es' : ''} scheduled\n`;
        message += `\n#Football #Soccer #LiveMatches`;

        // Post to Facebook
        const data = { message, access_token };
        const fbResponse = await axios.post(
            `https://graph.facebook.com/v23.0/${page_id}/feed`,
            null,
            { params: data }
        );

        const postId = fbResponse?.data?.id || null;
        console.log(`📘 Posted today's matches to Facebook${postId ? ` (id: ${postId})` : ''}`);

        return postId;
    } catch (error) {
        console.error('❌ Error posting to Facebook:', error.response?.data || error.message);
        return null;
    }
}

// Run daily task
export async function runDailyTask() {
    console.log('\n═══════════════════════════════════════');
    console.log('🕐 DAILY TASK STARTED');
    console.log('═══════════════════════════════════════\n');

    await deleteAllMatches();
    await fetchTodayMatches();
    await postTodayMatchesToFacebook();
    await schedulePredictionPosts();
    await scheduleEngagementPosts();

    console.log('\n═══════════════════════════════════════');
    console.log('✅ DAILY TASK COMPLETED');
    console.log('═══════════════════════════════════════\n');
}

// Initialize scheduler
export function initializeScheduler() {
    // Run at 00:00 UTC daily
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Cron triggered at 00:00 UTC');
        await runDailyTask();
    }, {
        timezone: 'UTC'
    });

    console.log('📅 Scheduler initialized - Daily task at 00:00 UTC');
}
