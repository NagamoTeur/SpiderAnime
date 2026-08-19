/**
 * ConfirmModal.js
 * Cyberpunk Glassmorphic Confirmation Modal for elegant node deletion.
 * Safely defers DOM creation until document.body is ready.
 */

export class ConfirmModal {
    constructor() {
        this.modal = null;
        this.container = null;
        this.btnCancel = null;
        this.btnAction = null;
        this.titleEl = null;
        this.msgEl = null;
        this.posterEl = null;
        this.onConfirmCallback = null;
        this.initialized = false;
    }

    ensureDOM() {
        if (this.initialized) return true;
        if (!document.body) return false;

        const modalHtml = `
            <div id="confirm-modal" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-200">
                <div id="confirm-modal-container" class="w-full max-w-sm bg-surface-container/95 border border-error/40 rounded-2xl shadow-[0_0_30px_rgba(255,77,77,0.2)] overflow-hidden transform scale-95 transition-transform duration-200 text-center p-6 space-y-5">
                    
                    <div class="w-16 h-16 mx-auto rounded-2xl bg-error/15 border border-error/40 flex items-center justify-center text-error shadow-[0_0_20px_rgba(255,77,77,0.3)]">
                        <span class="material-symbols-outlined text-[36px]">delete_forever</span>
                    </div>

                    <div>
                        <img id="confirm-poster" src="" alt="Poster" class="w-16 h-20 object-cover rounded-lg mx-auto border border-outline-variant/40 shadow mb-3 hidden" />
                        <h3 id="confirm-title" class="font-display-lg text-lg font-bold text-on-surface">Confirmer la suppression</h3>
                        <p id="confirm-message" class="font-body-md text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                            Voulez-vous vraiment retirer cet animé de votre toile d'araignée ?
                        </p>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button id="btn-cancel-confirm" class="flex-1 py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-surface-variant/60 text-on-surface border border-outline-variant/40 hover:bg-white/10 transition-all">
                            Annuler
                        </button>
                        <button id="btn-action-confirm" class="flex-1 py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-error text-white hover:bg-error-container shadow-[0_0_15px_rgba(255,77,77,0.4)] transition-all">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.modal = document.getElementById('confirm-modal');
        this.container = document.getElementById('confirm-modal-container');
        this.btnCancel = document.getElementById('btn-cancel-confirm');
        this.btnAction = document.getElementById('btn-action-confirm');
        this.titleEl = document.getElementById('confirm-title');
        this.msgEl = document.getElementById('confirm-message');
        this.posterEl = document.getElementById('confirm-poster');

        this.bindEvents();
        this.initialized = true;
        return true;
    }

    bindEvents() {
        this.btnCancel?.addEventListener('click', () => this.close());
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        this.btnAction?.addEventListener('click', () => {
            if (this.onConfirmCallback) this.onConfirmCallback();
            this.close();
        });
    }

    ask({ title, message, posterUrl, onConfirm }) {
        if (!this.ensureDOM()) return;
        this.onConfirmCallback = onConfirm;

        if (this.titleEl) this.titleEl.textContent = title || 'Confirmer la suppression';
        if (this.msgEl) this.msgEl.textContent = message || 'Voulez-vous vraiment continuer ?';
        
        if (this.posterEl) {
            if (posterUrl) {
                this.posterEl.src = posterUrl;
                this.posterEl.classList.remove('hidden');
            } else {
                this.posterEl.classList.add('hidden');
            }
        }

        this.open();
    }

    open() {
        if (!this.ensureDOM()) return;
        this.modal?.classList.remove('opacity-0', 'pointer-events-none');
        this.modal?.classList.add('opacity-100', 'pointer-events-auto');
        this.container?.classList.remove('scale-95');
        this.container?.classList.add('scale-100');
    }

    close() {
        if (!this.modal) return;
        this.modal.classList.add('opacity-0', 'pointer-events-none');
        this.modal.classList.remove('opacity-100', 'pointer-events-auto');
        this.container?.classList.add('scale-95');
        this.container?.classList.remove('scale-100');
    }
}

export const confirmModal = new ConfirmModal();
