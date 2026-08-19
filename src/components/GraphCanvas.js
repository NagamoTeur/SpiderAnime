/**
 * GraphCanvas.js - Anamorphosis Engine & Holographic Web Canvas Overhaul
 * Implements Anamorphosis Gravitational Force (distance proportional to relevance %),
 * Holographic 3D Cards with scale transformation and % Match badges, and variable-speed energy pulses.
 */

import { graphStore } from '../services/graphStore.js';
import { confirmModal } from './ConfirmModal.js';

export class GraphCanvas {
    constructor(canvasId = 'graph-canvas') {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.links = [];
        this.selectedNodeId = null;
        this.hoveredNodeId = null;
        this.hoveredExpandNodeId = null;
        this.hoveredDeleteNodeId = null;

        this.imageCache = new Map();

        this.transform = { x: 0, y: 0, scale: 1 };
        this.isDraggingCanvas = false;
        this.dragStart = { x: 0, y: 0 };

        this.draggedNode = null;
        this.isNodeDragging = false;

        this.pulseOffset = 0;
        this.physicsEnabled = true;

        this.initCanvasSize();
        this.initD3Force();
        this.bindEvents();

        this.unsubscribe = graphStore.subscribe((snapshot) => {
            this.updateGraphData(snapshot.nodes, snapshot.links, snapshot.selectedNodeId);
        });

        this.startLoop();
    }

    initCanvasSize() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            if (!this.centerInitialized) {
                this.transform.x = this.canvas.width / 2;
                this.transform.y = this.canvas.height / 2;
                this.centerInitialized = true;
            }
            if (this.simulation) {
                this.simulation.force('center', d3.forceCenter(0, 0));
                this.simulation.alpha(0.4).restart();
            }
        };
        window.addEventListener('resize', resize);
        resize();
    }

    initD3Force() {
        if (typeof d3 === 'undefined') return;

        this.simulation = d3.forceSimulation([])
            .force('link', d3.forceLink([]).id(d => d.id).distance(d => d.distance || 180).strength(0.45))
            .force('charge', d3.forceManyBody().strength(-600))
            .force('center', d3.forceCenter(0, 0))
            .force('collide', d3.forceCollide().radius(d => (d.anamorphScale || 1.0) * 75).iterations(3))
            .on('tick', () => {});
    }

    updateGraphData(nodesData, linksData, selectedId) {
        this.selectedNodeId = selectedId;

        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));
        this.nodes = nodesData.map(n => {
            const existing = nodeMap.get(n.id);
            if (existing) {
                return { ...existing, ...n, x: existing.x, y: existing.y, fx: existing.fx, fy: existing.fy };
            }
            this.preloadImage(n.image_url);
            return { ...n, x: (Math.random() - 0.5) * 350, y: (Math.random() - 0.5) * 350 };
        });

        this.links = linksData.map(l => ({
            source: typeof l.source === 'object' ? l.source.id : l.source,
            target: typeof l.target === 'object' ? l.target.id : l.target,
            type: l.type,
            relevancePct: l.relevancePct || 80,
            distance: l.distance || 180,
            pulseSpeed: l.pulseSpeed || 0.015
        }));

        if (this.simulation) {
            this.simulation.nodes(this.nodes);
            this.simulation.force('link').links(this.links);
            this.simulation.alpha(0.6).restart();
        }
    }

    preloadImage(url) {
        if (!url || this.imageCache.has(url)) return;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => this.imageCache.set(url, img);
        img.onerror = () => this.imageCache.set(url, null);
    }

    bindEvents() {
        const c = this.canvas;

        c.addEventListener('pointerdown', (e) => {
            const mousePos = this.getCanvasCoords(e);

            if (this.hoveredExpandNodeId) {
                graphStore.expandNode(this.hoveredExpandNodeId);
                this.hoveredExpandNodeId = null;
                return;
            }

            if (this.hoveredDeleteNodeId) {
                const targetNode = this.nodes.find(n => n.id === this.hoveredDeleteNodeId);
                const delId = this.hoveredDeleteNodeId;
                if (targetNode) {
                    confirmModal.ask({
                        title: 'Retirer cet animé ?',
                        message: `Voulez-vous retirer "${targetNode.title}" de votre toile d'araignée ?`,
                        posterUrl: targetNode.image_url,
                        onConfirm: () => graphStore.removeNode(delId)
                    });
                }
                this.hoveredDeleteNodeId = null;
                return;
            }

            const hitNode = this.getNodeAt(mousePos.x, mousePos.y);

            if (hitNode) {
                this.draggedNode = hitNode;
                this.isNodeDragging = true;
                hitNode.fx = mousePos.x;
                hitNode.fy = mousePos.y;
                if (this.physicsEnabled && this.simulation) {
                    this.simulation.alphaTarget(0.3).restart();
                }
                graphStore.selectNode(hitNode.id);
            } else {
                this.isDraggingCanvas = true;
                this.dragStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
            }
        });

        c.addEventListener('pointermove', (e) => {
            const mousePos = this.getCanvasCoords(e);

            if (this.isNodeDragging && this.draggedNode) {
                this.draggedNode.fx = mousePos.x;
                this.draggedNode.fy = mousePos.y;
                this.draggedNode.x = mousePos.x;
                this.draggedNode.y = mousePos.y;
                return;
            }

            if (this.isDraggingCanvas) {
                this.transform.x = e.clientX - this.dragStart.x;
                this.transform.y = e.clientY - this.dragStart.y;
                return;
            }

            const hovered = this.getNodeAt(mousePos.x, mousePos.y);
            this.hoveredNodeId = hovered ? hovered.id : null;

            let isExpandHovered = false;
            let isDeleteHovered = false;

            if (hovered) {
                const scale = hovered.anamorphScale || 1.0;
                const cardW = (hovered.isFavorite ? 150 : 135) * scale;
                const cardH = 54 * scale;

                const expX = hovered.x + cardW / 2 - 18 * scale;
                const expY = hovered.y + cardH / 2 - 12 * scale;
                if (Math.hypot(expX - mousePos.x, expY - mousePos.y) <= 14 * scale) {
                    isExpandHovered = true;
                    this.hoveredExpandNodeId = hovered.id;
                }

                const delX = hovered.x + cardW / 2 - 6 * scale;
                const delY = hovered.y - cardH / 2 + 6 * scale;
                if (Math.hypot(delX - mousePos.x, delY - mousePos.y) <= 12 * scale) {
                    isDeleteHovered = true;
                    this.hoveredDeleteNodeId = hovered.id;
                }
            }

            if (!isExpandHovered) this.hoveredExpandNodeId = null;
            if (!isDeleteHovered) this.hoveredDeleteNodeId = null;

            c.style.cursor = (isExpandHovered || isDeleteHovered) ? 'pointer' : (hovered ? 'grab' : (this.isDraggingCanvas ? 'grabbing' : 'default'));
        });

        const stopDrag = () => {
            if (this.isNodeDragging && this.draggedNode) {
                this.draggedNode.fx = this.draggedNode.x;
                this.draggedNode.fy = this.draggedNode.y;
                if (this.simulation) this.simulation.alphaTarget(0);
            }
            this.isNodeDragging = false;
            this.draggedNode = null;
            this.isDraggingCanvas = false;
        };

        c.addEventListener('pointerup', stopDrag);
        c.addEventListener('pointerleave', stopDrag);

        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
            const newScale = Math.max(0.2, Math.min(4.0, this.transform.scale * zoomFactor));

            const mouseX = e.clientX;
            const mouseY = e.clientY;

            this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
            this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
            this.transform.scale = newScale;
        }, { passive: false });
    }

    getCanvasCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.transform.x) / this.transform.scale,
            y: (e.clientY - rect.top - this.transform.y) / this.transform.scale
        };
    }

    getNodeAt(x, y) {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const n = this.nodes[i];
            const scale = n.anamorphScale || 1.0;
            const w = ((n.isFavorite ? 150 : 135) * scale) / 2 + 10;
            const h = (54 * scale) / 2 + 10;
            if (Math.abs(n.x - x) <= w && Math.abs(n.y - y) <= h) {
                return n;
            }
        }
        return null;
    }

    zoomIn() {
        this.transform.scale = Math.min(4.0, this.transform.scale * 1.25);
    }

    zoomOut() {
        this.transform.scale = Math.max(0.2, this.transform.scale * 0.8);
    }

    resetView() {
        this.transform.x = this.canvas.width / 2;
        this.transform.y = this.canvas.height / 2;
        this.transform.scale = 1.0;
        this.nodes.forEach(n => { n.fx = null; n.fy = null; });
        if (this.simulation) this.simulation.alpha(0.5).restart();
    }

    togglePhysics() {
        this.physicsEnabled = !this.physicsEnabled;
        if (this.simulation) {
            if (this.physicsEnabled) this.simulation.alpha(0.5).restart();
            else this.simulation.stop();
        }
        return this.physicsEnabled;
    }

    startLoop() {
        const loop = () => {
            this.pulseOffset = (this.pulseOffset + 0.010) % 1.0;
            this.render();
            requestAnimationFrame(loop);
        };
        loop();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(this.transform.x, this.transform.y);
        ctx.scale(this.transform.scale, this.transform.scale);

        // 1. Render Organic Spider Web Filaments with Anamorphosis Pulses
        this.links.forEach(l => {
            const source = typeof l.source === 'object' ? l.source : this.nodes.find(n => n.id === l.source);
            const target = typeof l.target === 'object' ? l.target : this.nodes.find(n => n.id === l.target);
            if (source && target) this.drawSpiderWebStrand(source, target, l);
        });

        // 2. Render Glassmorphic Floating Cards with Anamorphosis Scale & Match Badges
        this.nodes.forEach(n => this.drawGlassmorphicNodeCard(n));

        ctx.restore();
    }

    drawSpiderWebStrand(source, target, link) {
        const ctx = this.ctx;
        const isHovered = this.hoveredNodeId && (source.id === this.hoveredNodeId || target.id === this.hoveredNodeId);
        const isSelected = this.selectedNodeId && (source.id === this.selectedNodeId || target.id === this.selectedNodeId);

        const relevance = link.relevancePct || target.relevancePct || 80;
        const isHighMatch = relevance >= 85;

        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const cpX = midX + (target.y - source.y) * 0.15;
        const cpY = midY - (target.x - source.x) * 0.15;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y);

        const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        const sourceColor = isHighMatch ? 'rgba(208, 188, 255, 0.85)' : 'rgba(76, 215, 246, 0.45)';
        const targetColor = isHighMatch ? 'rgba(208, 188, 255, 0.85)' : 'rgba(76, 215, 246, 0.45)';

        grad.addColorStop(0, sourceColor);
        grad.addColorStop(1, targetColor);

        ctx.strokeStyle = grad;
        ctx.lineWidth = isHovered || isSelected ? 3.2 : (isHighMatch ? 2.2 : 1.1);

        if (isHovered || isSelected || isHighMatch) {
            ctx.shadowColor = isHighMatch ? '#d0bcff' : '#4cd7f6';
            ctx.shadowBlur = isHighMatch ? 16 : 8;
        }

        ctx.stroke();

        // Anamorphosis Variable Speed Particle Pulses
        const speed = link.pulseSpeed || 0.015;
        for (let i = 0; i < 2; i++) {
            const t = (this.pulseOffset * (speed / 0.015) + (i * 0.5)) % 1.0;
            const px = (1 - t) * (1 - t) * source.x + 2 * (1 - t) * t * cpX + t * t * target.x;
            const py = (1 - t) * (1 - t) * source.y + 2 * (1 - t) * t * cpY + t * t * target.y;

            ctx.beginPath();
            ctx.arc(px, py, isHighMatch ? 3.8 : 2.2, 0, Math.PI * 2);
            ctx.fillStyle = isHighMatch ? '#d0bcff' : '#4cd7f6';
            ctx.shadowColor = '#4cd7f6';
            ctx.shadowBlur = 10;
            ctx.fill();
        }

        ctx.restore();
    }

    drawGlassmorphicNodeCard(node) {
        const ctx = this.ctx;
        const isFavorite = node.isFavorite;
        const isSelected = node.id === this.selectedNodeId;
        const isHovered = node.id === this.hoveredNodeId;
        
        const scale = node.anamorphScale || 1.0;
        const width = (isFavorite ? 150 : 135) * scale;
        const height = 54 * scale;
        const rx = 12 * scale;

        const relevance = node.relevancePct || 85;
        const isHighMatch = relevance >= 85;

        ctx.save();
        ctx.translate(node.x, node.y);

        const left = -width / 2;
        const top = -height / 2;

        // 1. Holographic Backdrop Glow
        ctx.beginPath();
        this.roundRectPath(ctx, left - 2, top - 2, width + 4, height + 4, rx + 2);
        ctx.fillStyle = isFavorite ? 'rgba(208, 188, 255, 0.3)' : (isHighMatch ? 'rgba(78, 222, 163, 0.25)' : 'rgba(76, 215, 246, 0.15)');
        ctx.shadowColor = isFavorite ? '#d0bcff' : (isHighMatch ? '#4edea3' : '#4cd7f6');
        ctx.shadowBlur = isSelected ? 26 : (isHovered ? 18 : (isHighMatch ? 12 : 6));
        ctx.fill();

        // 2. Glass Card Fill
        ctx.beginPath();
        this.roundRectPath(ctx, left, top, width, height, rx);
        ctx.fillStyle = isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(23, 31, 51, 0.88)';
        ctx.fill();

        // 3. Neon Border Stroke
        ctx.lineWidth = isSelected ? 2.5 : (isFavorite ? 2.0 : 1.2);
        ctx.strokeStyle = isFavorite ? '#d0bcff' : (isHighMatch ? '#4edea3' : (isHovered ? '#4cd7f6' : 'rgba(255, 255, 255, 0.25)'));
        ctx.stroke();

        // 4. Poster Image (Left)
        const imgW = 40 * scale;
        const imgH = 46 * scale;
        const imgX = left + 4 * scale;
        const imgY = top + 4 * scale;

        const img = this.imageCache.get(node.image_url);
        ctx.save();
        ctx.beginPath();
        this.roundRectPath(ctx, imgX, imgY, imgW, imgH, 8 * scale);
        ctx.clip();
        if (img) {
            ctx.drawImage(img, imgX, imgY, imgW, imgH);
        } else {
            ctx.fillStyle = '#2d3449';
            ctx.fillRect(imgX, imgY, imgW, imgH);
            ctx.fillStyle = '#cbc3d7';
            ctx.font = `600 ${11 * scale}px Sora, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.title ? node.title.substring(0, 2) : 'AN', imgX + imgW / 2, imgY + imgH / 2);
        }
        ctx.restore();

        // Pokédex Status Dot Indicator
        const statusColor = node.watchStatus === 'completed' ? '#8b5cf6' : (node.watchStatus === 'watching' ? '#10b981' : '#4cd7f6');
        ctx.beginPath();
        ctx.arc(imgX + 4 * scale, imgY + 4 * scale, 3.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = statusColor;
        ctx.shadowColor = statusColor;
        ctx.shadowBlur = 4;
        ctx.fill();

        // 5. Anime Title (Right)
        const textX = imgX + imgW + 6 * scale;
        const maxTextW = width - imgW - 16 * scale;

        ctx.fillStyle = isSelected ? '#ffffff' : (isFavorite ? '#dae2fd' : '#cbc3d7');
        ctx.font = `600 ${Math.max(10, 11 * scale)}px Sora, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const displayTitle = node.title.length > 14 ? node.title.substring(0, 12) + '...' : node.title;
        ctx.fillText(displayTitle, textX, top + 6 * scale, maxTextW);

        // 6. Compatibility % Match & Score Badge
        ctx.fillStyle = isHighMatch ? '#4edea3' : '#4cd7f6';
        ctx.font = `600 ${Math.max(9, 9.5 * scale)}px Geist, monospace`;
        const epInfo = node.watchedEpisodes !== undefined ? ` • ${node.watchedEpisodes}/${node.totalEpisodes || '?'}` : '';
        ctx.fillText(`${relevance}% Match${epInfo}`, textX, top + 24 * scale);

        // 7. Inline (+) Tisser Button (Bottom Right)
        const isExpHovered = this.hoveredExpandNodeId === node.id;
        const expX = left + width - 16 * scale;
        const expY = top + height - 12 * scale;

        ctx.beginPath();
        ctx.arc(expX, expY, 8.5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = isExpHovered ? '#4cd7f6' : 'rgba(76, 215, 246, 0.2)';
        ctx.strokeStyle = '#4cd7f6';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isExpHovered ? '#003640' : '#4cd7f6';
        ctx.font = `bold ${10 * scale}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', expX, expY);

        // 8. Quick Remove Delete Button (Top Right ✕)
        if (isHovered || isSelected) {
            const isDelHovered = this.hoveredDeleteNodeId === node.id;
            const delX = left + width - 6 * scale;
            const delY = top + 6 * scale;

            ctx.beginPath();
            ctx.arc(delX, delY, 7.5 * scale, 0, Math.PI * 2);
            ctx.fillStyle = isDelHovered ? '#ff4d4d' : '#93000a';
            ctx.shadowColor = '#ff4d4d';
            ctx.shadowBlur = isDelHovered ? 8 : 4;
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${9 * scale}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', delX, delY);
        }

        ctx.restore();
    }

    roundRectPath(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
