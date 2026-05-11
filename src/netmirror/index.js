import { OTT_SERVICES } from './constants.js';
import { getNfMirrorApi, getMediaDetails } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[NetMirror] Starting search for ${mediaType} ${tmdbId}`);
    const finalStreams = [];

    try {
        const media = await getMediaDetails(tmdbId, mediaType);
        const title = mediaType === 'tv' ? media.name : media.title;
        
        if (!title) {
            console.log(`[NetMirror] Could not retrieve media title.`);
            return [];
        }

        const apiBase = await getNfMirrorApi();
        console.log(`[NetMirror] Resolved API base: ${apiBase}`);

        // Attempt extraction concurrently across available services (nf, pv, hs) to be fast
        const promises = OTT_SERVICES.map(service => 
            extractServiceStreams(apiBase, service, title, mediaType, season, episode)
                .catch(e => {
                    console.warn(`[NetMirror] Error from service ${service.name}:`, e.message);
                    return [];
                })
        );

        const results = await Promise.all(promises);
        
        // Flatten result list
        for (const list of results) {
            finalStreams.push(...list);
        }

    } catch (err) {
        console.error('[NetMirror] Fatal overall extraction failure:', err.message);
    }

    console.log(`[NetMirror] Returning total ${finalStreams.length} stream(s).`);
    return finalStreams;
}

async function extractServiceStreams(apiBase, service, rawTitle, mediaType, season, episode) {
    const serviceStreams = [];
    const title = rawTitle.trim();
    
    const headers = {
        "ott": service.code,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
        "x-requested-with": "NetmirrorNewTV v1.0"
    };

    console.log(`[NetMirror] Searching ${service.name} for "${title}"`);

    // 1. Fetch Search Response
    const searchUrl = `${apiBase}/search.php?s=${encodeURIComponent(title)}`;
    const searchResp = await fetch(searchUrl, { headers });
    const searchJson = await searchResp.json();
    
    const searchResults = searchJson.searchResult || [];
    // Perform case-insensitive string match just like Kotlin
    const match = searchResults.find(item => item.t && item.t.trim().toLowerCase() === title.toLowerCase());
    
    if (!match || !match.id) {
        console.log(`[NetMirror] No direct match on ${service.name}`);
        return [];
    }

    const netId = match.id;
    let finalId = netId;

    // 2. Handle TV Shows depth traversal
    if (mediaType === 'tv') {
        console.log(`[NetMirror] TV Match on ${service.name} (ID: ${netId}), drilling down to S${season}E${episode}`);
        
        // Get post details to extract Season IDs
        const postResp = await fetch(`${apiBase}/post.php?id=${netId}`, { headers });
        const postData = await postResp.json();
        
        const seasons = postData.season || [];
        const targetTerm = `Season ${season}`;
        const seasonEntry = seasons.find(s => s.s && s.s.toString().includes(targetTerm));
        
        if (!seasonEntry || !seasonEntry.id) {
            console.log(`[NetMirror] Season ${season} not found on ${service.name}`);
            return [];
        }
        
        const seasonId = seasonEntry.id;
        let episodeId = null;
        let page = 1;
        
        // Max iterate 10 pages matching Kotlin
        while (!episodeId && page < 10) {
            console.log(`[NetMirror] Paging episodes list (Page ${page}) on ${service.name}`);
            const epResp = await fetch(`${apiBase}/episodes.php?id=${seasonId}&page=${page}`, { headers });
            const epData = await epResp.json();
            
            const episodesList = epData.episodes || [];
            const epMatch = episodesList.find(e => e.ep && e.ep.toString() === episode.toString());
            
            if (epMatch && epMatch.id) {
                episodeId = epMatch.id;
            }
            
            // Break if no nextPage flag
            if (parseInt(epData.nextPageShow) !== 1) {
                break;
            }
            page++;
        }
        
        if (!episodeId) {
            console.log(`[NetMirror] Episode ${episode} not found on ${service.name}`);
            return [];
        }
        
        finalId = episodeId;
    }

    // 3. Fetch final player video link
    console.log(`[NetMirror] Fetching final stream payload for ID ${finalId} on ${service.name}`);
    const playerResp = await fetch(`${apiBase}/player.php?id=${finalId}`, { headers });
    const playerData = await playerResp.json();
    
    if (playerData && playerData.video_link) {
        serviceStreams.push({
            name: service.name,
            title: "Auto",
            url: playerData.video_link,
            quality: "Auto",
            headers: {
                "Referer": playerData.referer || "",
                "User-Agent": headers["user-agent"]
            },
            provider: "netmirror"
        });
        console.log(`[NetMirror] SUCCESS: Captured link for ${service.name}`);
    }

    return serviceStreams;
}

module.exports = { getStreams };
