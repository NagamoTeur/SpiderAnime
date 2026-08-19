/**
 * RecommendationEngine.js
 * Advanced multi-criteria similarity algorithm for AniGraph
 * Computes Jaccard genre vectors, rating proximity, studio bonuses,
 * and generates Anamorphosis gravitational distance & scale parameters.
 */

export class RecommendationEngine {
    /**
     * Compute compatibility match percentage (0% to 100%) and Anamorphosis parameters
     */
    static computeRelevance(sourceAnime, targetAnime, votes = 10) {
        if (!sourceAnime || !targetAnime) {
            return { scorePct: 75, distance: 180, scale: 1.0, pulseSpeed: 0.015 };
        }

        // 1. Jaccard Genre Vector Similarity (Weight: 50%)
        const genresA = new Set((sourceAnime.genres || []).map(g => (typeof g === 'object' ? g.name : g).toLowerCase()));
        const genresB = new Set((targetAnime.genres || []).map(g => (typeof g === 'object' ? g.name : g).toLowerCase()));

        let genreScore = 0.5;
        if (genresA.size > 0 && genresB.size > 0) {
            let intersection = 0;
            genresA.forEach(g => { if (genresB.has(g)) intersection++; });
            const union = new Set([...genresA, ...genresB]).size;
            genreScore = union > 0 ? (intersection / union) : 0.5;
        }

        // 2. Score Rating Proximity (Weight: 25%)
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

        // Combined Weighted Compatibility Match (0.0 to 1.0)
        let totalScore = (genreScore * 0.50) + (ratingProximity * 0.25) + (studioBonus * 0.15) + (voteScore * 0.10);
        
        // Clamp and convert to percentage (min 55%, max 99%)
        const scorePct = Math.min(99, Math.max(55, Math.round(totalScore * 100)));

        // Anamorphosis Gravitational Distance Calculation:
        // High match (95%) -> Pull close to parent (130px)
        // Low match (55%) -> Drift far out to periphery (300px)
        const distance = Math.round(340 - (scorePct / 100) * 210);

        // Anamorphosis Card Scale Factor:
        // High match -> Larger card (1.18x), Low match -> Smaller card (0.86x)
        const scale = Number((0.75 + (scorePct / 100) * 0.40).toFixed(2));

        // Energy Filament Particle Speed:
        // High match -> Fast energy pulse (0.035), Low match -> Slow pulse (0.008)
        const pulseSpeed = Number((0.006 + (scorePct / 100) * 0.025).toFixed(4));

        return {
            scorePct,
            distance,
            scale,
            pulseSpeed
        };
    }
}
