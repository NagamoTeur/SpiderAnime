/**
 * AuthModal.js
 * Cyberpunk Glassmorphic Authentication & User Profile Modal
 * Defers DOM creation safely until document.body is ready.
 */

import { authService, AVATARS } from '../services/authService.js';
import { graphStore } from '../services/graphStore.js';
import { escapeHTML } from '../utils/security.js';

export class AuthModal {
    constructor() {
        this.isOpen = false;
        this.selectedAvatar = AVATARS[0].id;
        this.activeTab = 'login';
        this.initialized = false;

        // Global delegate listener to open Auth Modal from navbar button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btn-user-account')) {
                this.open();
            }
        });

        authService.subscribe((user) => {
            this.updateNavbarUserBadge(user);
        });
    }

    ensureDOM() {
        if (this.initialized && this.modal) return true;
        if (!document.body) return false;

        const existingModal = document.getElementById('auth-modal');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="auth-modal" class="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-200">
                <div id="auth-modal-container" class="w-full max-w-md bg-surface-container/95 border border-outline-variant/50 rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200">
                    <div class="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-high/40">
                        <div class="flex items-center gap-2.5">
                            <div class="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <span class="material-symbols-outlined text-[18px]">account_circle</span>
                            </div>
                            <h3 class="font-headline-md text-base font-semibold text-on-surface" id="auth-modal-title">Espace Compte</h3>
                        </div>
                        <button id="btn-close-auth" class="p-1 rounded-xl text-outline hover:text-on-surface hover:bg-white/10 transition-all">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div id="auth-modal-body" class="p-6">
                        <!-- Content rendered dynamically -->
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.modal = document.getElementById('auth-modal');
        this.container = document.getElementById('auth-modal-container');
        this.body = document.getElementById('auth-modal-body');
        this.btnClose = document.getElementById('btn-close-auth');

        this.bindEvents();
        this.initialized = true;
        return true;
    }

    bindEvents() {
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }

        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }
    }

    open() {
        if (!this.ensureDOM()) return;
        this.isOpen = true;
        this.render();
        this.modal?.classList.remove('opacity-0', 'pointer-events-none');
        this.modal?.classList.add('opacity-100', 'pointer-events-auto');
        this.container?.classList.remove('scale-95');
        this.container?.classList.add('scale-100');
    }

    close() {
        if (!this.modal) return;
        this.isOpen = false;
        this.modal.classList.add('opacity-0', 'pointer-events-none');
        this.modal.classList.remove('opacity-100', 'pointer-events-auto');
        this.container?.classList.add('scale-95');
        this.container?.classList.remove('scale-100');
    }

    render() {
        if (!this.ensureDOM()) return;
        const user = authService.getCurrentUser();

        if (user && !user.isGuest) {
            this.renderProfileView(user);
        } else {
            this.renderAuthForm();
        }
    }

    renderProfileView(user) {
        const avatarObj = AVATARS.find(a => a.id === user.avatar) || AVATARS[0];
        const snapshot = graphStore.getSnapshot();

        const safeUsername = escapeHTML(user.username);
        const safeEmail = escapeHTML(user.email);
        const safeDate = escapeHTML(user.createdAt);

        this.body.innerHTML = `
            <div class="space-y-6 text-center">
                <div class="relative inline-block">
                    <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr ${avatarObj.color} p-0.5 shadow-[0_0_20px_rgba(208,188,255,0.4)]">
                        <div class="w-full h-full bg-surface-container-lowest rounded-[14px] flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary text-[36px]">${avatarObj.icon}</span>
                        </div>
                    </div>
                    <span class="absolute bottom-0 right-0 w-4 h-4 bg-tertiary rounded-full border-2 border-surface shadow"></span>
                </div>

                <div>
                    <h3 class="font-display-lg text-xl font-bold text-on-surface">${safeUsername}</h3>
                    <p class="font-label-mono text-xs text-outline mt-0.5">${safeEmail}</p>
                    <span class="inline-block mt-2 font-label-mono text-[10px] bg-secondary/10 text-secondary border border-secondary/30 px-2.5 py-0.5 rounded-full">
                        Membre depuis le ${safeDate}
                    </span>
                </div>

                <div class="grid grid-cols-2 gap-3 p-4 rounded-xl bg-surface-container/60 border border-outline-variant/30 text-center">
                    <div>
                        <span class="font-display-lg text-2xl font-bold text-primary">${snapshot.nodes.length}</span>
                        <span class="font-label-mono text-xs text-outline block mt-0.5">Nœuds sur la Toile</span>
                    </div>
                    <div class="border-l border-outline-variant/30">
                        <span class="font-display-lg text-2xl font-bold text-tertiary">${snapshot.watchlist.length}</span>
                        <span class="font-label-mono text-xs text-outline block mt-0.5">Animés en Watchlist</span>
                    </div>
                </div>

                <div class="pt-2">
                    <button id="btn-logout" class="w-full py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-error/10 text-error border border-error/30 hover:bg-error/20 transition-all flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">logout</span>
                        <span>Se déconnecter</span>
                    </button>
                </div>
            </div>
        `;

        this.body.querySelector('#btn-logout')?.addEventListener('click', () => {
            authService.logout();
            this.render();
        });
    }

    renderAuthForm() {
        this.body.innerHTML = `
            <div class="flex bg-surface-container/60 p-1 rounded-xl border border-outline-variant/30 mb-6">
                <button id="tab-login" class="flex-1 py-1.5 rounded-lg text-xs font-headline-md font-semibold transition-all ${
                    this.activeTab === 'login' ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(208,188,255,0.3)]' : 'text-outline hover:text-on-surface'
                }">Se connecter</button>
                <button id="tab-register" class="flex-1 py-1.5 rounded-lg text-xs font-headline-md font-semibold transition-all ${
                    this.activeTab === 'register' ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(208,188,255,0.3)]' : 'text-outline hover:text-on-surface'
                }">Créer un compte</button>
            </div>

            <div id="auth-error" class="hidden mb-4 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs font-label-mono text-center"></div>

            <form id="auth-form" class="space-y-4">
                ${this.activeTab === 'register' ? `
                    <div>
                        <label class="block font-label-mono text-xs text-outline uppercase mb-1">Nom d'utilisateur</label>
                        <input type="text" id="input-username" required placeholder="ex: OtakuRunner" class="w-full bg-surface-container/70 border border-outline-variant/40 rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                ` : ''}

                <div>
                    <label class="block font-label-mono text-xs text-outline uppercase mb-1">${this.activeTab === 'register' ? 'Email' : 'Identifiant / Email'}</label>
                    <input type="text" id="input-email" required placeholder="${this.activeTab === 'register' ? 'votre@email.com' : 'Nom d\'utilisateur ou email'}" class="w-full bg-surface-container/70 border border-outline-variant/40 rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>

                <div>
                    <label class="block font-label-mono text-xs text-outline uppercase mb-1">Mot de passe</label>
                    <input type="password" id="input-password" required placeholder="••••••••" class="w-full bg-surface-container/70 border border-outline-variant/40 rounded-xl px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:border-primary" />
                </div>

                ${this.activeTab === 'register' ? `
                    <div>
                        <label class="block font-label-mono text-xs text-outline uppercase mb-2">Choix de l'Avatar</label>
                        <div class="grid grid-cols-5 gap-2">
                            ${AVATARS.map(av => `
                                <button type="button" class="avatar-select-btn p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                    this.selectedAvatar === av.id ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(208,188,255,0.3)]' : 'border-outline-variant/30 text-outline hover:border-white/40'
                                }" data-avatar-id="${av.id}">
                                    <span class="material-symbols-outlined text-[20px]">${av.icon}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <button type="submit" class="w-full py-2.5 rounded-xl font-headline-md text-xs font-semibold bg-primary text-on-primary hover:bg-primary-fixed shadow-[0_0_15px_rgba(208,188,255,0.4)] transition-all flex items-center justify-center gap-2 mt-6">
                    <span class="material-symbols-outlined text-[18px]">${this.activeTab === 'register' ? 'person_add' : 'login'}</span>
                    <span>${this.activeTab === 'register' ? 'Créer mon compte' : 'Connexion'}</span>
                </button>
            </form>
        `;

        const tabLogin = this.body.querySelector('#tab-login');
        const tabRegister = this.body.querySelector('#tab-register');
        const form = this.body.querySelector('#auth-form');
        const errorBox = this.body.querySelector('#auth-error');

        tabLogin?.addEventListener('click', () => {
            this.activeTab = 'login';
            this.render();
        });

        tabRegister?.addEventListener('click', () => {
            this.activeTab = 'register';
            this.render();
        });

        this.body.querySelectorAll('.avatar-select-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedAvatar = btn.dataset.avatarId;
                this.render();
            });
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            errorBox.classList.add('hidden');

            try {
                if (this.activeTab === 'register') {
                    const username = this.body.querySelector('#input-username')?.value;
                    const email = this.body.querySelector('#input-email')?.value;
                    const password = this.body.querySelector('#input-password')?.value;

                    authService.register(username, email, password, this.selectedAvatar);
                } else {
                    const usernameOrEmail = this.body.querySelector('#input-email')?.value;
                    const password = this.body.querySelector('#input-password')?.value;

                    authService.login(usernameOrEmail, password);
                }

                this.close();
            } catch (err) {
                if (errorBox) {
                    errorBox.textContent = escapeHTML(err.message);
                    errorBox.classList.remove('hidden');
                }
            }
        });
    }

    updateNavbarUserBadge(user) {
        const badgeBtn = document.getElementById('btn-user-account');
        if (!badgeBtn) return;

        if (user && !user.isGuest) {
            const avatarObj = AVATARS.find(a => a.id === user.avatar) || AVATARS[0];
            const safeUsername = escapeHTML(user.username);
            badgeBtn.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${avatarObj.color} p-0.5 flex items-center justify-center shadow-[0_0_10px_rgba(208,188,255,0.4)]">
                    <div class="w-full h-full bg-surface-container-lowest rounded-full flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[18px]">${avatarObj.icon}</span>
                    </div>
                </div>
                <span class="hidden sm:inline text-xs font-label-mono text-on-surface font-semibold">${safeUsername}</span>
            `;
        } else {
            badgeBtn.innerHTML = `
                <div class="p-2 rounded-full hover:bg-white/5 transition-all text-primary flex items-center gap-2">
                    <span class="material-symbols-outlined text-[24px]">account_circle</span>
                    <span class="hidden sm:inline text-xs font-label-mono text-outline">Connexion</span>
                </div>
            `;
        }
    }
}
