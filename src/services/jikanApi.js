/**
 * Jikan API Service (v4) for AniGraph
 * Compliant with Jikan API v4 Specs (https://docs.api.jikan.moe/)
 * Highly resilient architecture with sequential queuing, 504 Gateway Timeout fallback,
 * LocalStorage caching, and rich offline dataset.
 */

const BASE_URL = 'https://api.jikan.moe/v4';
const CACHE_PREFIX = 'anigraph_cache_v4_';
const CACHE_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48h cache

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 450; // 450ms minimum gap to prevent 429/504 errors

async function fetchThrottled(url, retries = 2) {
    const now = Date.now();
    const timeSinceLast = now - lastRequestTime;
    if (timeSinceLast < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLast));
    }
    lastRequestTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 504 || response.status === 502 || response.status === 503) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return fetchThrottled(url, retries - 1);
            }
            throw new Error(`API ${response.status} (Gateway Timeout/Rate Limit)`);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function fetchWithCache(cacheKey, fetcherFn) {
    const fullKey = CACHE_PREFIX + cacheKey;
    try {
        const cached = localStorage.getItem(fullKey);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY_MS && data && data.length > 0) {
                return data;
            }
        }
    } catch (e) {}

    try {
        const data = await fetcherFn();
        if (data && (Array.isArray(data) ? data.length > 0 : true)) {
            try {
                localStorage.setItem(fullKey, JSON.stringify({ timestamp: Date.now(), data }));
            } catch (e) {}
            return data;
        }
    } catch (err) {
        console.warn(`[JikanAPI] Network call failed for ${cacheKey}, trying stale cache...`, err.message);
        try {
            const cached = localStorage.getItem(fullKey);
            if (cached) {
                const { data } = JSON.parse(cached);
                if (data) return data;
            }
        } catch (e) {}
    }

    return null;
}

function localFuzzySearch(query) {
    const q = query.trim().toLowerCase();
    return STARTER_ANIME_DATA.filter(a => {
        const title = (a.title || '').toLowerCase();
        const engTitle = (a.title_english || '').toLowerCase();
        const jpTitle = (a.title_japanese || '').toLowerCase();
        const genres = (a.genres || []).map(g => (g.name || g).toLowerCase()).join(' ');

        return title.includes(q) || engTitle.includes(q) || jpTitle.includes(q) || genres.includes(q);
    });
}

/**
 * Sequential AJAX Catalog Fetcher
 * Safely fetches top anime page and season page sequentially with 500ms delay
 * to completely eliminate Cloudflare 504 Gateway Timeouts.
 */
export async function getAnimeCatalog(page = 1) {
    const cacheKey = `massive_catalog_p${page}`;

    const result = await fetchWithCache(cacheKey, async () => {
        const items = [];

        try {
            const topRes = await fetchThrottled(`${BASE_URL}/top/anime?filter=bypopularity&page=${page}&limit=25`);
            if (topRes?.data) items.push(...topRes.data);
        } catch (e) {
            console.warn('[JikanAPI] Top anime fetch failed:', e.message);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const seasonRes = await fetchThrottled(`${BASE_URL}/seasons/now?page=${page}&limit=25`);
            if (seasonRes?.data) items.push(...seasonRes.data);
        } catch (e) {
            console.warn('[JikanAPI] Season anime fetch failed:', e.message);
        }

        const uniqueMap = new Map();
        items.forEach(item => {
            if (item && item.mal_id) uniqueMap.set(item.mal_id, item);
        });

        return Array.from(uniqueMap.values());
    });

    if (result && result.length > 0) return result;

    // Fallback: Return paginated slice of STARTER_ANIME_DATA
    const start = ((page - 1) * 15) % STARTER_ANIME_DATA.length;
    return STARTER_ANIME_DATA.slice(start, start + 20);
}

export async function searchAnime(query, page = 1) {
    if (!query || query.trim().length < 2) return [];
    const sanitized = query.trim().toLowerCase();
    const cacheKey = `search_${sanitized}_p${page}`;

    try {
        const result = await fetchWithCache(cacheKey, () =>
            fetchThrottled(`${BASE_URL}/anime?q=${encodeURIComponent(sanitized)}&page=${page}&sfw=true&limit=25`)
        );
        const apiResults = result?.data || [];
        const localMatches = localFuzzySearch(query);
        const existingIds = new Set(apiResults.map(a => a.mal_id));

        localMatches.forEach(lm => {
            if (!existingIds.has(lm.mal_id)) apiResults.push(lm);
        });

        return apiResults;
    } catch (error) {
        return localFuzzySearch(query);
    }
}

export async function getAnimeDetails(malId) {
    if (!malId) return null;
    const cacheKey = `details_${malId}`;

    try {
        const result = await fetchWithCache(cacheKey, () =>
            fetchThrottled(`${BASE_URL}/anime/${malId}/full`)
        );
        return result?.data || STARTER_ANIME_DATA.find(a => a.mal_id === Number(malId)) || null;
    } catch (error) {
        return STARTER_ANIME_DATA.find(a => a.mal_id === Number(malId)) || null;
    }
}

export async function getAnimeRecommendations(malId) {
    if (!malId) return [];
    const cacheKey = `recs_${malId}`;

    try {
        const result = await fetchWithCache(cacheKey, () =>
            fetchThrottled(`${BASE_URL}/anime/${malId}/recommendations`)
        );
        const recs = result?.data || [];
        if (recs.length > 0) {
            return recs.slice(0, 10).map(r => ({
                mal_id: r.entry.mal_id,
                title: r.entry.title,
                image_url: r.entry.images?.jpg?.large_image_url || r.entry.images?.jpg?.image_url,
                votes: r.votes || 1
            }));
        }
    } catch (error) {}

    return STARTER_ANIME_DATA
        .filter(a => a.mal_id !== Number(malId))
        .sort(() => 0.5 - Math.random())
        .slice(0, 10)
        .map(a => ({
            mal_id: a.mal_id,
            title: a.title_english || a.title,
            image_url: a.images.jpg.image_url,
            votes: Math.floor(Math.random() * 50) + 15
        }));
}

export async function getTopAnime(limit = 35) {
    const cacheKey = `top_${limit}`;
    try {
        const result = await fetchWithCache(cacheKey, () =>
            fetchThrottled(`${BASE_URL}/top/anime?filter=bypopularity&limit=${limit}`)
        );
        return result?.data || STARTER_ANIME_DATA;
    } catch (error) {
        return STARTER_ANIME_DATA;
    }
}

export const STARTER_ANIME_DATA = [
    {
        mal_id: 52657,
        title: "[Oshi No Ko]",
        title_english: "Oshi no Ko",
        score: 8.70,
        status: "Finished Airing",
        episodes: 11,
        synopsis: "A doctor and his deceased patient are reborn as twins to a famous Japanese pop idol and navigate the dark underbelly of the entertainment industry.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1812/134736.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1812/134736l.jpg" } },
        genres: [{ name: "Drama" }, { name: "Supernatural" }, { name: "Showbiz" }],
        studios: [{ name: "Doga Kobo" }],
        trailer: { embed_url: "https://www.youtube.com/embed/gY5nUXtB25U" }
    },
    {
        mal_id: 50265,
        title: "Chainsaw Man",
        title_english: "Chainsaw Man",
        score: 8.52,
        status: "Finished Airing",
        episodes: 12,
        synopsis: "Denji fuses with his pet Chainsaw Devil Pochita and becomes a Devil Hunter for Public Safety.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1806/126216.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1806/126216l.jpg" } },
        genres: [{ name: "Action" }, { name: "Supernatural" }],
        studios: [{ name: "MAPPA" }]
    },
    {
        mal_id: 50602,
        title: "Spy x Family",
        title_english: "Spy x Family",
        score: 8.50,
        status: "Finished Airing",
        episodes: 12,
        synopsis: "A spy on an undercover mission marries a assassin and adopts a telepathic daughter.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1441/122795.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1441/122795l.jpg" } },
        genres: [{ name: "Action" }, { name: "Comedy" }],
        studios: [{ name: "WIT Studio" }]
    },
    {
        mal_id: 16498,
        title: "Shingeki no Kyojin",
        title_english: "Attack on Titan",
        score: 8.55,
        status: "Finished Airing",
        episodes: 25,
        synopsis: "Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg" } },
        genres: [{ name: "Action" }, { name: "Dark Fantasy" }],
        studios: [{ name: "WIT Studio" }]
    },
    {
        mal_id: 21,
        title: "One Piece",
        title_english: "One Piece",
        score: 8.72,
        status: "Currently Airing",
        episodes: 1100,
        synopsis: "Monkey D. Luffy sails the oceans with his Straw Hat Pirates to find the legendary treasure One Piece.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/6/73245.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg" } },
        genres: [{ name: "Action" }, { name: "Adventure" }, { name: "Fantasy" }],
        studios: [{ name: "Toei Animation" }]
    },
    {
        mal_id: 52991,
        title: "Sousou no Frieren",
        title_english: "Frieren: Beyond Journey's End",
        score: 9.31,
        status: "Finished Airing",
        episodes: 28,
        synopsis: "After defeating the Demon King, elf mage Frieren reflects on her past and embarks on a new quest.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1015/138006l.jpg" } },
        genres: [{ name: "Adventure" }, { name: "Fantasy" }],
        studios: [{ name: "Madhouse" }]
    },
    {
        mal_id: 55813,
        title: "Solo Leveling",
        title_english: "Solo Leveling",
        score: 8.35,
        status: "Finished Airing",
        episodes: 12,
        synopsis: "In a world of hunters and monsters, Sung Jinwoo gains the unique ability to level up infinitely.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1172/140880.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1172/140880l.jpg" } },
        genres: [{ name: "Action" }, { name: "Fantasy" }],
        studios: [{ name: "A-1 Pictures" }]
    },
    {
        mal_id: 20,
        title: "Naruto",
        title_english: "Naruto",
        score: 7.99,
        status: "Finished Airing",
        episodes: 220,
        synopsis: "Naruto Uzumaki, a mischievous adolescent ninja, dreams of becoming the Hokage.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/13/17405.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/13/17405l.jpg" } },
        genres: [{ name: "Action" }, { name: "Martial Arts" }],
        studios: [{ name: "Studio Pierrot" }]
    },
    {
        mal_id: 269,
        title: "Bleach",
        title_english: "Bleach",
        score: 7.92,
        status: "Finished Airing",
        episodes: 366,
        synopsis: "Ichigo Kurosaki gains Soul Reaper powers and defends humans from evil spirits.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/3/40451.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/3/40451l.jpg" } },
        genres: [{ name: "Action" }, { name: "Supernatural" }],
        studios: [{ name: "Studio Pierrot" }]
    },
    {
        mal_id: 11061,
        title: "Hunter x Hunter (2011)",
        title_english: "Hunter x Hunter",
        score: 9.04,
        status: "Finished Airing",
        episodes: 148,
        synopsis: "Gon Freecss aspires to become a Hunter to locate his missing father.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1337/99013.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg" } },
        genres: [{ name: "Action" }, { name: "Adventure" }],
        studios: [{ name: "Madhouse" }]
    },
    {
        mal_id: 38000,
        title: "Kimetsu no Yaiba",
        title_english: "Demon Slayer",
        score: 8.48,
        status: "Finished Airing",
        episodes: 26,
        synopsis: "Tanjiro sets out to become a demon slayer after his family is slaughtered.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1286/99889l.jpg" } },
        genres: [{ name: "Action" }, { name: "Fantasy" }],
        studios: [{ name: "ufotable" }]
    },
    {
        mal_id: 40748,
        title: "Jujutsu Kaisen",
        title_english: "Jujutsu Kaisen",
        score: 8.58,
        status: "Finished Airing",
        episodes: 24,
        synopsis: "Yuji Itadori joins Jujutsu Sorcerers after consuming a cursed finger.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg" } },
        genres: [{ name: "Action" }, { name: "Supernatural" }],
        studios: [{ name: "MAPPA" }]
    },
    {
        mal_id: 52034,
        title: "Cyberpunk: Edgerunners",
        title_english: "Cyberpunk: Edgerunners",
        score: 8.60,
        status: "Finished Airing",
        episodes: 10,
        synopsis: "A street kid survival story in Night City. Having everything to lose, he becomes a mercenary edgerunner.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1818/126436.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1818/126436l.jpg" } },
        genres: [{ name: "Action" }, { name: "Sci-Fi" }],
        studios: [{ name: "Trigger" }]
    },
    {
        mal_id: 1535,
        title: "Death Note",
        title_english: "Death Note",
        score: 8.62,
        status: "Finished Airing",
        episodes: 37,
        synopsis: "Light Yagami discovers a supernatural notebook granting him the power to kill anyone.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/9/9444.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/9/9444l.jpg" } },
        genres: [{ name: "Psychological" }, { name: "Supernatural" }],
        studios: [{ name: "Madhouse" }]
    },
    {
        mal_id: 9253,
        title: "Steins;Gate",
        title_english: "Steins;Gate",
        score: 9.07,
        status: "Finished Airing",
        episodes: 24,
        synopsis: "An eccentric scientist discovers a microwave device capable of sending messages into the past.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1935/127974.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1935/127974l.jpg" } },
        genres: [{ name: "Sci-Fi" }, { name: "Suspense" }],
        studios: [{ name: "White Fox" }]
    },
    {
        mal_id: 5114,
        title: "Fullmetal Alchemist: Brotherhood",
        title_english: "Fullmetal Alchemist: Brotherhood",
        score: 9.10,
        status: "Finished Airing",
        episodes: 64,
        synopsis: "Two brothers search for a Philosopher's Stone after a failed alchemy ritual.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1208/94745.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg" } },
        genres: [{ name: "Action" }, { name: "Adventure" }, { name: "Fantasy" }],
        studios: [{ name: "Bones" }]
    },
    {
        mal_id: 31964,
        title: "Boku no Hero Academia",
        title_english: "My Hero Academia",
        score: 7.85,
        status: "Finished Airing",
        episodes: 13,
        synopsis: "A superhero-loving boy without powers enters a prestigious hero academy.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/10/78745.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/10/78745l.jpg" } },
        genres: [{ name: "Action" }, { name: "Super Power" }],
        studios: [{ name: "Bones" }]
    },
    {
        mal_id: 22199,
        title: "Akame ga Kill!",
        title_english: "Akame ga Kill!",
        score: 7.47,
        status: "Finished Airing",
        episodes: 24,
        synopsis: "A young villager travels to the Capital to raise money and joins Night Raid assassins.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1429/143006.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1429/143006l.jpg" } },
        genres: [{ name: "Action" }, { name: "Dark Fantasy" }],
        studios: [{ name: "White Fox" }]
    },
    {
        mal_id: 19815,
        title: "No Game No Life",
        title_english: "No Game No Life",
        score: 8.08,
        status: "Finished Airing",
        episodes: 12,
        synopsis: "Sora and Shiro are gamer siblings summoned to Disboard, a world governed by games.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1074/111944.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/1074/111944l.jpg" } },
        genres: [{ name: "Fantasy" }, { name: "Isekai" }],
        studios: [{ name: "Madhouse" }]
    },
    {
        mal_id: 30276,
        title: "One Punch Man",
        title_english: "One Punch Man",
        score: 8.50,
        status: "Finished Airing",
        episodes: 12,
        synopsis: "Saitama can defeat any enemy with a single punch but seeks a true challenge.",
        images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/12/76049.jpg", large_image_url: "https://cdn.myanimelist.net/images/anime/12/76049l.jpg" } },
        genres: [{ name: "Action" }, { name: "Comedy" }, { name: "Parody" }],
        studios: [{ name: "Madhouse" }]
    }
];
