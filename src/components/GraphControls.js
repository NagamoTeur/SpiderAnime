/**
 * GraphControls.js
 * HUD controls for zooming, centering, physics toggling, and clearing the spider web.
 */

import { graphStore } from '../services/graphStore.js';
import { confirmModal } from './ConfirmModal.js';

export function initGraphControls(graphCanvas) {
    const btnZoomIn = document.getElementById('ctrl-zoom-in');
    const btnZoomOut = document.getElementById('ctrl-zoom-out');
    const btnResetView = document.getElementById('ctrl-reset-view');
    const btnTogglePhysics = document.getElementById('ctrl-toggle-physics');
    const btnClearGraph = document.getElementById('ctrl-clear-graph');
    const physicsLabel = document.getElementById('physics-label');

    btnZoomIn?.addEventListener('click', () => graphCanvas.zoomIn());
    btnZoomOut?.addEventListener('click', () => graphCanvas.zoomOut());
    btnResetView?.addEventListener('click', () => graphCanvas.resetView());

    btnTogglePhysics?.addEventListener('click', () => {
        const enabled = graphCanvas.togglePhysics();
        if (physicsLabel) {
            physicsLabel.textContent = enabled ? 'Physique' : 'Figé';
        }
        btnTogglePhysics.classList.toggle('bg-secondary/10', enabled);
        btnTogglePhysics.classList.toggle('bg-surface-variant', !enabled);
    });

    btnClearGraph?.addEventListener('click', () => {
        confirmModal.ask({
            title: 'Vider toute la toile ?',
            message: 'Voulez-vous supprimer définitivement tous les nœuds de votre toile d\'araignée pour recommencer à zéro ?',
            onConfirm: () => {
                graphStore.clearGraph();
            }
        });
    });
}
