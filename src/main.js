/**
 * Main.js - SpiderAnime Entry Point
 * Wires together WebGL shader background, D3 canvas engine, auth service,
 * per-user graph store, 3 distinct views (Graph, Discovery, Trending), and modals.
 * Default initial home view: Découverte.
 */

import { initShaderBackground } from './components/ShaderBackground.js';
import { graphStore } from './services/graphStore.js';
import { authService } from './services/authService.js';
import { GraphCanvas } from './components/GraphCanvas.js';
import { SearchModal } from './components/SearchModal.js';
import { AnimeDetailSidebar } from './components/AnimeDetailSidebar.js';
import { AuthModal } from './components/AuthModal.js';
import { initNavbar } from './components/Navbar.js';
import { initGraphControls } from './components/GraphControls.js';
import { DiscoveryView } from './components/DiscoveryView.js';
import { TrendingView } from './components/TrendingView.js';

async function startApp() {
    try {
        // 1. Initialize WebGL Shader Background
        initShaderBackground('shader-canvas');

        // 2. Initialize Graph Store
        await graphStore.init();

        // 3. Initialize Canvas Force Graph
        const graphCanvas = new GraphCanvas('graph-canvas');

        // 4. Initialize Auth Modal & User Profile Manager
        const authModal = new AuthModal();
        authModal.updateNavbarUserBadge(authService.getCurrentUser());

        // 5. Initialize Modals & Sidebars
        const searchModal = new SearchModal();
        const detailSidebar = new AnimeDetailSidebar();

        // 6. Initialize HUD Controls
        initGraphControls(graphCanvas);

        // 7. View Switch Logic (Default: Découverte)
        const viewGraph = document.getElementById('view-graph');
        const viewDiscovery = document.getElementById('view-discovery');
        const viewTrending = document.getElementById('view-trending');

        const switchView = (viewName) => {
            [viewGraph, viewDiscovery, viewTrending].forEach(v => {
                if (!v) return;
                v.classList.remove('opacity-100', 'pointer-events-auto');
                v.classList.add('opacity-0', 'pointer-events-none');
            });

            if (viewName === 'discover' && viewDiscovery) {
                viewDiscovery.classList.remove('opacity-0', 'pointer-events-none');
                viewDiscovery.classList.add('opacity-100', 'pointer-events-auto');
            } else if (viewName === 'graph' && viewGraph) {
                viewGraph.classList.remove('opacity-0', 'pointer-events-none');
                viewGraph.classList.add('opacity-100', 'pointer-events-auto');
                graphCanvas.initCanvasSize();
            } else if (viewName === 'trending' && viewTrending) {
                viewTrending.classList.remove('opacity-0', 'pointer-events-none');
                viewTrending.classList.add('opacity-100', 'pointer-events-auto');
            }
        };

        // 8. Initialize Catalog Views
        new DiscoveryView();
        new TrendingView();

        // 9. Initialize Top Navbar (Default Home: discover)
        initNavbar(
            (tabName) => switchView(tabName),
            () => searchModal.open()
        );

        console.log('[SpiderAnime] Application initialized with Découverte as default home page.');
    } catch (err) {
        console.error('[SpiderAnime Initialization Error]:', err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
