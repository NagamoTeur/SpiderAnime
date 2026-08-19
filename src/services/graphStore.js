/**
 * Graph Store & State Manager for SpiderAnime
 * Decouples Spider Web Canvas (Toile) from User Watchlist (Collection),
 * and implements User Feedback (+1 Like / -1 Dislike) for personalized AI recommendations.
 */

import { getAnimeRecommendations, STARTER_ANIME_DATA } from './aniListApi.js';
import { authService } from './authService.js';
import { RecommendationEngine } from './recommendationEngine.js';

const STORAGE_PREFIX = 'spideranime_decoupled_data_v2_';

class GraphStore {
    constructor() {
        this.nodes = [];
        this.links = [];
        this.watchlist = [];
        this.selectedNodeId = null;
        this.listeners = new Set();
        this.initialized = false;

        authService.subscribe((user) => {
            this.switchUserAccount(user);
        });
    }

    getStorageKey() {
        const user = authService.getCurrentUser();
        return `${STORAGE_PREFIX}${user.id}`;
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.getSnapshot()));
    }

    getSnapshot() {
        return {
            nodes: this.nodes,
            links: this.links,
            watchlist: this.watchlist,
            selectedNodeId: this.selectedNodeId,
            selectedNode: this.getNode(this.selectedNodeId),
            currentUser: authService.getCurrentUser(),
            stats: this.getPokedexStats(),
            userPreferences: this.getUserPreferences()
        };
    }

    getUserPreferences() {
        const likedGenres = new Set();
        const dislikedGenres = new Set();

        this.watchlist.forEach(item => {
            const genres = (item.genres || []).map(g => (typeof g === 'object' ? g.name : g).toLowerCase());
            if (item.userFeedback === 1) {
                genres.forEach(g => likedGenres.add(g));
            } else if (item.userFeedback === -1) {
                genres.forEach(g => dislikedGenres.add(g));
            }
        });

        return { likedGenres, dislikedGenres };
    }

    getPokedexStats() {
        let completed = 0;
        let watching = 0;
        let planToWatch = 0;
        let dropped = 0;
        let totalWatchedEpisodes = 0;
        let totalLiked = 0;
        let totalDisliked = 0;

        this.watchlist.forEach(n => {
            const status = n.watchStatus || 'plan_to_watch';
            const watched = n.watchedEpisodes || 0;
            totalWatchedEpisodes += watched;

            if (status === 'completed') completed++;
            else if (status === 'watching') watching++;
            else if (status === 'plan_to_watch') planToWatch++;
            else if (status === 'dropped') dropped++;

            if (n.userFeedback === 1) totalLiked++;
            else if (n.userFeedback === -1) totalDisliked++;
        });

        const totalHours = Math.round((totalWatchedEpisodes * 24) / 60);

        return {
            completed,
            watching,
            planToWatch,
            dropped,
            total: this.watchlist.length,
            totalWatchedEpisodes,
            totalHours,
            totalLiked,
            totalDisliked
        };
    }

    getNode(nodeId) {
        return this.nodes.find(n => n.id === nodeId) || this.watchlist.find(w => w.id === nodeId) || null;
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        await this.loadCurrentUserData();
    }

    async switchUserAccount(user) {
        this.selectedNodeId = null;
        await this.loadCurrentUserData();
    }

    async loadCurrentUserData() {
        const key = this.getStorageKey();
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                const { nodes, links, watchlist } = JSON.parse(saved);
                if (nodes || watchlist) {
                    this.nodes = nodes || [];
                    this.links = links || [];
                    this.watchlist = watchlist || [];
                    this.notify();
                    return;
                }
            }
        } catch (e) {
            console.warn('[GraphStore] Error loading saved graph:', e);
        }

        await this.loadStarterGraph();
    }

    async loadStarterGraph() {
        this.nodes = [];
        this.links = [];
        this.watchlist = [];

        const dn = STARTER_ANIME_DATA[0];
        const aot = STARTER_ANIME_DATA[1];
        const oshi = STARTER_ANIME_DATA[2];

        // Seed initial Watchlist (Independent of canvas)
        this.setWatchlistStatus(aot, 'completed', 25, 1); // Liked (+1)
        this.setWatchlistStatus(dn, 'completed', 37, 1); // Liked (+1)
        this.setWatchlistStatus(oshi, 'watching', 6, 0); // Neutral (0)

        // Seed initial Canvas Toile
        const aotNode = this.addNode({
            mal_id: aot.id,
            id: `media_${aot.id}`,
            title: aot.title_english || aot.title,
            image_url: aot.image_url,
            score: aot.score,
            isFavorite: true,
            isRoot: true,
            genres: aot.genres.map(g => g.name || g),
            relevancePct: 100,
            anamorphScale: 1.2,
            x: 0,
            y: 0
        });

        const dnNode = this.addNode({
            mal_id: dn.id,
            id: `media_${dn.id}`,
            title: dn.title_english || dn.title,
            image_url: dn.image_url,
            score: dn.score,
            isFavorite: true,
            genres: dn.genres.map(g => g.name || g),
            relevancePct: 90,
            anamorphScale: 1.1,
            x: 180,
            y: -110
        });

        this.addLink(aotNode.id, dnNode.id, 'recommendation', 90);

        this.save();
        this.notify();
    }

    addNode(anime) {
        const id = anime.id || `media_${anime.mal_id || anime.id}`;
        let existing = this.nodes.find(n => n.id === id);

        if (!existing) {
            existing = {
                id,
                mal_id: anime.mal_id || anime.id,
                title: anime.title || anime.title_english,
                image_url: anime.image_url || anime.images?.jpg?.image_url || '',
                score: anime.score || 8.0,
                isFavorite: !!anime.isFavorite,
                isRoot: !!anime.isRoot,
                expanded: false,
                genres: anime.genres || [],
                relevancePct: anime.relevancePct || 85,
                anamorphScale: anime.anamorphScale || 1.0,
                pulseSpeed: anime.pulseSpeed || 0.015,
                x: anime.x !== undefined ? anime.x : (Math.random() - 0.5) * 400,
                y: anime.y !== undefined ? anime.y : (Math.random() - 0.5) * 400
            };
            this.nodes.push(existing);
        } else {
            if (anime.isFavorite !== undefined) existing.isFavorite = anime.isFavorite;
            if (anime.isRoot !== undefined) existing.isRoot = anime.isRoot;
            if (anime.relevancePct !== undefined) existing.relevancePct = anime.relevancePct;
        }

        return existing;
    }

    addLink(sourceId, targetId, type = 'recommendation', relevancePct = 80) {
        const linkId = `${sourceId}_${targetId}`;

        const exists = this.links.some(l =>
            (l.source === sourceId && l.target === targetId) ||
            (l.source === targetId && l.target === sourceId) ||
            (l.source.id === sourceId && l.target.id === targetId) ||
            (l.source.id === targetId && l.target.id === sourceId)
        );

        if (!exists) {
            const sourceNode = this.getNode(sourceId);
            const targetNode = this.getNode(targetId);

            let relMetrics = { scorePct: relevancePct, distance: 180, scale: 1.0, pulseSpeed: 0.015 };
            if (sourceNode && targetNode) {
                relMetrics = RecommendationEngine.computeRelevance(sourceNode, targetNode, 10, this.getUserPreferences());
            }

            this.links.push({
                id: linkId,
                source: sourceId,
                target: targetId,
                type,
                relevancePct: relMetrics.scorePct,
                distance: relMetrics.distance,
                pulseSpeed: relMetrics.pulseSpeed
            });

            if (targetNode && !targetNode.isFavorite) {
                targetNode.relevancePct = relMetrics.scorePct;
                targetNode.anamorphScale = relMetrics.scale;
                targetNode.pulseSpeed = relMetrics.pulseSpeed;
            }
        }
    }

    async addFavorite(animeData) {
        const node = this.addNode({
            ...animeData,
            isFavorite: true,
            isRoot: true,
            relevancePct: 100,
            anamorphScale: 1.2
        });

        // Also add to Watchlist as Watching if not present
        this.setWatchlistStatus(animeData, 'watching');

        this.selectNode(node.id);
        this.save();
        this.notify();

        await this.expandNode(node.id);
    }

    /**
     * Independent Watchlist Item Manager (Decoupled from Canvas)
     */
    setWatchlistStatus(animeData, status = 'plan_to_watch', watchedEp = 0, feedback = 0) {
        const id = animeData.id || `media_${animeData.mal_id || animeData.id}`;
        let item = this.watchlist.find(w => w.id === id);

        const totalEp = animeData.episodes || animeData.totalEpisodes || 12;
        let watched = watchedEp || animeData.watchedEpisodes || 0;
        if (status === 'completed') watched = totalEp;

        if (!item) {
            item = {
                id,
                mal_id: animeData.mal_id || animeData.id,
                title: animeData.title || animeData.title_english,
                image_url: animeData.image_url || animeData.images?.jpg?.image_url || '',
                score: animeData.score || 8.0,
                watchStatus: status,
                watchedEpisodes: watched,
                totalEpisodes: totalEp,
                userFeedback: feedback, // 1 = Like (+1), -1 = Dislike (-1), 0 = Neutral
                genres: animeData.genres || []
            };
            this.watchlist.push(item);
        } else {
            item.watchStatus = status;
            item.watchedEpisodes = watched;
            if (feedback !== undefined) item.userFeedback = feedback;
        }

        this.save();
        this.notify();
        return item;
    }

    /**
     * Set User Feedback (+1 Like / -1 Dislike) for personalized AI matching
     */
    setUserFeedback(animeId, feedbackValue) {
        let item = this.watchlist.find(w => w.id === animeId);

        if (!item) {
            const canvasNode = this.getNode(animeId);
            if (canvasNode) {
                item = this.setWatchlistStatus(canvasNode, 'plan_to_watch', 0, feedbackValue);
            }
        } else {
            item.userFeedback = feedbackValue;
        }

        this.save();
        this.notify();
    }

    updateWatchProgress(nodeId, status, watchedEp) {
        let item = this.watchlist.find(w => w.id === nodeId);
        if (!item) {
            const node = this.getNode(nodeId);
            if (node) item = this.setWatchlistStatus(node, status, watchedEp);
        } else {
            if (status) item.watchStatus = status;
            if (watchedEp !== undefined) {
                item.watchedEpisodes = Math.max(0, Math.min(item.totalEpisodes || 999, watchedEp));
                if (item.totalEpisodes && item.watchedEpisodes >= item.totalEpisodes) {
                    item.watchStatus = 'completed';
                }
            }
        }

        this.save();
        this.notify();
    }

    incrementEpisode(nodeId) {
        let item = this.watchlist.find(w => w.id === nodeId);
        if (item) {
            const newWatched = (item.watchedEpisodes || 0) + 1;
            this.updateWatchProgress(nodeId, item.watchStatus, newWatched);
        }
    }

    removeFromWatchlist(nodeId) {
        this.watchlist = this.watchlist.filter(w => w.id !== nodeId);
        this.save();
        this.notify();
    }

    async expandNode(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;

        node.expanded = true;

        try {
            const recs = await getAnimeRecommendations(node.mal_id || node.id);
            const count = Math.min(recs.length, 10);
            const angleStep = (Math.PI * 2) / count;

            const userPrefs = this.getUserPreferences();

            recs.slice(0, 10).forEach((rec, idx) => {
                const dummyTarget = { title: rec.title, score: 8.0, genres: node.genres };
                const rel = RecommendationEngine.computeRelevance(node, dummyTarget, rec.votes, userPrefs);

                const angle = idx * angleStep + (Math.random() * 0.15);
                const radius = rel.distance;

                const recNode = this.addNode({
                    mal_id: rec.mal_id || rec.id,
                    id: `media_${rec.mal_id || rec.id}`,
                    title: rec.title,
                    image_url: rec.image_url,
                    score: 7.8 + (Math.random() * 1.5),
                    isFavorite: false,
                    relevancePct: rel.scorePct,
                    anamorphScale: rel.scale,
                    pulseSpeed: rel.pulseSpeed,
                    x: (node.x || 0) + Math.cos(angle) * radius,
                    y: (node.y || 0) + Math.sin(angle) * radius
                });

                this.addLink(node.id, recNode.id, 'recommendation', rel.scorePct);
            });

            this.save();
            this.notify();
        } catch (error) {
            console.error('[GraphStore] Error expanding node:', error);
        }
    }

    toggleFavorite(nodeId) {
        const node = this.getNode(nodeId);
        if (node) {
            node.isFavorite = !node.isFavorite;
            if (node.isFavorite) {
                this.expandNode(nodeId);
            }
            this.save();
            this.notify();
        }
    }

    /**
     * Clears only the Spider Web Canvas Toile (Does NOT affect Watchlist!)
     */
    clearGraph() {
        this.nodes = [];
        this.links = [];
        this.selectedNodeId = null;
        this.save();
        this.notify();
    }

    removeNode(nodeId) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.links = this.links.filter(l =>
            (typeof l.source === 'object' ? l.source.id !== nodeId : l.source !== nodeId) &&
            (typeof l.target === 'object' ? l.target.id !== nodeId : l.target !== nodeId)
        );
        if (this.selectedNodeId === nodeId) {
            this.selectedNodeId = null;
        }
        this.save();
        this.notify();
    }

    selectNode(nodeId) {
        this.selectedNodeId = nodeId;
        this.notify();
    }

    save() {
        try {
            const serializableNodes = this.nodes.map(n => ({
                id: n.id,
                mal_id: n.mal_id,
                title: n.title,
                image_url: n.image_url,
                score: n.score,
                isFavorite: n.isFavorite,
                isRoot: n.isRoot,
                expanded: n.expanded,
                genres: n.genres,
                relevancePct: n.relevancePct,
                anamorphScale: n.anamorphScale,
                pulseSpeed: n.pulseSpeed,
                x: n.x,
                y: n.y
            }));

            const serializableLinks = this.links.map(l => ({
                id: l.id,
                source: typeof l.source === 'object' ? l.source.id : l.source,
                target: typeof l.target === 'object' ? l.target.id : l.target,
                type: l.type,
                relevancePct: l.relevancePct,
                distance: l.distance,
                pulseSpeed: l.pulseSpeed
            }));

            const serializableWatchlist = this.watchlist.map(w => ({
                id: w.id,
                mal_id: w.mal_id,
                title: w.title,
                image_url: w.image_url,
                score: w.score,
                watchStatus: w.watchStatus,
                watchedEpisodes: w.watchedEpisodes,
                totalEpisodes: w.totalEpisodes,
                userFeedback: w.userFeedback,
                genres: w.genres
            }));

            localStorage.setItem(this.getStorageKey(), JSON.stringify({
                nodes: serializableNodes,
                links: serializableLinks,
                watchlist: serializableWatchlist
            }));
        } catch (e) {
            console.warn('[GraphStore] Save failed:', e);
        }
    }
}

export const graphStore = new GraphStore();
