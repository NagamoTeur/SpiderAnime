/**
 * Navbar.js
 * Controls 3-view navigation switches (Toile, Découverte, Tendances),
 * Pokédex watch stats, and programmatic tab switching.
 */

import { graphStore } from '../services/graphStore.js';

let currentTabSwitcher = null;

export function switchTab(tabName) {
    if (currentTabSwitcher) {
        currentTabSwitcher(tabName);
    }
}

export function initNavbar(onViewChange, onSearchOpen) {
    const btnGraph = document.getElementById('nav-btn-graph');
    const btnDiscover = document.getElementById('nav-btn-discover');
    const btnTrending = document.getElementById('nav-btn-trending');
    const btnOpenSearch = document.getElementById('btn-open-search');
    const brandLogo = document.getElementById('brand-logo');
    const statNodeCount = document.getElementById('stat-node-count');

    let activeTab = 'graph';

    const updateActiveTab = (tabName) => {
        activeTab = tabName;

        [btnGraph, btnDiscover, btnTrending].forEach(btn => {
            if (!btn) return;
            btn.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 text-on-surface-variant hover:text-on-surface hover:bg-white/5";
        });

        if (tabName === 'graph' && btnGraph) {
            btnGraph.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-primary/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(208,188,255,0.2)]";
        } else if (tabName === 'discover' && btnDiscover) {
            btnDiscover.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-secondary/20 text-secondary border border-secondary/40 shadow-[0_0_10px_rgba(76,215,246,0.2)]";
        } else if (tabName === 'trending' && btnTrending) {
            btnTrending.className = "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-tertiary/20 text-tertiary border border-tertiary/40 shadow-[0_0_10px_rgba(78,222,163,0.2)]";
        }

        if (onViewChange) onViewChange(tabName);
    };

    currentTabSwitcher = updateActiveTab;

    if (btnGraph) btnGraph.addEventListener('click', () => updateActiveTab('graph'));
    if (btnDiscover) btnDiscover.addEventListener('click', () => updateActiveTab('discover'));
    if (btnTrending) btnTrending.addEventListener('click', () => updateActiveTab('trending'));
    if (brandLogo) brandLogo.addEventListener('click', () => updateActiveTab('graph'));
    if (btnOpenSearch) btnOpenSearch.addEventListener('click', onSearchOpen);

    // Update Pokédex & Node Counter
    graphStore.subscribe(({ stats }) => {
        if (statNodeCount && stats) {
            statNodeCount.textContent = `${stats.completed}/${stats.total}`;
        }
    });
}
