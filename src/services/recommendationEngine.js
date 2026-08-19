/**
 * RecommendationEngine.js
 * Advanced multi-criteria similarity algorithm for SpiderAnime
 * Computes Jaccard genre vectors, rating proximity, studio bonuses,
 * and incorporates User Like (+1) / Dislike (-1) preferences to personalize recommendations.
 */

export class RecommendationEngine {
    /**
     * Compute compatibility match percentage (0% to 100%) and Anamorphosis parameters,
     * factoring in User Feedback (+1 Like / -1 Dislike preferences).
     */
    static computeRelevance(sourceAnime, targetAnime, votes = 10, userPreferences = { likedGenres: new Set(), dislikedGenres: new Set() }) {
        if (!sourceAnime || !targetAnime) {
            return { scorePct: 75, distance: 180, scale: 1.0, pulseSpeed: 0.015 };
        }

        // 1. Jaccard Genre Vector Similarity (Weight: 45%)
        const genresA = new Set((sourceAnime.genres || []).map(g => (typeof g === 'object' ? g.name : g).toLowerCase()));
        const genresB = new Set((targetAnime.genres || []).map(g => (typeof g === 'object' ? g.name : g).toLowerCase()));

        let genreScore = 0.5;
        if (genresA.size > 0 && genresB.size > 0) {
            let intersection = 0;
            genresA.forEach(g => { if (genresB.has(g)) intersection++; });
            const union = new Set([...genresA, ...genresB]).size;
            genreScore = union > 0 ? (intersection / union) : 0.5;
        }

        // 2. Score Rating Proximity (Weight: 20%)
        const scoreA = Number(sourceAnime.score || 8.0);
        const scoreB = Number(targetAnime.score || 8.0);
        const scoreDiff = Math.abs(scoreA - scoreB);
        const ratingProximity = Math.max(0, 1.0 - (scoreDiff / 4.0));

        // 3. Studio Match Bonus (Weight: 15%)
        const studioA = (sourceAnime.studios?.[0]?.name || sourceAnime.studio || '').toLowerCase();
        const studioB = (targetAnime.studios?.[0]?.name || targetAnime.studio || '').toLowerCase();
        const studioBonus = (studioA && studioB && studioA === studioB) ? 1.0 : 0.0;

        // 4. Community Vote Confidence (Weight: 10%)
        const voteScore = Math.min(1.0, (votes || 5) / 30.0);

        // 5. Personal Like (+1) / Dislike (-1) Preference Boost (Weight: 10%)
        let preferenceModifier = 0.0;
        if (userPreferences) {
            genresB.forEach(g => {
                if (userPreferences.likedGenres?.has(g)) preferenceModifier += 0.12; // Boost for liked genres
                if (userPreferences.dislikedGenres?.has(g)) preferenceModifier -= 0.20; // Penalty for disliked genres
            });
        }

        // Combined Weighted Compatibility Match (0.0 to 1.0)
        let totalScore = (genreScore * 0.45) + (ratingProximity * 0.20) + (studioBonus * 0.15) + (voteScore * 0.10) + preferenceModifier;
        
        // Clamp and convert to percentage (min 45%, max 99%)
        const scorePct = Math.min(99, Math.max(45, Math.round(totalScore * 100)));

        // Anamorphosis Gravitational Distance Calculation
        const distance = Math.round(340 - (scorePct / 100) * 210);

        // Anamorphosis Card Scale Factor
        const scale = Number((0.75 + (scorePct / 100) * 0.40).toFixed(2));

        // Energy Filament Particle Speed
        const pulseSpeed = Number((0.006 + (scorePct / 100) * 0.025).toFixed(4));

        return {
            scorePct,
            distance,
            scale,
            pulseSpeed
        };
    }
}
