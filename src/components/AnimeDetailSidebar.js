/**
 * AnimeDetailSidebar.js (Branch: feature/anilist-api)
 * Glassmorphic slide-out sidebar powered by AniList GraphQL API with Pokédex Watch Tracker.
 */

import { graphStore } from '../services/graphStore.js';
import { getAnimeDetails, getAnimeRecommendations } from '../services/aniListApi.js';
import { confirmModal } from './ConfirmModal.js';
import { escapeHTML } from '../utils/security.js';

export class AnimeDetailSidebar {
    constructor() {
        this.sidebar = document.getElementById('detail-sidebar');
        this.content = document.getElementById('sidebar-content');
        this.btnClose = document.getElementById('btn-close-sidebar');

        this.currentMalId = null;

        this.initEvents();

        graphStore.subscribe(({ selectedNode }) => {
            if (selectedNode) {
                this.loadAnimeDetails(selectedNode);
                this.open();
            } else {
                this.close();
            }
        });
    }

    initEvents() {
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => {
                graphStore.selectNode(null);
                this.close();
            });
        }
    }

    open() {
        if (this.sidebar) {
            this.sidebar.classList.remove('translate-x-full');
        }
    }

    close() {
        if (this.sidebar) {
            this.sidebar.classList.add('translate-x-full');
        }
    }

    async loadAnimeDetails(node) {
        if (!this.content) return;
        const targetId = node.mal_id || node.id;
        this.currentMalId = targetId;

        this.content.innerHTML = `
            <div class="animate-pulse space-y-4">
                <div class="h-48 bg-surface-container-high rounded-xl w-full"></div>
                <div class="h-6 bg-surface-container-high rounded w-3/4"></div>
                <div class="h-4 bg-surface-container-high rounded w-1/2"></div>
                <div class="h-24 bg-surface-container-high rounded w-full"></div>
            </div>
        `;

        const details = await getAnimeDetails(targetId);
        const recommendations = await getAnimeRecommendations(targetId);

        if (this.currentMalId !== targetId) return;

        const rawTitle = details?.title_english || details?.title || node.title;
        const title = escapeHTML(rawTitle);
        const jpTitle = escapeHTML(details?.title_japanese || '');
        const posterUrl = escapeHTML(details?.image_url || details?.images?.jpg?.large_image_url || node.image_url);
        const score = details?.score || node.score || 'N/A';
        const totalEp = details?.episodes || node.totalEpisodes || 12;
        const episodesText = escapeHTML(totalEp ? `${totalEp} épisodes` : 'Épisodes inconnu');
        const statusText = escapeHTML(details?.status || 'FINISHED');
        const studio = escapeHTML(details?.studios?.[0]?.name || 'Studio inconnu');
        const synopsis = escapeHTML(details?.synopsis || 'Aucun synopsis disponible pour cet animé.');
        
        let trailerEmbedUrl = details?.trailer?.embed_url || '';
        if (trailerEmbedUrl) {
            trailerEmbedUrl = trailerEmbedUrl.replace('autoplay=1', 'autoplay=0');
            if (!trailerEmbedUrl.includes('autoplay=')) {
                trailerEmbedUrl += (trailerEmbedUrl.includes('?') ? '&' : '?') + 'autoplay=0';
            }
        }

        const genres = details?.genres || (node.genres || []).map(g => ({ name: g }));
        const isFavorite = node.isFavorite;

        const watchStatus = node.watchStatus || 'plan_to_watch';
        const watchedEp = node.watchedEpisodes || 0;
        const progressPct = Math.min(100, Math.round((watchedEp / (totalEp || 1)) * 100));

        this.content.innerHTML = `
            <div class="relative rounded-2xl overflow-hidden border border-outline-variant/40 group shadow-xl">
                <img src="${posterUrl}" alt="${title}" class="w-full h-56 object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                <div class="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/60 to-transparent"></div>
                
                <div class="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                        <span class="font-label-mono text-xs text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/30 backdrop-blur-md">
                            ★ ${score}
                        </span>
                        <h2 class="font-display-lg text-xl font-bold text-white mt-1 leading-snug drop-shadow-md">${title}</h2>
                        ${jpTitle ? `<p class="font-label-mono text-xs text-outline drop-shadow">${jpTitle}</p>` : ''}
                    </div>
                </div>
            </div>

            <div class="p-4 rounded-2xl bg-surface-container/70 border border-outline-variant/40 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="font-label-mono text-xs text-secondary font-semibold uppercase flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px]">bookmark_added</span>
                        <span>Pokédex Status</span>
                    </span>
                    <span class="font-label-mono text-[11px] text-outline">${watchedEp} / ${totalEp} ép</span>
                </div>

                <div class="grid grid-cols-3 gap-1.5 bg-surface-container-high/50 p-1 rounded-xl">
                    <button class="status-btn py-1.5 rounded-lg text-[11px] font-label-mono font-medium transition-all ${
                        watchStatus === 'watching' ? 'bg-secondary text-on-secondary font-bold shadow' : 'text-outline hover:text-on-surface'
                    }" data-status="watching">🟢 En cours</button>

                    <button class="status-btn py-1.5 rounded-lg text-[11px] font-label-mono font-medium transition-all ${
                        watchStatus === 'completed' ? 'bg-tertiary text-on-tertiary font-bold shadow' : 'text-outline hover:text-on-surface'
                    }" data-status="completed">🟣 Terminé</button>

                    <button class="status-btn py-1.5 rounded-lg text-[11px] font-label-mono font-medium transition-all ${
                        watchStatus === 'plan_to_watch' ? 'bg-primary text-on-primary font-bold shadow' : 'text-outline hover:text-on-surface'
                    }" data-status="plan_to_watch">🟡 À voir</button>
                </div>

                <div class="flex items-center justify-between pt-1">
                    <span class="font-label-mono text-xs text-on-surface">Avancement épisodes :</span>
                    <div class="flex items-center gap-2">
                        <button id="btn-ep-minus" class="w-7 h-7 rounded-lg bg-surface-variant/80 hover:bg-white/20 text-on-surface flex items-center justify-center font-bold text-sm transition-all">-</button>
                        <span id="ep-count-display" class="font-label-mono text-xs font-bold text-primary px-2">${watchedEp}</span>
                        <button id="btn-ep-plus" class="w-7 h-7 rounded-lg bg-surface-variant/80 hover:bg-white/20 text-on-surface flex items-center justify-center font-bold text-sm transition-all">+</button>
                    </div>
                </div>

                <div class="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-secondary to-tertiary transition-all duration-300" style="width: ${progressPct}%"></div>
                </div>
            </div>

            <div class="flex gap-2">
                <button id="btn-toggle-fav" class="flex-1 py-2.5 rounded-xl font-headline-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isFavorite 
                    ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(208,188,255,0.3)]' 
                    : 'bg-surface-container border border-outline-variant/40 text-on-surface hover:border-primary/50'
                }">
                    <span class="material-symbols-outlined text-[18px]">${isFavorite ? 'favorite' : 'favorite_border'}</span>
                    <span>${isFavorite ? 'Favori' : 'Mettre en Favori'}</span>
                </button>

                <button id="btn-expand-web" class="flex-1 py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-secondary text-on-secondary hover:bg-secondary-fixed shadow-[0_0_15px_rgba(76,215,246,0.3)] flex items-center justify-center gap-2 transition-all">
                    <span class="material-symbols-outlined text-[18px]">account_tree</span>
                    <span>Tisser la toile</span>
                </button>
            </div>

            <div>
                <button id="btn-remove-node" class="w-full py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-error/10 text-error border border-error/30 hover:bg-error/20 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                    <span>Supprimer ce nœud de la toile</span>
                </button>
            </div>

            <div class="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-container/60 border border-outline-variant/30 text-center font-label-mono text-xs">
                <div>
                    <span class="text-outline text-[10px] uppercase block">Studio</span>
                    <span class="text-on-surface font-medium truncate block">${studio}</span>
                </div>
                <div class="border-x border-outline-variant/30">
                    <span class="text-outline text-[10px] uppercase block">Épisodes</span>
                    <span class="text-on-surface font-medium block">${episodesText}</span>
                </div>
                <div>
                    <span class="text-outline text-[10px] uppercase block">Statut</span>
                    <span class="text-on-surface font-medium block truncate">${statusText}</span>
                </div>
            </div>

            <div>
                <h4 class="font-label-mono text-xs text-outline uppercase mb-2">Genres</h4>
                <div class="flex flex-wrap gap-1.5">
                    ${genres.map(g => `
                        <span class="px-2.5 py-1 rounded-lg text-xs font-label-mono bg-surface-variant/60 border border-outline-variant/40 text-on-surface-variant">
                            ${escapeHTML(g.name || g)}
                        </span>
                    `).join('')}
                </div>
            </div>

            <div>
                <h4 class="font-label-mono text-xs text-outline uppercase mb-2">Synopsis</h4>
                <p class="text-sm text-on-surface-variant leading-relaxed font-body-md bg-surface-container/40 p-4 rounded-xl border border-outline-variant/20">
                    ${synopsis}
                </p>
            </div>

            ${trailerEmbedUrl ? `
                <div>
                    <h4 class="font-label-mono text-xs text-outline uppercase mb-2">Bande-Annonce</h4>
                    <div id="trailer-container" class="relative aspect-video rounded-xl overflow-hidden border border-outline-variant/40 shadow-lg bg-black">
                        <div id="trailer-preview" class="absolute inset-0 flex flex-col items-center justify-center bg-surface-container/80 cursor-pointer hover:bg-surface-container/60 transition-all group">
                            <div class="w-14 h-14 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center group-hover:scale-110 shadow-[0_0_20px_rgba(208,188,255,0.4)] transition-all">
                                <span class="material-symbols-outlined text-[32px] ml-1">play_arrow</span>
                            </div>
                            <span class="font-label-mono text-xs text-on-surface mt-3 font-semibold group-hover:text-primary transition-colors">Regarder la bande-annonce</span>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div>
                <h4 class="font-label-mono text-xs text-secondary uppercase mb-3 flex items-center justify-between">
                    <span>Animés Suggérés (AniList Toile)</span>
                    <span class="text-[10px] text-outline">${recommendations.length} filons</span>
                </h4>
                <div class="space-y-2">
                    ${recommendations.map(rec => `
                        <div class="rec-item flex items-center justify-between p-2.5 rounded-xl bg-surface-container/50 hover:bg-surface-container-high border border-outline-variant/30 transition-all cursor-pointer group" data-mal-id="${rec.id || rec.mal_id}">
                            <div class="flex items-center gap-3">
                                <img src="${escapeHTML(rec.image_url)}" alt="${escapeHTML(rec.title)}" class="w-10 h-12 object-cover rounded-lg" />
                                <div>
                                    <h5 class="text-xs font-semibold text-on-surface group-hover:text-secondary transition-colors line-clamp-1">${escapeHTML(rec.title)}</h5>
                                    <span class="text-[10px] font-label-mono text-outline">${rec.votes} votes d'affinité</span>
                                </div>
                            </div>
                            <span class="material-symbols-outlined text-outline group-hover:text-secondary text-[18px]">add_circle</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.content.querySelectorAll('.status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newStatus = btn.dataset.status;
                let newEp = watchedEp;
                if (newStatus === 'completed') newEp = totalEp;
                graphStore.updateWatchProgress(node.id, newStatus, newEp);
            });
        });

        const btnMinus = this.content.querySelector('#btn-ep-minus');
        const btnPlus = this.content.querySelector('#btn-ep-plus');

        btnMinus?.addEventListener('click', () => {
            const newEp = Math.max(0, (node.watchedEpisodes || 0) - 1);
            graphStore.updateWatchProgress(node.id, watchStatus, newEp);
        });

        btnPlus?.addEventListener('click', () => {
            const newEp = (node.watchedEpisodes || 0) + 1;
            graphStore.updateWatchProgress(node.id, watchStatus, newEp);
        });

        const btnToggleFav = this.content.querySelector('#btn-toggle-fav');
        const btnExpandWeb = this.content.querySelector('#btn-expand-web');
        const btnRemoveNode = this.content.querySelector('#btn-remove-node');
        const trailerPreview = this.content.querySelector('#trailer-preview');
        const trailerContainer = this.content.querySelector('#trailer-container');

        btnToggleFav?.addEventListener('click', () => graphStore.toggleFavorite(node.id));
        btnExpandWeb?.addEventListener('click', () => graphStore.expandNode(node.id));

        btnRemoveNode?.addEventListener('click', () => {
            confirmModal.ask({
                title: 'Retirer cet animé ?',
                message: `Voulez-vous supprimer "${title}" de votre toile d'araignée ?`,
                posterUrl: posterUrl,
                onConfirm: () => {
                    graphStore.removeNode(node.id);
                    this.close();
                }
            });
        });

        if (trailerPreview && trailerContainer && trailerEmbedUrl) {
            trailerPreview.addEventListener('click', () => {
                trailerContainer.innerHTML = `
                    <iframe src="${trailerEmbedUrl}" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                `;
            });
        }

        this.content.querySelectorAll('.rec-item').forEach(item => {
            item.addEventListener('click', () => {
                const recId = Number(item.dataset.malId);
                const recTitle = item.querySelector('h5').textContent;
                const img = item.querySelector('img').src;

                const addedNode = graphStore.addNode({
                    id: `media_${recId}`,
                    mal_id: recId,
                    title: recTitle,
                    image_url: img,
                    score: 8.0
                });

                graphStore.addLink(node.id, addedNode.id, 'recommendation');
                graphStore.selectNode(addedNode.id);
            });
        });
    }
}
