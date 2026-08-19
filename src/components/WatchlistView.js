/**
 * WatchlistView.js
 * Decoupled Pokédex Watchlist & Anime Collection Manager for SpiderAnime.
 * Features Like (+1 👍) / Dislike (-1 👎) interactive feedback for AI matching,
 * watch analytics, +1 episode quick increment, and explicit "Tisser dans ma Toile" action.
 */

import { graphStore } from '../services/graphStore.js';
import { switchTab } from './Navbar.js';
import { confirmModal } from './ConfirmModal.js';
import { escapeHTML } from '../utils/security.js';

export class WatchlistView {
    constructor() {
        this.container = document.getElementById('view-watchlist');
        this.activeFilter = 'all';

        this.init();
        graphStore.subscribe(() => {
            if (this.container && !this.container.classList.contains('pointer-events-none')) {
                this.render();
            }
        });
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    render() {
        if (!this.container) return;
        const snapshot = graphStore.getSnapshot();
        const watchlist = snapshot.watchlist || [];
        const stats = snapshot.stats;

        const filteredList = watchlist.filter(n => {
            if (this.activeFilter === 'all') return true;
            if (this.activeFilter === 'liked') return n.userFeedback === 1;
            return (n.watchStatus || 'plan_to_watch') === this.activeFilter;
        });

        this.container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-8 pb-24">
                
                <!-- Page Header -->
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
                    <div>
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/40">
                                <span class="material-symbols-outlined text-[20px]">collections_bookmark</span>
                            </div>
                            <h1 class="font-display-lg text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Ma Collection Anime (Watchlist)</h1>
                        </div>
                        <p class="text-on-surface-variant text-sm mt-1">Collection indépendante. Notez les animés (+1 / -1) pour affiner vos recommandations IA !</p>
                    </div>

                    <!-- Watch Status & Like Filter Tabs -->
                    <div class="flex flex-wrap gap-2">
                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'all' ? 'bg-primary text-on-primary font-bold shadow-[0_0_10px_rgba(208,188,255,0.3)]' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="all">Tous (${watchlist.length})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'liked' ? 'bg-tertiary text-on-tertiary font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="liked">👍 Aimés (${stats.totalLiked})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'watching' ? 'bg-secondary text-on-secondary font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="watching">🟢 En cours (${stats.watching})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'completed' ? 'bg-surface-tint text-on-primary font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="completed">🟣 Terminés (${stats.completed})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'plan_to_watch' ? 'bg-surface-variant text-on-surface font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="plan_to_watch">🟡 À voir (${stats.planToWatch})</button>
                    </div>
                </div>

                <!-- Pokédex Watch Analytics Dashboard -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-primary text-[28px]">movie</span>
                        <span class="font-display-lg text-2xl font-bold text-on-surface block">${stats.total}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Animés en Collection</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-secondary text-[28px]">live_tv</span>
                        <span class="font-display-lg text-2xl font-bold text-secondary block">${stats.totalWatchedEpisodes}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Épisodes Visionnés</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-tertiary text-[28px]">thumb_up</span>
                        <span class="font-display-lg text-2xl font-bold text-tertiary block">${stats.totalLiked}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Coup de Cœur (+1)</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-surface-tint text-[28px]">schedule</span>
                        <span class="font-display-lg text-2xl font-bold text-surface-tint block">${stats.totalHours}h</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Temps d'Écran Estimé</span>
                    </div>
                </div>

                <!-- Watchlist Cards Grid -->
                ${filteredList.length === 0 ? `
                    <div class="text-center py-20 bg-surface-container/40 rounded-3xl border border-outline-variant/20 space-y-3">
                        <span class="material-symbols-outlined text-5xl text-outline/40">bookmark_border</span>
                        <h3 class="font-headline-md text-lg text-on-surface font-semibold">Aucun animé dans cette catégorie</h3>
                        <p class="font-body-md text-xs text-outline max-w-sm mx-auto">Ajoutez des animés depuis le catalogue Découverte pour construire votre collection.</p>
                        <button id="btn-go-discover" class="px-5 py-2.5 rounded-xl font-label-mono text-xs font-bold bg-primary text-on-primary hover:bg-primary-fixed transition-all inline-flex items-center gap-2 mt-2">
                            <span class="material-symbols-outlined text-[18px]">explore</span>
                            <span>Explorer le Catalogue</span>
                        </button>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        ${filteredList.map(node => this.renderWatchlistCardHTML(node)).join('')}
                    </div>
                `}

            </div>
        `;

        this.bindEvents();
    }

    renderWatchlistCardHTML(node) {
        const title = escapeHTML(node.title);
        const img = escapeHTML(node.image_url);
        const score = node.score ? `★ ${node.score}` : 'N/A';
        const status = node.watchStatus || 'plan_to_watch';
        const watched = node.watchedEpisodes || 0;
        const totalEp = node.totalEpisodes || 12;
        const progressPct = Math.min(100, Math.round((watched / (totalEp || 1)) * 100));

        const feedback = node.userFeedback || 0;

        let statusBadge = '';
        if (status === 'watching') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-label-mono bg-secondary/20 text-secondary border border-secondary/40 font-bold">🟢 En cours</span>`;
        } else if (status === 'completed') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-label-mono bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold">🟣 Terminé</span>`;
        } else if (status === 'plan_to_watch') {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-label-mono bg-primary/20 text-primary border border-primary/40 font-bold">🟡 À voir</span>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-label-mono bg-error/20 text-error border border-error/40 font-bold">🔴 Abandonné</span>`;
        }

        return `
            <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 watchlist-card group" data-id="${node.id}">
                <div class="flex items-start gap-4">
                    <img src="${img}" alt="${title}" class="w-16 h-22 object-cover rounded-xl border border-outline-variant/40 shadow-md flex-shrink-0 group-hover:scale-105 transition-transform" />
                    
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-1 mb-1">
                            ${statusBadge}
                            <span class="font-label-mono text-[11px] text-tertiary font-bold">${score}</span>
                        </div>
                        <h3 class="font-headline-md text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">${title}</h3>
                        <p class="font-label-mono text-[11px] text-outline mt-1">${watched} / ${totalEp} épisodes</p>

                        <!-- Progress Bar -->
                        <div class="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden mt-2">
                            <div class="h-full bg-gradient-to-r from-secondary to-tertiary" style="width: ${progressPct}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Feedback (+1 Like / -1 Dislike) Toolbar -->
                <div class="flex items-center justify-between p-2 rounded-xl bg-surface-container-high/40 border border-outline-variant/20 text-xs">
                    <span class="font-label-mono text-[11px] text-outline">Avis & Suggestions :</span>
                    <div class="flex items-center gap-1.5">
                        <button class="btn-feedback-like px-2 py-1 rounded-lg font-label-mono font-bold text-[11px] transition-all ${
                            feedback === 1 
                            ? 'bg-tertiary text-on-tertiary shadow-[0_0_10px_rgba(78,222,163,0.4)]' 
                            : 'bg-surface-variant/80 text-outline hover:text-tertiary hover:bg-white/10'
                        }" data-node-id="${node.id}">
                            👍 +1 J'aime
                        </button>

                        <button class="btn-feedback-dislike px-2 py-1 rounded-lg font-label-mono font-bold text-[11px] transition-all ${
                            feedback === -1 
                            ? 'bg-error text-white shadow-[0_0_10px_rgba(255,77,77,0.4)]' 
                            : 'bg-surface-variant/80 text-outline hover:text-error hover:bg-white/10'
                        }" data-node-id="${node.id}">
                            👎 -1 Pas pour moi
                        </button>
                    </div>
                </div>

                <!-- Action Toolbar -->
                <div class="flex items-center justify-between pt-1 gap-2">
                    <div class="flex items-center gap-1">
                        <button class="btn-increment-ep px-2.5 py-1 rounded-lg text-xs font-label-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary hover:text-on-secondary transition-all flex items-center gap-1" data-node-id="${node.id}">
                            <span class="material-symbols-outlined text-[14px]">add</span>
                            <span>+1 Ep</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-1.5">
                        <button class="btn-weave-canvas px-2.5 py-1 rounded-lg text-xs font-label-mono font-semibold bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-on-primary transition-all flex items-center gap-1" data-node-id="${node.id}">
                            <span class="material-symbols-outlined text-[14px]">polyline</span>
                            <span>Tisser</span>
                        </button>

                        <button class="btn-delete-node p-1.5 rounded-lg text-xs font-label-mono text-outline hover:text-error hover:bg-error/10 transition-all" title="Supprimer de ma Watchlist" data-node-id="${node.id}">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.container.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeFilter = btn.dataset.filter;
                this.render();
            });
        });

        this.container.querySelector('#btn-go-discover')?.addEventListener('click', () => {
            switchTab('discover');
        });

        // Feedback (+1 Like / -1 Dislike) Buttons
        this.container.querySelectorAll('.btn-feedback-like').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                const node = graphStore.getNode(nodeId);
                const currentFeedback = node?.userFeedback || 0;
                graphStore.setUserFeedback(nodeId, currentFeedback === 1 ? 0 : 1);
            });
        });

        this.container.querySelectorAll('.btn-feedback-dislike').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                const node = graphStore.getNode(nodeId);
                const currentFeedback = node?.userFeedback || 0;
                graphStore.setUserFeedback(nodeId, currentFeedback === -1 ? 0 : -1);
            });
        });

        // +1 Episode Increment
        this.container.querySelectorAll('.btn-increment-ep').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                graphStore.incrementEpisode(nodeId);
            });
        });

        // Explicitly weave to Canvas Toile
        this.container.querySelectorAll('.btn-weave-canvas').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                const item = graphStore.getNode(nodeId);
                if (item) {
                    graphStore.addFavorite(item);
                    switchTab('graph');
                }
            });
        });

        // Delete from watchlist
        this.container.querySelectorAll('.btn-delete-node').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                const node = graphStore.getNode(nodeId);
                if (node) {
                    confirmModal.ask({
                        title: 'Retirer de ma Collection ?',
                        message: `Voulez-vous supprimer "${node.title}" de votre Watchlist ?`,
                        posterUrl: node.image_url,
                        onConfirm: () => graphStore.removeFromWatchlist(nodeId)
                    });
                }
            });
        });

        this.container.querySelectorAll('.watchlist-card').forEach(card => {
            card.addEventListener('click', () => {
                const nodeId = card.dataset.id;
                graphStore.selectNode(nodeId);
            });
        });
    }
}
