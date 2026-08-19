/**
 * AuthService.js
 * Manages user registration, authentication, profiles, and per-user state binding.
 */

const USERS_STORAGE_KEY = 'anigraph_users_v1';
const CURRENT_USER_KEY = 'anigraph_current_user_v1';

export const AVATARS = [
    { id: 'neon_hacker', name: 'Cyber Hacker', icon: 'terminal', color: 'from-primary to-secondary' },
    { id: 'samurai', name: 'Neon Samurai', icon: 'shield', color: 'from-secondary to-tertiary' },
    { id: 'mage', name: 'Spell Caster', icon: 'auto_awesome', color: 'from-primary to-tertiary' },
    { id: 'mech', name: 'Mecha Pilot', icon: 'smart_toy', color: 'from-tertiary to-secondary' },
    { id: 'ghost', name: 'Net Runner', icon: 'visibility', color: 'from-secondary to-primary' }
];

const GUEST_USER = {
    id: 'guest_account',
    username: 'Invité',
    email: 'guest@anigraph.app',
    avatar: 'neon_hacker',
    isGuest: true,
    createdAt: new Date().toLocaleDateString()
};

class AuthService {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.listeners = new Set();
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this.currentUser));
    }

    loadUsers() {
        try {
            const saved = localStorage.getItem(USERS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    loadCurrentUser() {
        try {
            const saved = localStorage.getItem(CURRENT_USER_KEY);
            return saved ? JSON.parse(saved) : GUEST_USER;
        } catch (e) {
            return GUEST_USER;
        }
    }

    saveUsers() {
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(this.users));
        } catch (e) {
            console.warn('[AuthService] Storage write error:', e);
        }
    }

    saveCurrentUser(user) {
        this.currentUser = user;
        try {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        } catch (e) {
            console.warn('[AuthService] Storage write error:', e);
        }
        this.notify();
    }

    getCurrentUser() {
        return this.currentUser || GUEST_USER;
    }

    register(username, email, password, avatar = 'neon_hacker') {
        if (!username || !email || !password) {
            throw new Error('Veuillez remplir tous les champs obligatoires.');
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = this.users.find(u => u.email.toLowerCase() === normalizedEmail || u.username.toLowerCase() === username.trim().toLowerCase());

        if (existing) {
            throw new Error('Un compte existe déjà avec ce nom d\'utilisateur ou cet email.');
        }

        const newUser = {
            id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            username: username.trim(),
            email: normalizedEmail,
            password: password, // Simple prototype storage
            avatar,
            isGuest: false,
            createdAt: new Date().toLocaleDateString()
        };

        this.users.push(newUser);
        this.saveUsers();
        this.saveCurrentUser(newUser);
        return newUser;
    }

    login(usernameOrEmail, password) {
        if (!usernameOrEmail || !password) {
            throw new Error('Veuillez saisir votre identifiant et mot de passe.');
        }

        const query = usernameOrEmail.trim().toLowerCase();
        const user = this.users.find(u =>
            (u.email.toLowerCase() === query || u.username.toLowerCase() === query) &&
            u.password === password
        );

        if (!user) {
            throw new Error('Identifiants incorrects. Veuillez réessayer.');
        }

        this.saveCurrentUser(user);
        return user;
    }

    logout() {
        this.saveCurrentUser(GUEST_USER);
    }
}

export const authService = new AuthService();
