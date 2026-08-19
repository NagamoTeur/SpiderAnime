/**
 * Graph Store & State Manager for SpiderAnime
 * Manages nodes, spider-web links, recommendations, PER-USER persistence,
 * and comprehensive Anime Watchlist & Pokédex Analytics.
 */

import { getAnimeRecommendations, STARTER_ANIME_DATA } from './aniListApi.js';
import { authService } from './authService.js';
import { RecommendationEngine } from './recommendationEngine.js';

const STORAGE_PREFIX = 'spideranime_watch_data_v1_';

class GraphStore {
    constructor() {
        this.nodes = [];
        this.links = [];
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
            selectedNodeId: this.selectedNodeId,
            selectedNode: this.getNode(this.selectedNodeId),
            currentUser: authService.getCurrentUser(),
            stats: this.getPokedexStats()
        };
    }

    getPokedexStats() {
        let completed = 0;
        let watching = 0;
        let planToWatch = 0;
        let dropped = 0;
        let totalWatchedEpisodes = 0;

        this.nodes.forEach(n => {
            const status = n.watchStatus || 'plan_to_watch';
            const watched = n.watchedEpisodes || 0;
            totalWatchedEpisodes += watched;

            if (status === 'completed') completed++;
            else if (status === 'watching') watching++;
            else if (status === 'plan_to_watch') planToWatch++;
            else if (status === 'dropped') dropped++;
        });

        const totalHours = Math.round((totalWatchedEpisodes * 24) / 60);

        return {
            completed,
            watching,
            planToWatch,
            dropped,
            total: this.nodes.length,
            totalWatchedEpisodes,
            totalHours
        };
    }

    getNode(nodeId) {
        return this.nodes.find(n => n.id === nodeId) || null;
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
                const { nodes, links } = JSON.parse(saved);
                if (nodes && nodes.length > 0) {
                    this.nodes = nodes;
                    this.links = links || [];
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

        const dn = STARTER_ANIME_DATA[0];
        const aot = STARTER_ANIME_DATA[1];
        const oshi = STARTER_ANIME_DATA[2];

        this.addNode({
            mal_id: aot.id,
            id: `media_${aot.id}`,
            title: aot.title_english || aot.title,
            image_url: aot.image_url,
            score: aot.score,
            userScore: 9,
            isFavorite: true,
            isRoot: true,
            watchStatus: 'completed',
            watchedEpisodes: 25,
            totalEpisodes: 25,
            genres: aot.genres.map(g => g.name || g),
            relevancePct: 100,
            anamorphScale: 1.2,
            x: 0,
            y: 0
        });

        this.addNode({
            mal_id: dn.id,
            id: `media_${dn.id}`,
            title: dn.title_english || dn.title,
            image_url: dn.image_url,
            score: dn.score,
            userScore: 10,
            isFavorite: true,
            watchStatus: 'completed',
            watchedEpisodes: 37,
            totalEpisodes: 37,
            genres: dn.genres.map(g => g.name || g),
            relevancePct: 90,
            anamorphScale: 1.1,
            x: 180,
            y: -110
        });

        this.addNode({
            mal_id: oshi.id,
            id: `media_${oshi.id}`,
            title: oshi.title_english || oshi.title,
            image_url: oshi.image_url,
            score: oshi.score,
            userScore: 8,
            isFavorite: false,
            watchStatus: 'watching',
            watchedEpisodes: 6,
            totalEpisodes: 11,
            genres: oshi.genres.map(g => g.name || g),
            relevancePct: 88,
            anamorphScale: 1.05,
            x: -190,
            y: 130
        });

        const aotId = `media_${aot.id}`;
        const dnId = `media_${dn.id}`;
        const oshiId = `media_${oshi.id}`;

        this.addLink(aotId, dnId, 'recommendation', 90);
        this.addLink(aotId, oshiId, 'recommendation', 88);

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
                userScore: anime.userScore || 0,
                isFavorite: !!anime.isFavorite,
                isRoot: !!anime.isRoot,
                expanded: false,
                watchStatus: anime.watchStatus || 'plan_to_watch',
                watchedEpisodes: anime.watchedEpisodes || 0,
                totalEpisodes: anime.totalEpisodes || anime.episodes || 12,
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
            if (anime.watchStatus !== undefined) existing.watchStatus = anime.watchStatus;
            if (anime.watchedEpisodes !== undefined) existing.watchedEpisodes = anime.watchedEpisodes;
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
                relMetrics = RecommendationEngine.computeRelevance(sourceNode, targetNode);
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
            watchStatus: 'watching',
            relevancePct: 100,
            anamorphScale: 1.2
        });

        this.selectNode(node.id);
        this.save();
        this.notify();

        await this.expandNode(node.id);
    }

    setWatchStatus(animeData, status) {
        const totalEp = animeData.episodes || animeData.totalEpisodes || 12;
        let watched = animeData.watchedEpisodes || 0;
        if (status === 'completed') watched = totalEp;

        const node = this.addNode({
            ...animeData,
            watchStatus: status,
            watchedEpisodes: watched,
            totalEpisodes: totalEp
        });

        this.save();
        this.notify();
        return node;
    }

    async expandNode(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;

        node.expanded = true;

        try {
            const recs = await getAnimeRecommendations(node.mal_id || node.id);
            const count = Math.min(recs.length, 10);
            const angleStep = (Math.PI * 2) / count;

            recs.slice(0, 10).forEach((rec, idx) => {
                const dummyTarget = { title: rec.title, score: 8.0, genres: node.genres };
                const rel = RecommendationEngine.computeRelevance(node, dummyTarget, rec.votes);

                const angle = idx * angleStep + (Math.random() * 0.15);
                const radius = rel.distance;

                const recNode = this.addNode({
                    mal_id: rec.mal_id || rec.id,
                    id: `media_${rec.mal_id || rec.id}`,
                    title: rec.title,
                    image_url: rec.image_url,
                    score: 7.8 + (Math.random() * 1.5),
                    isFavorite: false,
                    watchStatus: 'plan_to_watch',
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

    updateWatchProgress(nodeId, status, watchedEp, userScore) {
        const node = this.getNode(nodeId);
        if (!node) return;

        if (status) node.watchStatus = status;
        if (userScore !== undefined) node.userScore = userScore;
        if (watchedEp !== undefined) {
            node.watchedEpisodes = Math.max(0, Math.min(node.totalEpisodes || 999, watchedEp));
            if (node.totalEpisodes && node.watchedEpisodes >= node.totalEpisodes) {
                node.watchStatus = 'completed';
            }
        }

        this.save();
        this.notify();
    }

    incrementEpisode(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;

        const newWatched = (node.watchedEpisodes || 0) + 1;
        this.updateWatchProgress(nodeId, node.watchStatus, newWatched);
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

    clearGraph() {
        this.nodes = [];
        this.links = [];
        this.selectedNodeId = null;
        localStorage.setItem(this.getStorageKey(), JSON.stringify({ nodes: [], links: [] }));
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
                userScore: n.userScore,
                isFavorite: n.isFavorite,
                isRoot: n.isRoot,
                expanded: n.expanded,
                watchStatus: n.watchStatus,
                watchedEpisodes: n.watchedEpisodes,
                totalEpisodes: n.totalEpisodes,
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

            localStorage.setItem(this.getStorageKey(), JSON.stringify({
                nodes: serializableNodes,
                links: serializableLinks
            }));
        } catch (e) {
            console.warn('[GraphStore] Save failed:', e);
        }
    }
}

export const graphStore = new GraphStore();
