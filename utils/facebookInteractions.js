import axios from 'axios';

/**
 * Generate an AI comment using Gemini API with intelligent fallback
 * @param {string} updateText - The post content
 * @param {object} context - Context object with type and additional info
 * @returns {Promise<string>} - Generated comment text
 */
async function generateGeminiComment(updateText, context = {}) {
    let comment = null;

    // Context-aware fallback generator
    const craftFallbackComment = (text, ctx) => {
        const type = ctx.type || 'general';

        // Fallback comments for engagement posts
        if (type === 'engagement') {
            const fallbacks = [
                "What's your take on this? Drop your thoughts! 💭",
                "This hits different! What do you think? 🎯",
                "Real talk—who can relate? Share below! 😅",
                "Big question! What's your answer? 🤔",
                "Let's hear it—what do you say? 💬",
                "Interesting one! Your thoughts? 🔥",
                "This one's for you! What's your take? 😎",
                "Drop your answer below! Let's discuss 💯",
                "Good question! What would you do? 🎲",
                "Your turn—what's your opinion on this? 💰"
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        // Fallback comments for prediction posts
        if (type === 'prediction') {
            const fallbacks = [
                "Solid prediction! Who's backing this one? 🔥",
                "Confident call—what are your thoughts? ⚽",
                "This could hit! What's your prediction? 💰",
                "Strong pick! Anyone else feeling this? 🎯",
                "Interesting choice! What do you think? 🤔",
                "Bold prediction! Who agrees? 😎",
                "This one looks promising! Your take? 💪",
                "Good call! What's your bet? 🎲",
                "Feeling this prediction! Who's in? 🔥",
                "Smart pick! Share your thoughts below ⚡"
            ];
            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        // Fallback for match posts (keeping original logic)
        const normalized = (text || '').trim();
        const lower = normalized.toLowerCase();
        const has = (s) => lower.includes(s);

        let home = '';
        let away = '';
        try {
            const m = normalized.match(/([A-Za-z .]+)\s+\d+\s*[–-]\s*\d+\s+([A-Za-z .]+)/);
            if (m) {
                home = m[1].trim();
                away = m[2].trim();
            }
        } catch (_) { }

        if (has('var')) return 'VAR drama—fair or harsh? What do you think today?';
        if (has('red card')) return 'Red card changes everything—was it deserved? Your thoughts?';
        if (has('yellow card')) return 'Discipline matters—smart fouls or needless cards? Share your take.';
        if (has('kick off') || has('kickoff')) {
            if (home && away) return `Game on—${home} vs ${away}! Who takes the win?`;
            return 'Game on! Who takes the win today—home or away?';
        }
        if (has('ht')) return 'Halftime—what adjustments would you make for the comeback?';
        if (has('aet') || has('ft') || has('pen:') || has('after extra time')) return 'Full-time—player of the match? Drop your pick below!';
        if (has('goal') || has('live')) {
            if (home && away) return `Momentum shift—${home} or ${away} now in control?`;
            return 'What a moment—who grabs momentum now? Thoughts below, fans?';
        }
        // Generic engaging fallback (~10 words)
        return 'Big moment—what do you think? Confidence levels right now?';
    };

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            // Customize prompt based on context type
            let prompt = '';

            if (context.type === 'engagement') {
                prompt = `Write a short, engaging 10-word comment for this betting engagement question: "${updateText}". Make it relatable and encourage discussion. (reply with the comment only)`;
            } else if (context.type === 'prediction') {
                const matchInfo = context.match || 'this match';
                const predictionInfo = context.prediction || 'prediction';
                prompt = `Write a short, engaging 10-word comment for this football prediction: "${matchInfo} - ${predictionInfo}". Make it either a question or show confidence. (reply with the comment only)`;
            } else {
                // Match posts or default
                const competition = context.competition || 'Unknown';
                prompt = `Competition: ${competition}\nWrite a short, engaging 10 words comment for Facebook fans based on this football update: "${updateText}". Make it either a question or a compliment (choose one). (reply with the comment only)`;
            }

            const body = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            };

            const response = await axios.post(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
                body,
                {
                    headers: { 'Content-Type': 'application/json' },
                    params: { 'key': apiKey }
                }
            );

            const result = response?.data;
            const candidate = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (candidate) {
                comment = candidate;
                console.log('✅ Gemini comment added:', comment);
            } else {
                console.log('⚠️ Gemini API returned no candidates');
            }
        } else {
            console.log('⚠️ Gemini API key undefined');
        }
    } catch (error) {
        console.log('⚠️ Gemini API error, using fallback comment:', error.message);
    }

    if (!comment) {
        comment = craftFallbackComment(updateText, context);
        console.log('📝 Using fallback comment:', comment);
    }
    return comment;
}

/**
 * Like a Facebook post and add an AI-generated comment
 * @param {string} postId - Facebook post ID
 * @param {string} updateText - The post content for comment generation
 * @param {object} context - Context object (type, competition, match, prediction, etc.)
 */
export async function likeAndCommentOnFacebook(postId, updateText, context = {}) {
    const access_token = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!postId || !access_token) return;

    try {
        // Like the post
        await axios.post(`https://graph.facebook.com/v23.0/${postId}/likes`, null, { params: { access_token } });
        console.log('👍 Post liked successfully');
    } catch (err) {
        console.log('⚠️ Error liking post:', err.response?.data || err.message);
    }

    try {
        // Generate comment and post it
        const commentText = await generateGeminiComment(updateText, context);
        if (commentText) {
            await axios.post(`https://graph.facebook.com/v23.0/${postId}/comments`, null, {
                params: { access_token, message: commentText }
            });
            console.log('💬 Comment posted successfully');
        }
    } catch (err) {
        console.log('⚠️ Error commenting on post:', err.response?.data || err.message);
    }
}
