/**
 * SearchModal.js (Branch: feature/anilist-api)
 * CMD + K Search Terminal for AniGraph powered by AniList GraphQL API
 */

import { searchAnime } from '../services/aniListApi.js';
import { graphStore } from '../services/graphStore.js';
import { switchTab } from './Navbar.js';
import { escapeHTML } from '../utils/security.js';

export class SearchModal {
    constructor() {
        this.modal = document.getElementById('search-modal');
        this.container = document.getElementById('search-modal-container');
        this.input = document.getElementById('search-input');
        this.resultsList = document.getElementById('search-results-list');
        this.spinner = document.getElementById('search-spinner');
        this.btnClose = document.getElementById('btn-close-search');

        this.isOpen = false;
        this.debounceTimer = null;

        this.initEvents();
    }

    initEvents() {
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                this.toggle();
            } else if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }

        if (this.input) {
            this.input.addEventListener('input', (e) => {
                const query = e.target.value;
                clearTimeout(this.debounceTimer);

                if (!query || query.trim().length < 2) {
                    this.renderEmptyState();
                    return;
                }

                this.spinner?.classList.remove('hidden');
                this.debounceTimer = setTimeout(() => {
                    this.performSearch(query);
                }, 200);
            });
        }
    }

    open() {
        if (!this.modal) return;
        this.isOpen = true;
        this.modal.classList.remove('opacity-0', 'pointer-events-none');
        this.modal.classList.add('opacity-100', 'pointer-events-auto');
        this.container?.classList.remove('scale-95');
        this.container?.classList.add('scale-100');
        setTimeout(() => this.input?.focus(), 100);
    }

    close() {
        if (!this.modal) return;
        this.isOpen = false;
        this.modal.classList.add('opacity-0', 'pointer-events-none');
        this.modal.classList.remove('opacity-100', 'pointer-events-auto');
        this.container?.classList.add('scale-95');
        this.container?.classList.remove('scale-100');
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    renderEmptyState() {
        if (this.spinner) this.spinner.classList.add('hidden');
        if (this.resultsList) {
            this.resultsList.innerHTML = `
                <div class="text-center py-12 text-outline font-label-mono text-sm">
                    <span class="material-symbols-outlined text-3xl mb-2 block opacity-40">manage_search</span>
                    Saisissez au moins 2 caractères (ex: Death Note, Attack on Titan, Solo Leveling)...
                </div>
            `;
        }
    }

    async performSearch(query) {
        try {
            const results = await searchAnime(query);
            this.spinner?.classList.add('hidden');
            this.renderResults(results);
        } catch (error) {
            this.spinner?.classList.add('hidden');
            if (this.resultsList) {
                this.resultsList.innerHTML = `
                    <div class="text-center py-8 text-error font-label-mono text-sm">
                        Erreur de recherche. Veuillez réessayer.
                    </div>
                `;
            }
        }
    }

    renderResults(animes) {
        if (!this.resultsList) return;

        if (!animes || animes.length === 0) {
            this.resultsList.innerHTML = `
                <div class="text-center py-8 text-outline font-label-mono text-sm">
                    Aucun animé trouvé pour cette recherche.
                </div>
            `;
            return;
        }

        this.resultsList.innerHTML = '';
        animes.forEach(anime => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-container/60 hover:bg-surface-container-high/80 border border-outline-variant/30 hover:border-primary/40 transition-all cursor-pointer group';

            const rawTitle = anime.title_english || anime.title;
            const title = escapeHTML(rawTitle);
            const imageUrl = escapeHTML(anime.image_url || '');
            const score = anime.score ? `★ ${anime.score}` : 'N/A';
            const genres = escapeHTML((anime.genres || []).slice(0, 2).map(g => g.name || g).join(' • '));

            item.innerHTML = `
                <div class="flex items-center gap-3.5 flex-1 min-w-0">
                    <img src="${imageUrl}" alt="${title}" class="w-12 h-16 object-cover rounded-lg border border-outline-variant/40 shadow-sm" />
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="font-headline-md text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">${title}</h4>
                            <span class="text-[11px] font-label-mono text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">${score}</span>
                        </div>
                        <p class="text-xs text-outline truncate mt-0.5">${anime.title !== rawTitle ? escapeHTML(anime.title) : ''}</p>
                        <p class="text-[11px] font-label-mono text-on-surface-variant/70 mt-1">${genres || 'Anime'}</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button class="btn-add-web px-3 py-1.5 rounded-lg text-xs font-medium font-label-mono bg-primary text-on-primary hover:bg-primary-fixed shadow-[0_0_10px_rgba(208,188,255,0.3)] transition-all flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">polyline</span>
                        <span>Tisser</span>
                    </button>
                </div>
            `;

            item.addEventListener('click', () => {
                const addedNode = graphStore.addNode({
                    id: `media_${anime.id}`,
                    mal_id: anime.id,
                    title: rawTitle,
                    image_url: anime.image_url,
                    score: anime.score,
                    genres: (anime.genres || []).map(g => g.name || g)
                });
                graphStore.selectNode(addedNode.id);
                this.close();
            });

            const btnAdd = item.querySelector('.btn-add-web');
            btnAdd.addEventListener('click', (e) => {
                e.stopPropagation();
                graphStore.addFavorite({
                    id: `media_${anime.id}`,
                    mal_id: anime.id,
                    title: rawTitle,
                    image_url: anime.image_url,
                    score: anime.score,
                    genres: (anime.genres || []).map(g => g.name || g)
                });
                switchTab('graph');
                this.close();
            });

            this.resultsList.appendChild(item);
        });
    }
}
