/**
 * TrendingView.js (Branch: feature/anilist-api)
 * Dedicated view for Trending & Seasonal Top Rated Anime powered by AniList GraphQL API.
 */

import { getTopAnime } from '../services/aniListApi.js';
import { graphStore } from '../services/graphStore.js';
import { switchTab } from './Navbar.js';
import { escapeHTML } from '../utils/security.js';

export class TrendingView {
    constructor() {
        this.container = document.getElementById('view-trending');
        this.topAnime = [];

        this.init();
    }

    async init() {
        if (!this.container) return;
        this.renderSkeleton();

        this.topAnime = await getTopAnime(15);
        this.renderView();
    }

    renderSkeleton() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-8 animate-pulse">
                <div class="h-64 bg-surface-container-high rounded-3xl w-full"></div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${Array(6).fill(0).map(() => `<div class="h-40 bg-surface-container-high rounded-2xl"></div>`).join('')}
                </div>
            </div>
        `;
    }

    renderView() {
        if (!this.container || this.topAnime.length === 0) return;

        const hero = this.topAnime[0];
        const rest = this.topAnime.slice(1);

        const heroTitle = escapeHTML(hero.title_english || hero.title);
        const heroPoster = escapeHTML(hero.image_url || hero.images?.jpg?.large_image_url);
        const heroScore = hero.score ? `★ ${hero.score}` : '★ 9.0';
        const heroSynopsis = escapeHTML(hero.synopsis ? hero.synopsis.substring(0, 200) + '...' : '');

        this.container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-10 pb-24">
                <div class="border-b border-outline-variant/30 pb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-xl bg-tertiary/20 text-tertiary flex items-center justify-center border border-tertiary/40">
                            <span class="material-symbols-outlined text-[20px]">local_fire_department</span>
                        </div>
                        <h1 class="font-display-lg text-3xl md:text-4xl font-bold text-on-surface tracking-tight">Tendances & Top Classement (AniList)</h1>
                    </div>
                    <p class="text-on-surface-variant text-sm mt-1">Les chefs-d'œuvre les plus plébiscités récupérés en temps réel via l'API GraphQL AniList.</p>
                </div>

                <div class="relative rounded-3xl overflow-hidden border border-tertiary/40 bg-surface-container/80 shadow-[0_0_30px_rgba(78,222,163,0.15)] group">
                    <div class="grid grid-cols-1 md:grid-cols-3">
                        <div class="relative h-72 md:h-full overflow-hidden">
                            <img src="${heroPoster}" alt="${heroTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div class="absolute top-4 left-4 bg-tertiary text-on-tertiary font-label-mono text-xs font-bold px-3 py-1 rounded-xl shadow-lg flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-[16px]">military_tech</span>
                                <span>#1 Tendance</span>
                            </div>
                        </div>

                        <div class="p-6 md:p-8 md:col-span-2 flex flex-col justify-between space-y-4">
                            <div>
                                <div class="flex items-center gap-3">
                                    <span class="font-label-mono text-sm text-tertiary font-bold">${heroScore}</span>
                                    <span class="font-label-mono text-xs text-outline">${escapeHTML(hero.episodes ? `${hero.episodes} épisodes` : 'Série')}</span>
                                </div>
                                <h2 class="font-display-lg text-2xl md:text-3xl font-bold text-on-surface mt-1.5 group-hover:text-tertiary transition-colors">${heroTitle}</h2>
                                <p class="text-sm text-on-surface-variant leading-relaxed mt-3 font-body-md">${heroSynopsis}</p>
                            </div>

                            <div class="flex items-center gap-4 pt-2">
                                <button id="btn-hero-web" class="px-6 py-3 rounded-xl font-headline-md text-xs font-semibold bg-tertiary text-on-tertiary hover:bg-tertiary-fixed shadow-[0_0_20px_rgba(78,222,163,0.4)] transition-all flex items-center gap-2">
                                    <span class="material-symbols-outlined text-[18px]">polyline</span>
                                    <span>Tisser dans ma Toile</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="font-headline-md text-lg font-semibold text-on-surface mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-secondary">workspace_premium</span>
                        <span>Top 10 Incontournables</span>
                    </h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        ${rest.slice(0, 9).map((anime, idx) => {
                            const rank = idx + 2;
                            const title = escapeHTML(anime.title_english || anime.title);
                            const img = escapeHTML(anime.image_url || anime.images?.jpg?.large_image_url);
                            const score = anime.score ? `★ ${anime.score}` : 'N/A';
                            const genres = escapeHTML((anime.genres || []).slice(0, 2).map(g => g.name || g).join(' • '));

                            return `
                                <div class="glass-card rounded-2xl p-4 flex items-center gap-4 border border-outline-variant/30 hover:border-secondary/50 transition-all group cursor-pointer trending-card" data-mal-id="${anime.id}">
                                    <div class="relative w-20 h-28 flex-shrink-0 rounded-xl overflow-hidden shadow-md">
                                        <img src="${img}" alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <span class="absolute top-1 left-1 bg-surface/80 backdrop-blur-md text-white font-label-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                                            #${rank}
                                        </span>
                                    </div>

                                    <div class="flex-1 min-w-0 flex flex-col justify-between h-28 py-1">
                                        <div>
                                            <span class="font-label-mono text-xs text-secondary font-semibold">${score}</span>
                                            <h4 class="font-headline-md text-sm font-semibold text-on-surface truncate group-hover:text-secondary transition-colors mt-0.5">${title}</h4>
                                            <p class="font-label-mono text-[11px] text-outline mt-1 truncate">${genres || 'Anime'}</p>
                                        </div>

                                        <button class="btn-trending-web py-1.5 px-3 rounded-lg text-xs font-label-mono bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary hover:text-on-secondary transition-all flex items-center justify-center gap-1.5 self-start">
                                            <span class="material-symbols-outlined text-[16px]">polyline</span>
                                            <span>Tisser</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

            </div>
        `;

        this.container.querySelector('#btn-hero-web')?.addEventListener('click', () => {
            graphStore.addFavorite({
                id: `media_${hero.id}`,
                mal_id: hero.id,
                title: hero.title_english || hero.title,
                image_url: hero.image_url,
                score: hero.score,
                genres: (hero.genres || []).map(g => g.name || g)
            });
            switchTab('graph');
        });

        this.container.querySelectorAll('.trending-card').forEach((card, idx) => {
            const anime = rest[idx];
            if (!anime) return;

            card.addEventListener('click', () => {
                const addedNode = graphStore.addNode({
                    id: `media_${anime.id}`,
                    mal_id: anime.id,
                    title: anime.title_english || anime.title,
                    image_url: anime.image_url,
                    score: anime.score,
                    genres: (anime.genres || []).map(g => g.name || g)
                });
                graphStore.selectNode(addedNode.id);
            });

            card.querySelector('.btn-trending-web')?.addEventListener('click', (e) => {
                e.stopPropagation();
                graphStore.addFavorite({
                    id: `media_${anime.id}`,
                    mal_id: anime.id,
                    title: anime.title_english || anime.title,
                    image_url: anime.image_url,
                    score: anime.score,
                    genres: (anime.genres || []).map(g => g.name || g)
                });
                switchTab('graph');
            });
        });
    }
}
