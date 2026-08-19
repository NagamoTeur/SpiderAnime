/**
 * Navbar.js
 * Controls 4-view navigation switches (Découverte, Ma Watchlist, Toile, Tendances),
 * Pokédex watch stats, and programmatic tab switching. Default: Découverte.
 */

import { graphStore } from '../services/graphStore.js';

let currentTabSwitcher = null;

export function switchTab(tabName) {
    if (currentTabSwitcher) {
        currentTabSwitcher(tabName);
    }
}

export function initNavbar(onViewChange, onSearchOpen) {
    const btnDiscover = document.getElementById('nav-btn-discover');
    const btnWatchlist = document.getElementById('nav-btn-watchlist');
    const btnGraph = document.getElementById('nav-btn-graph');
    const btnTrending = document.getElementById('nav-btn-trending');
    const btnOpenSearch = document.getElementById('btn-open-search');
    const brandLogo = document.getElementById('brand-logo');
    const statNodeCount = document.getElementById('stat-node-count');

    let activeTab = 'discover';

    const updateActiveTab = (tabName) => {
        activeTab = tabName;

        [btnDiscover, btnWatchlist, btnGraph, btnTrending].forEach(btn => {
            if (!btn) return;
            btn.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 text-on-surface-variant hover:text-on-surface hover:bg-white/5";
        });

        if (tabName === 'discover' && btnDiscover) {
            btnDiscover.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/40 shadow-[0_0_10px_rgba(76,215,246,0.2)]";
        } else if (tabName === 'watchlist' && btnWatchlist) {
            btnWatchlist.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(208,188,255,0.2)]";
        } else if (tabName === 'graph' && btnGraph) {
            btnGraph.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-tertiary/20 text-tertiary border border-tertiary/40 shadow-[0_0_10px_rgba(78,222,163,0.2)]";
        } else if (tabName === 'trending' && btnTrending) {
            btnTrending.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-surface-tint/20 text-surface-tint border border-surface-tint/40 shadow";
        }

        if (onViewChange) onViewChange(tabName);
    };

    currentTabSwitcher = updateActiveTab;

    if (btnDiscover) btnDiscover.addEventListener('click', () => updateActiveTab('discover'));
    if (btnWatchlist) btnWatchlist.addEventListener('click', () => updateActiveTab('watchlist'));
    if (btnGraph) btnGraph.addEventListener('click', () => updateActiveTab('graph'));
    if (btnTrending) btnTrending.addEventListener('click', () => updateActiveTab('trending'));
    if (brandLogo) brandLogo.addEventListener('click', () => updateActiveTab('discover'));
    if (btnOpenSearch) btnOpenSearch.addEventListener('click', onSearchOpen);

    // Update Pokédex & Node Counter
    graphStore.subscribe(({ stats }) => {
        if (statNodeCount && stats) {
            statNodeCount.textContent = `${stats.completed}/${stats.total}`;
        }
    });
}
