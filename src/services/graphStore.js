/**
 * Graph Store & State Manager for AniGraph
 * Manages nodes, spider-web links, recommendations, PER-USER persistence,
 * Pokédex Watch Tracking, and Anamorphosis gravitational metrics.
 */

import { getAnimeRecommendations, STARTER_ANIME_DATA } from './jikanApi.js';
import { authService } from './authService.js';
import { RecommendationEngine } from './recommendationEngine.js';

const STORAGE_PREFIX = 'anigraph_spider_data_';

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

        this.nodes.forEach(n => {
            if (n.watchStatus === 'completed') completed++;
            else if (n.watchStatus === 'watching') watching++;
            else if (n.watchStatus === 'plan_to_watch') planToWatch++;
        });

        return { completed, watching, planToWatch, total: this.nodes.length };
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
                if (nodes) {
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

        const aot = STARTER_ANIME_DATA[3];
        const frieren = STARTER_ANIME_DATA[5];
        const demonSlayer = STARTER_ANIME_DATA[10];
        const jujutsu = STARTER_ANIME_DATA[11];
        const cyberpunk = STARTER_ANIME_DATA[12];

        this.addNode({
            mal_id: aot.mal_id,
            title: aot.title_english || aot.title,
            image_url: aot.images.jpg.image_url,
            score: aot.score,
            isFavorite: true,
            isRoot: true,
            watchStatus: 'completed',
            watchedEpisodes: aot.episodes || 25,
            totalEpisodes: aot.episodes || 25,
            genres: aot.genres.map(g => g.name || g),
            relevancePct: 100,
            anamorphScale: 1.2,
            x: 0,
            y: 0
        });

        this.addNode({
            mal_id: frieren.mal_id,
            title: frieren.title_english || frieren.title,
            image_url: frieren.images.jpg.image_url,
            score: frieren.score,
            isFavorite: true,
            watchStatus: 'watching',
            watchedEpisodes: 18,
            totalEpisodes: 28,
            genres: frieren.genres.map(g => g.name || g),
            relevancePct: 92,
            anamorphScale: 1.1,
            x: 170,
            y: -100
        });

        this.addNode({
            mal_id: demonSlayer.mal_id,
            title: demonSlayer.title_english || demonSlayer.title,
            image_url: demonSlayer.images.jpg.image_url,
            score: demonSlayer.score,
            isFavorite: false,
            watchStatus: 'plan_to_watch',
            watchedEpisodes: 0,
            totalEpisodes: 26,
            genres: demonSlayer.genres.map(g => g.name || g),
            relevancePct: 88,
            anamorphScale: 1.05,
            x: -180,
            y: 140
        });

        this.addNode({
            mal_id: jujutsu.mal_id,
            title: jujutsu.title_english || jujutsu.title,
            image_url: jujutsu.images.jpg.image_url,
            score: jujutsu.score,
            isFavorite: false,
            watchStatus: 'plan_to_watch',
            watchedEpisodes: 0,
            totalEpisodes: 24,
            genres: jujutsu.genres.map(g => g.name || g),
            relevancePct: 85,
            anamorphScale: 1.0,
            x: 160,
            y: 150
        });

        this.addNode({
            mal_id: cyberpunk.mal_id,
            title: cyberpunk.title_english || cyberpunk.title,
            image_url: cyberpunk.images.jpg.image_url,
            score: cyberpunk.score,
            isFavorite: false,
            watchStatus: 'completed',
            watchedEpisodes: 10,
            totalEpisodes: 10,
            genres: cyberpunk.genres.map(g => g.name || g),
            relevancePct: 78,
            anamorphScale: 0.95,
            x: -210,
            y: -120
        });

        const aotId = `mal_${aot.mal_id}`;
        const frierenId = `mal_${frieren.mal_id}`;
        const dsId = `mal_${demonSlayer.mal_id}`;
        const jjId = `mal_${jujutsu.mal_id}`;
        const cbId = `mal_${cyberpunk.mal_id}`;

        this.addLink(aotId, frierenId, 'recommendation', 92);
        this.addLink(aotId, dsId, 'recommendation', 88);
        this.addLink(aotId, jjId, 'recommendation', 85);
        this.addLink(dsId, jjId, 'similarity', 90);
        this.addLink(aotId, cbId, 'recommendation', 78);

        this.save();
        this.notify();
    }

    addNode(anime) {
        const id = `mal_${anime.mal_id}`;
        let existing = this.nodes.find(n => n.id === id);

        if (!existing) {
            existing = {
                id,
                mal_id: anime.mal_id,
                title: anime.title || anime.title_english,
                image_url: anime.image_url || anime.images?.jpg?.image_url || '',
                score: anime.score || 8.0,
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

    async expandNode(nodeId) {
        const node = this.getNode(nodeId);
        if (!node) return;

        node.expanded = true;

        try {
            const recs = await getAnimeRecommendations(node.mal_id);
            const count = Math.min(recs.length, 10);
            const angleStep = (Math.PI * 2) / count;

            recs.slice(0, 10).forEach((rec, idx) => {
                const dummyTarget = { title: rec.title, score: 8.0, genres: node.genres };
                const rel = RecommendationEngine.computeRelevance(node, dummyTarget, rec.votes);

                const angle = idx * angleStep + (Math.random() * 0.15);
                const radius = rel.distance;

                const recNode = this.addNode({
                    mal_id: rec.mal_id,
                    title: rec.title,
                    image_url: rec.image_url,
                    score: 7.5 + (Math.random() * 1.5),
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

    updateWatchProgress(nodeId, status, watchedEp) {
        const node = this.getNode(nodeId);
        if (!node) return;

        if (status) node.watchStatus = status;
        if (watchedEp !== undefined) {
            node.watchedEpisodes = Math.max(0, Math.min(node.totalEpisodes || 999, watchedEp));
            if (node.totalEpisodes && node.watchedEpisodes >= node.totalEpisodes) {
                node.watchStatus = 'completed';
            }
        }

        this.save();
        this.notify();
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
