/**
 * WatchlistView.js
 * Dedicated Pokédex Watchlist & Anime Collection Manager for SpiderAnime.
 * Renders watch stats analytics (Total episodes, Hours spent), status filtering tabs,
 * quick +1 episode increments, personal rating stars, and instant Spider Web navigation.
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
        const nodes = snapshot.nodes || [];
        const stats = snapshot.stats;

        const filteredNodes = nodes.filter(n => {
            if (this.activeFilter === 'all') return true;
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
                            <h1 class="font-display-lg text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Ma Watchlist Anime</h1>
                        </div>
                        <p class="text-on-surface-variant text-sm mt-1">Gérez votre collection d'animés, suivez votre avancement et complétez votre Pokédex.</p>
                    </div>

                    <!-- Watch Status Filter Tabs -->
                    <div class="flex flex-wrap gap-2">
                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'all' ? 'bg-primary text-on-primary font-bold shadow-[0_0_10px_rgba(208,188,255,0.3)]' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="all">Tous (${nodes.length})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'watching' ? 'bg-secondary text-on-secondary font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="watching">🟢 En cours (${stats.watching})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'completed' ? 'bg-tertiary text-on-tertiary font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="completed">🟣 Terminés (${stats.completed})</button>

                        <button class="filter-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-label-mono font-medium transition-all ${
                            this.activeFilter === 'plan_to_watch' ? 'bg-surface-variant text-on-surface font-bold shadow' : 'bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface'
                        }" data-filter="plan_to_watch">🟡 À voir (${stats.planToWatch})</button>
                    </div>
                </div>

                <!-- Pokédex Watch Analytics Dashboard Cards -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-primary text-[28px]">movie</span>
                        <span class="font-display-lg text-2xl font-bold text-on-surface block">${stats.total}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Animés au Pokédex</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-secondary text-[28px]">live_tv</span>
                        <span class="font-display-lg text-2xl font-bold text-secondary block">${stats.totalWatchedEpisodes}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Épisodes Visionnés</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-tertiary text-[28px]">schedule</span>
                        <span class="font-display-lg text-2xl font-bold text-tertiary block">${stats.totalHours}h</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Temps d'Écran Estimé</span>
                    </div>

                    <div class="glass-card rounded-2xl p-4 border border-outline-variant/30 text-center space-y-1">
                        <span class="material-symbols-outlined text-surface-tint text-[28px]">verified</span>
                        <span class="font-display-lg text-2xl font-bold text-surface-tint block">${stats.completed}</span>
                        <span class="font-label-mono text-[11px] text-outline uppercase block">Séries Complétées</span>
                    </div>
                </div>

                <!-- Watchlist Cards Grid -->
                ${filteredNodes.length === 0 ? `
                    <div class="text-center py-20 bg-surface-container/40 rounded-3xl border border-outline-variant/20 space-y-3">
                        <span class="material-symbols-outlined text-5xl text-outline/40">bookmark_border</span>
                        <h3 class="font-headline-md text-lg text-on-surface font-semibold">Aucun animé dans cette catégorie</h3>
                        <p class="font-body-md text-xs text-outline max-w-sm mx-auto">Parcourez l'onglet Découverte ou cherchez un animé pour l'ajouter à votre Watchlist.</p>
                        <button id="btn-go-discover" class="px-5 py-2.5 rounded-xl font-label-mono text-xs font-bold bg-primary text-on-primary hover:bg-primary-fixed transition-all inline-flex items-center gap-2 mt-2">
                            <span class="material-symbols-outlined text-[18px]">explore</span>
                            <span>Explorer le Catalogue</span>
                        </button>
                    </div>
                ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        ${filteredNodes.map(node => this.renderWatchlistCardHTML(node)).join('')}
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

                <!-- Action Toolbar -->
                <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20 gap-2">
                    <div class="flex items-center gap-1">
                        <button class="btn-increment-ep px-2.5 py-1 rounded-lg text-xs font-label-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary hover:text-on-secondary transition-all flex items-center gap-1" data-node-id="${node.id}">
                            <span class="material-symbols-outlined text-[14px]">add</span>
                            <span>+1 Épisode</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-1.5">
                        <button class="btn-view-canvas p-1.5 rounded-lg text-xs font-label-mono text-outline hover:text-primary hover:bg-white/10 transition-all" title="Voir sur la Toile d'Araignée" data-node-id="${node.id}">
                            <span class="material-symbols-outlined text-[18px]">polyline</span>
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
        // Status filter tabs
        this.container.querySelectorAll('.filter-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeFilter = btn.dataset.filter;
                this.render();
            });
        });

        // Go to discover button
        this.container.querySelector('#btn-go-discover')?.addEventListener('click', () => {
            switchTab('discover');
        });

        // +1 Episode Quick Increment
        this.container.querySelectorAll('.btn-increment-ep').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                graphStore.incrementEpisode(nodeId);
            });
        });

        // View on canvas
        this.container.querySelectorAll('.btn-view-canvas').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = btn.dataset.nodeId;
                graphStore.selectNode(nodeId);
                switchTab('graph');
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
                        title: 'Retirer de ma Watchlist ?',
                        message: `Voulez-vous supprimer "${node.title}" de votre collection ?`,
                        posterUrl: node.image_url,
                        onConfirm: () => graphStore.removeNode(nodeId)
                    });
                }
            });
        });

        // Click card to select node
        this.container.querySelectorAll('.watchlist-card').forEach(card => {
            card.addEventListener('click', () => {
                const nodeId = card.dataset.id;
                graphStore.selectNode(nodeId);
            });
        });
    }
}
