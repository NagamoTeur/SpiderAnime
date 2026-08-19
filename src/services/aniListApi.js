/**
 * AniList GraphQL API Client for AniGraph (Branch: feature/anilist-api)
 * Replaces Jikan REST API with ultra-fast AniList v2 GraphQL Endpoint (https://graphql.anilist.co).
 * Provides single-query data fetching, high rate-limit tolerance, and rich recommendations.
 */

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const CACHE_PREFIX = 'anigraph_anilist_cache_v1_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

async function queryAniList(query, variables = {}) {
    const response = await fetch(ANILIST_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        throw new Error(`AniList GraphQL Error HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL Query Error');
    }

    return result.data;
}

async function fetchWithCache(cacheKey, fetcherFn) {
    const fullKey = CACHE_PREFIX + cacheKey;
    try {
        const cached = localStorage.getItem(fullKey);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY_MS && data) return data;
        }
    } catch (e) {}

    try {
        const data = await fetcherFn();
        if (data) {
            try {
                localStorage.setItem(fullKey, JSON.stringify({ timestamp: Date.now(), data }));
            } catch (e) {}
            return data;
        }
    } catch (err) {
        console.warn(`[AniListAPI] Error for ${cacheKey}:`, err.message);
    }

    return null;
}

function normalizeAniListMedia(media) {
    if (!media) return null;

    const titleEnglish = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Titre Inconnu';
    const titleRomaji = media.title?.romaji || titleEnglish;
    const scoreDecimal = media.averageScore ? (media.averageScore / 10).toFixed(1) : (media.meanScore ? (media.meanScore / 10).toFixed(1) : '8.0');

    const studioName = media.studios?.nodes?.[0]?.name || media.studios?.edges?.[0]?.node?.name || 'Studio Inconnu';

    let trailerEmbed = '';
    if (media.trailer?.site === 'youtube' && media.trailer?.id) {
        trailerEmbed = `https://www.youtube.com/embed/${media.trailer.id}`;
    }

    return {
        id: media.id,
        mal_id: media.idMal || media.id,
        title: titleEnglish,
        title_english: titleEnglish,
        title_japanese: media.title?.native || titleRomaji,
        score: Number(scoreDecimal),
        episodes: media.episodes || 12,
        status: media.status || 'FINISHED',
        synopsis: media.description ? media.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '') : 'Aucun synopsis disponible.',
        image_url: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || '',
        images: {
            jpg: {
                image_url: media.coverImage?.large || media.coverImage?.medium || '',
                large_image_url: media.coverImage?.extraLarge || media.coverImage?.large || ''
            }
        },
        banner_image: media.bannerImage || '',
        genres: (media.genres || []).map(g => ({ name: g })),
        studios: [{ name: studioName }],
        trailer: { embed_url: trailerEmbed },
        recommendations: (media.recommendations?.nodes || []).map(r => ({
            mal_id: r.mediaRecommendation?.id,
            id: r.mediaRecommendation?.id,
            title: r.mediaRecommendation?.title?.english || r.mediaRecommendation?.title?.romaji || 'Recommandation',
            image_url: r.mediaRecommendation?.coverImage?.large || r.mediaRecommendation?.coverImage?.medium || '',
            votes: r.rating || 10
        }))
    };
}

/**
 * Fetch catalog of top & trending anime via GraphQL
 */
export async function getAnimeCatalog(page = 1, perPage = 24) {
    const cacheKey = `catalog_p${page}_l${perPage}`;

    const cached = await fetchWithCache(cacheKey, async () => {
        const query = `
            query ($page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(sort: [POPULARITY_DESC, SCORE_DESC], type: ANIME) {
                        id
                        idMal
                        title {
                            english
                            romaji
                            native
                        }
                        coverImage {
                            extraLarge
                            large
                        }
                        bannerImage
                        averageScore
                        episodes
                        status
                        description
                        genres
                        studios(isMain: true) {
                            nodes {
                                name
                            }
                        }
                        trailer {
                            id
                            site
                        }
                    }
                }
            }
        `;

        const res = await queryAniList(query, { page, perPage });
        const mediaList = res?.Page?.media || [];
        return mediaList.map(m => normalizeAniListMedia(m)).filter(Boolean);
    });

    if (cached && cached.length > 0) return cached;
    return STARTER_ANIME_DATA;
}

/**
 * Search anime using GraphQL
 */
export async function searchAnime(queryStr, page = 1, perPage = 20) {
    if (!queryStr || queryStr.trim().length < 2) return [];
    const sanitized = queryStr.trim();
    const cacheKey = `search_${sanitized.toLowerCase()}_p${page}`;

    try {
        const query = `
            query ($search: String, $page: Int, $perPage: Int) {
                Page(page: $page, perPage: $perPage) {
                    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
                        id
                        idMal
                        title {
                            english
                            romaji
                            native
                        }
                        coverImage {
                            extraLarge
                            large
                        }
                        averageScore
                        episodes
                        status
                        description
                        genres
                        studios(isMain: true) {
                            nodes {
                                name
                            }
                        }
                    }
                }
            }
        `;

        const res = await queryAniList(query, { search: sanitized, page, perPage });
        const mediaList = res?.Page?.media || [];
        return mediaList.map(m => normalizeAniListMedia(m)).filter(Boolean);
    } catch (e) {
        console.warn('[AniListAPI] Search error:', e);
        return STARTER_ANIME_DATA.filter(a => a.title.toLowerCase().includes(sanitized.toLowerCase()));
    }
}

/**
 * Fetch full details for an anime by ID
 */
export async function getAnimeDetails(animeId) {
    if (!animeId) return null;
    const cacheKey = `details_${animeId}`;

    const cached = await fetchWithCache(cacheKey, async () => {
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    idMal
                    title {
                        english
                        romaji
                        native
                    }
                    coverImage {
                        extraLarge
                        large
                    }
                    bannerImage
                    averageScore
                    episodes
                    status
                    description
                    genres
                    studios(isMain: true) {
                        nodes {
                            name
                        }
                    }
                    trailer {
                        id
                        site
                    }
                    recommendations(sort: RATING_DESC, perPage: 10) {
                        nodes {
                            rating
                            mediaRecommendation {
                                id
                                title {
                                    english
                                    romaji
                                }
                                coverImage {
                                    large
                                }
                            }
                        }
                    }
                }
            }
        `;

        const res = await queryAniList(query, { id: Number(animeId) });
        return normalizeAniListMedia(res?.Media);
    });

    if (cached) return cached;
    return STARTER_ANIME_DATA.find(a => a.mal_id === Number(animeId) || a.id === Number(animeId)) || null;
}

/**
 * Fetch recommendations for an anime
 */
export async function getAnimeRecommendations(animeId) {
    const details = await getAnimeDetails(animeId);
    if (details && details.recommendations && details.recommendations.length > 0) {
        return details.recommendations;
    }

    return STARTER_ANIME_DATA
        .filter(a => a.id !== Number(animeId))
        .slice(0, 8)
        .map(a => ({
            mal_id: a.id,
            id: a.id,
            title: a.title_english || a.title,
            image_url: a.image_url,
            votes: Math.floor(Math.random() * 50) + 20
        }));
}

/**
 * Fetch Top/Trending anime for the Trending view
 */
export async function getTopAnime(limit = 35) {
    return getAnimeCatalog(1, limit);
}

export const STARTER_ANIME_DATA = [
    {
        id: 1535,
        mal_id: 1535,
        title: "Death Note",
        title_english: "Death Note",
        score: 8.6,
        status: "FINISHED",
        episodes: 37,
        synopsis: "Light Yagami finds a notebook capable of killing anyone whose name is written in it.",
        image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1535-lawlhhhwLi1e.png",
        images: { jpg: { image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1535-lawlhhhwLi1e.png" } },
        genres: [{ name: "Psychological" }, { name: "Supernatural" }],
        studios: [{ name: "Madhouse" }]
    },
    {
        id: 16498,
        mal_id: 16498,
        title: "Attack on Titan",
        title_english: "Attack on Titan",
        score: 8.5,
        status: "FINISHED",
        episodes: 25,
        synopsis: "Humanity fights for survival against giant humanoid Titans.",
        image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx16498-73ZaRwyTJQji.jpg",
        images: { jpg: { image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx16498-73ZaRwyTJQji.jpg" } },
        genres: [{ name: "Action" }, { name: "Dark Fantasy" }],
        studios: [{ name: "WIT Studio" }]
    },
    {
        id: 152657,
        mal_id: 52657,
        title: "Oshi no Ko",
        title_english: "Oshi no Ko",
        score: 8.7,
        status: "FINISHED",
        episodes: 11,
        synopsis: "Reborn as idol twins navigating the showbiz world.",
        image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx150672-wHsf93b7wKnh.jpg",
        images: { jpg: { image_url: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx150672-wHsf93b7wKnh.jpg" } },
        genres: [{ name: "Drama" }, { name: "Supernatural" }],
        studios: [{ name: "Doga Kobo" }]
    }
];
