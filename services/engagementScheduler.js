import { engagementPosts } from '../data/engagementPosts.js';
import axios from 'axios';
import { likeAndCommentOnFacebook } from '../utils/facebookInteractions.js';

// Store active engagement post timeouts
const activeEngagementTimeouts = new Map();

// Get current day of month (1-31)
function getCurrentDay() {
    const now = new Date();
    return now.getDate(); // Returns 1-31
}

// Get posts for current day
function getPostsForToday() {
    const day = getCurrentDay();
    const dayKey = `day${day}`;
    return engagementPosts[dayKey] || engagementPosts.day1; // Fallback to day1 if not found
}

// Post engagement content to Facebook
async function postEngagementToFacebook(message) {
    const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
    const page_id = process.env.FACEBOOK_PAGE_ID;

    if (!access_token || !page_id) {
        console.log('⚠️  No Facebook credentials found, skipping engagement post');
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
        console.log(`📘 Posted engagement question to Facebook${postId ? ` (id: ${postId})` : ''}`);
        return postId;
    } catch (error) {
        console.error('❌ Error posting engagement to Facebook:', error.response?.data || error.message);
        return null;
    }
}

// Handle engagement post (called when timeout fires)
async function handleEngagementPost(question, index) {
    try {
        // Post to Facebook
        const postId = await postEngagementToFacebook(question);

        // Like and comment on the post
        if (postId) {
            await likeAndCommentOnFacebook(postId, question, { type: 'engagement' });
        }

        console.log(`✅ Engagement post ${index + 1}/10 published`);

        // Remove from active timeouts
        activeEngagementTimeouts.delete(`post_${index}`);
    } catch (error) {
        console.error(`❌ Error handling engagement post ${index + 1}:`, error.message);
    }
}

// Schedule engagement posts for the day
export async function scheduleEngagementPosts() {
    try {
        console.log('\n📊 Scheduling daily engagement posts...');

        const posts = getPostsForToday();
        const day = getCurrentDay();

        console.log(`📅 Using posts for Day ${day}`);

        // Start time: 06:30 UTC
        const now = new Date();
        const startHour = 6; // 06:30 UTC
        const startMinute = 30;

        for (let i = 0; i < posts.length; i++) {
            // Calculate posting time: 06:30, 07:30, 08:30, ..., 15:30 UTC
            const postHour = startHour + i;
            const postTime = new Date();
            postTime.setUTCHours(postHour, startMinute, 0, 0);

            // If the time has already passed today, skip this post
            if (postTime <= now) {
                console.log(`⏭️  Skipped post ${i + 1}/10 (time already passed: ${postHour}:${startMinute} UTC)`);
                continue;
            }

            const delay = postTime - now;
            const hoursUntil = Math.floor(delay / (60 * 60 * 1000));
            const minutesUntil = Math.floor((delay % (60 * 60 * 1000)) / (60 * 1000));

            // Schedule the post
            const timeoutId = setTimeout(async () => {
                await handleEngagementPost(posts[i], i);
            }, delay);

            // Store timeout ID
            activeEngagementTimeouts.set(`post_${i}`, timeoutId);

            console.log(`⏰ Post ${i + 1}/10 scheduled at ${postHour}:${String(startMinute).padStart(2, '0')} UTC (in ${hoursUntil}h ${minutesUntil}m)`);
        }

        console.log(`✅ Scheduled engagement posts for Day ${day}\n`);
    } catch (error) {
        console.error('❌ Error scheduling engagement posts:', error.message);
    }
}

// Cancel all engagement post schedules
export async function cancelAllEngagementSchedules() {
    console.log('🛑 Cancelling all engagement post schedules...');

    for (const [key, timeoutId] of activeEngagementTimeouts.entries()) {
        clearTimeout(timeoutId);
    }
    activeEngagementTimeouts.clear();

    console.log('✅ All engagement post schedules cancelled');
}

// Re-schedule engagement posts (called on server startup)
export async function rescheduleEngagementPosts() {
    try {
        console.log('\n📊 Re-scheduling engagement posts...');

        const posts = getPostsForToday();
        const day = getCurrentDay();

        console.log(`📅 Using posts for Day ${day}`);

        // Start time: 06:30 UTC
        const now = new Date();
        const startHour = 6; // 06:30 UTC
        const startMinute = 30;

        let scheduledCount = 0;

        for (let i = 0; i < posts.length; i++) {
            // Calculate posting time: 06:30, 07:30, 08:30, ..., 15:30 UTC
            const postHour = startHour + i;
            const postTime = new Date();
            postTime.setUTCHours(postHour, startMinute, 0, 0);

            // Only schedule if the time hasn't passed yet
            if (postTime > now) {
                const delay = postTime - now;
                const hoursUntil = Math.floor(delay / (60 * 60 * 1000));
                const minutesUntil = Math.floor((delay % (60 * 60 * 1000)) / (60 * 1000));

                // Schedule the post
                const timeoutId = setTimeout(async () => {
                    await handleEngagementPost(posts[i], i);
                }, delay);

                // Store timeout ID
                activeEngagementTimeouts.set(`post_${i}`, timeoutId);

                console.log(`⏰ Post ${i + 1}/10 re-scheduled at ${postHour}:${String(startMinute).padStart(2, '0')} UTC (in ${hoursUntil}h ${minutesUntil}m)`);
                scheduledCount++;
            }
        }

        if (scheduledCount === 0) {
            console.log('📭 No engagement posts to re-schedule (all times have passed)');
        } else {
            console.log(`✅ Re-scheduled ${scheduledCount} engagement posts\n`);
        }
    } catch (error) {
        console.error('❌ Error re-scheduling engagement posts:', error.message);
    }
}
