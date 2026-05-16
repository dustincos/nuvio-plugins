import { VIDFAST_API, DECRYPT_API, HEADERS } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[VidFast] Fetching streams for ${mediaType} ${tmdbId}`);

    try {
        const isMovie = (mediaType !== 'tv' && season == null);
        const pageUrl = isMovie
            ? `${VIDFAST_API}/movie/${tmdbId}/`
            : `${VIDFAST_API}/tv/${tmdbId}/${season}/${episode}/`;

        console.log(`[VidFast] Loading page: ${pageUrl}`);

        const pageResp = await fetch(pageUrl, { headers: HEADERS });
        const pageHtml = await pageResp.text();

        const encodedMatch = pageHtml.match(/\\"en\\":\\"(.*?)\\"/);
        if (!encodedMatch || !encodedMatch[1]) {
            console.log(`[VidFast] No encoded token found in page`);
            return [];
        }
        const encodedText = encodedMatch[1];

        const decApiUrl = `${DECRYPT_API}/enc-vidfast?text=${encodedText}&version=1`;
        const decConfigResp = await fetch(decApiUrl);
        const decConfigJson = await decConfigResp.json();
        const decConfig = decConfigJson.result;

        if (!decConfig || !decConfig.servers || !decConfig.stream || !decConfig.token) {
            console.log(`[VidFast] Incomplete decryption config`);
            return [];
        }

        const serversUrl = decConfig.servers;
        const streamBaseUrl = decConfig.stream;
        const csrfToken = decConfig.token;

        const authedHeaders = {
            ...HEADERS,
            "X-CSRF-Token": csrfToken
        };

        const serversEncResp = await fetch(serversUrl, {
            method: 'POST',
            headers: authedHeaders
        });
        const serversEncrypted = await serversEncResp.text();

        const serversDecResp = await fetch(`${DECRYPT_API}/dec-vidfast`, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"] },
            body: JSON.stringify({ text: serversEncrypted, version: "1" })
        });
        const serversDecJson = await serversDecResp.json();
        const serversList = serversDecJson.result;

        if (!Array.isArray(serversList) || serversList.length === 0) {
            console.log(`[VidFast] No servers in decrypted response`);
            return [];
        }

        console.log(`[VidFast] Found ${serversList.length} server(s)`);

        const streamPromises = serversList.map(server =>
            fetchServerStream(server, streamBaseUrl, authedHeaders)
                .catch(() => [])
        );

        const results = await Promise.all(streamPromises);

        const streams = [];
        for (const result of results) {
            if (result.length > 0) {
                streams.push(...result);
            }
        }

        console.log(`[VidFast] Returning ${streams.length} streams`);
        return streams;

    } catch (error) {
        console.error(`[VidFast] Error: ${error.message}`);
        return [];
    }
}

async function fetchServerStream(server, streamBaseUrl, authedHeaders) {
    try {
        const serverHash = server.data;
        if (!serverHash) return [];

        const serverName = server.name || "Default";
        const serverDesc = server.description || "";

        const finalStreamUrl = `${streamBaseUrl}/${serverHash}`;
        const streamEncResp = await fetch(finalStreamUrl, {
            method: 'POST',
            headers: authedHeaders
        });
        const streamEncrypted = await streamEncResp.text();

        if (!streamEncrypted || streamEncrypted.trim() === '') return [];

        const streamDecResp = await fetch(`${DECRYPT_API}/dec-vidfast`, {
            method: 'POST',
            headers: { "Content-Type": "application/json", "User-Agent": HEADERS["User-Agent"] },
            body: JSON.stringify({ text: streamEncrypted, version: "1" })
        });
        const streamDecJson = await streamDecResp.json();
        const streamData = streamDecJson.result;

        if (!streamData || !streamData.url) return [];

        const fileUrl = streamData.url;

        const is4k = streamData["4kAvailable"] === true ||
                     (serverDesc && serverDesc.toLowerCase().includes("4k"));
        const quality = is4k ? "4K" : "1080p";

        const streams = [{
            name: `Vidfast [${serverName}]`,
            title: `${serverDesc || quality}`,
            url: fileUrl,
            quality: quality,
            headers: authedHeaders,
            provider: "vidfast"
        }];

        console.log(`[VidFast] ${serverName}: found stream (${quality})`);
        return streams;

    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
