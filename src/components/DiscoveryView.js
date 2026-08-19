/**
 * DiscoveryView.js
 * Default Homepage Catalog View for AniGraph
 * Renders dense anime cards (50 per batch) with AJAX pagination via "Charger plus d'animés".
 */

import { getAnimeCatalog, getTopAnime } from '../services/jikanApi.js';
import { graphStore } from '../services/graphStore.js';
import { switchTab } from './Navbar.js';
import { escapeHTML } from '../utils/security.js';

export class DiscoveryView {
    constructor() {
        this.container = document.getElementById('discovery-grid');
        this.filterContainer = document.getElementById('discovery-genres-filter');
        this.allAnime = [];
        this.activeGenre = 'Tous';
        this.currentPage = 1;
        this.isLoadingMore = false;

        this.init();
    }

    async init() {
        if (!this.container) return;
        this.renderSkeleton();

        // Initial catalog load: 35-50 items
        const initialBatch = await getTopAnime(35);
        this.allAnime = initialBatch;
        this.renderGrid(this.allAnime);
        this.appendLoadMoreButton();
        this.initFilterEvents();
    }

    renderSkeleton() {
        this.container.innerHTML = Array(15).fill(0).map(() => `
            <div class="glass-card rounded-2xl overflow-hidden animate-pulse">
                <div class="h-64 bg-surface-container-high w-full"></div>
                <div class="p-4 space-y-2">
                    <div class="h-4 bg-surface-container-high rounded w-3/4"></div>
                    <div class="h-3 bg-surface-container-high rounded w-1/2"></div>
                </div>
            </div>
        `).join('');
    }

    initFilterEvents() {
        if (!this.filterContainer) return;
        const buttons = this.filterContainer.querySelectorAll('.genre-tag-btn');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => {
                    b.className = "genre-tag-btn px-3 py-1.5 rounded-xl text-xs font-label-mono bg-surface-container border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-all";
                });

                btn.className = "genre-tag-btn active px-3 py-1.5 rounded-xl text-xs font-label-mono bg-primary text-on-primary font-bold shadow-[0_0_10px_rgba(208,188,255,0.3)]";

                this.activeGenre = btn.dataset.genre || 'Tous';
                this.filterGrid();
            });
        });
    }

    filterGrid() {
        if (this.activeGenre === 'Tous') {
            this.renderGrid(this.allAnime);
            this.appendLoadMoreButton();
            return;
        }

        const filtered = this.allAnime.filter(a =>
            (a.genres || []).some(g => (g.name || g).toLowerCase().includes(this.activeGenre.toLowerCase()))
        );
        this.renderGrid(filtered);
    }

    renderGrid(animes) {
        if (!this.container) return;

        if (animes.length === 0) {
            this.container.innerHTML = `
                <div class="col-span-full text-center py-16 text-outline font-label-mono">
                    Aucun animé trouvé pour le genre "${escapeHTML(this.activeGenre)}".
                </div>
            `;
            return;
        }

        this.container.innerHTML = '';
        animes.forEach(anime => {
            const card = this.createAnimeCardDOM(anime);
            this.container.appendChild(card);
        });
    }

    createAnimeCardDOM(anime) {
        const card = document.createElement('div');
        card.className = 'glass-card rounded-2xl overflow-hidden flex flex-col group border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 shadow-xl cursor-pointer';

        const rawTitle = anime.title_english || anime.title;
        const title = escapeHTML(rawTitle);
        const imageUrl = escapeHTML(anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url);
        const score = anime.score ? `★ ${anime.score}` : 'N/A';
        const genres = escapeHTML((anime.genres || []).slice(0, 2).map(g => g.name || g).join(' • '));

        card.innerHTML = `
            <div class="relative h-64 overflow-hidden">
                <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                <span class="absolute top-3 right-3 font-label-mono text-xs text-tertiary bg-surface/80 backdrop-blur-md px-2 py-1 rounded-lg border border-tertiary/30">
                    ${score}
                </span>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                    <h3 class="font-headline-md text-sm font-bold text-on-surface line-clamp-1 group-hover:text-primary transition-colors">${title}</h3>
                    <p class="font-label-mono text-[11px] text-outline mt-1">${genres || 'Anime'}</p>
                </div>

                <div class="flex gap-2 pt-2">
                    <button class="btn-web flex-1 py-2 rounded-xl text-xs font-label-mono font-semibold bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-on-primary shadow-[0_0_10px_rgba(208,188,255,0.2)] transition-all flex items-center justify-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">polyline</span>
                        <span>Tisser</span>
                    </button>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            const addedNode = graphStore.addNode({
                mal_id: anime.mal_id,
                title: rawTitle,
                image_url: anime.images?.jpg?.image_url,
                score: anime.score,
                genres: (anime.genres || []).map(g => g.name || g)
            });
            graphStore.selectNode(addedNode.id);
        });

        const btnWeb = card.querySelector('.btn-web');
        btnWeb.addEventListener('click', (e) => {
            e.stopPropagation();
            graphStore.addFavorite({
                mal_id: anime.mal_id,
                title: rawTitle,
                image_url: anime.images?.jpg?.image_url,
                score: anime.score,
                genres: (anime.genres || []).map(g => g.name || g)
            });
            switchTab('graph');
        });

        return card;
    }

    appendLoadMoreButton() {
        const existingBtn = this.container.parentElement.querySelector('#btn-load-more-ajax');
        if (existingBtn) existingBtn.remove();

        const loadMoreContainer = document.createElement('div');
        loadMoreContainer.id = 'btn-load-more-ajax';
        loadMoreContainer.className = 'col-span-full flex justify-center pt-8 pb-12';
        loadMoreContainer.innerHTML = `
            <button id="btn-trigger-ajax" class="px-8 py-3.5 rounded-2xl font-headline-md text-xs font-bold bg-surface-container-high hover:bg-primary hover:text-on-primary border border-outline-variant/40 hover:border-primary text-on-surface shadow-[0_0_20px_rgba(208,188,255,0.2)] transition-all flex items-center gap-2.5">
                <span class="material-symbols-outlined text-[20px]" id="ajax-icon">downloading</span>
                <span id="ajax-text">Charger plus d'animés</span>
            </button>
        `;

        this.container.after(loadMoreContainer);

        loadMoreContainer.querySelector('#btn-trigger-ajax')?.addEventListener('click', async () => {
            if (this.isLoadingMore) return;
            this.isLoadingMore = true;

            const icon = loadMoreContainer.querySelector('#ajax-icon');
            const text = loadMoreContainer.querySelector('#ajax-text');
            if (icon) icon.className = 'material-symbols-outlined text-[20px] animate-spin';
            if (text) text.textContent = 'Chargement en cours...';

            this.currentPage++;
            const newAnime = await getAnimeCatalog(this.currentPage);

            if (newAnime.length > 0) {
                newAnime.forEach(anime => {
                    if (!this.allAnime.some(a => a.mal_id === anime.mal_id)) {
                        this.allAnime.push(anime);
                        const card = this.createAnimeCardDOM(anime);
                        this.container.appendChild(card);
                    }
                });
            }

            this.isLoadingMore = false;
            if (icon) icon.className = 'material-symbols-outlined text-[20px]';
            if (text) text.textContent = 'Charger plus d\'animés';
        });
    }
}
