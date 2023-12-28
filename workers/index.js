export default {
    async fetch(request, env, ctx) {
        const tokenEndpoint = 'https://login.tonies.com/auth/realms/tonies/protocol/openid-connect/token';
        const graphqlEndpoint = 'https://api.prod.tcs.toys/v2/graphql';
        const tokenBody = 'grant_type=refresh_token&refresh_token=' + await env.kv.get('REFRESH_TOKEN') + '&client_id=my-tonies';
        const graphqlBody = '{ "query": "query Tonies { households { contentTonies { title series { name } imageUrl } creativeTonies { name imageUrl }}}", "operationName": "Tonies" }';
        const useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const cacheTtl = 3600;
        const cf = {
            cacheTtl: cacheTtl,
            cacheEverything: true,
        };
        let allTonies = [];

        /**
         * gatherResponse awaits and returns a response body as a string.
         * Use await gatherResponse(..) in an async function to get the response body
         * @param {Response} response
         */
        async function gatherResponse(response) {
            const { headers } = response;
            const contentType = headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                return await response.json();
            }
            return response.text();
        }

        // Get access token and save new refresh token to KV
        const tokenRequest = await fetch(tokenEndpoint, {
            body: tokenBody,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': useragent
            },
            cf: cf
        });
        const tokenResponse = await gatherResponse(tokenRequest);
        await env.kv.put('REFRESH_TOKEN', tokenResponse.refresh_token);

        // Get tonies
        const graphqlRequest = await fetch(graphqlEndpoint, {
            body: graphqlBody,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + tokenResponse.access_token,
                'Content-Type': 'application/json',
                'User-Agent': useragent
            },
            cf: cf
        });
        const graphqlResponse = await gatherResponse(graphqlRequest);

        // Parse content tonies
        const contentTonies = graphqlResponse.data.households[0].contentTonies;
        for (let x in contentTonies) {
            allTonies.push({ image: contentTonies[x].imageUrl, name: contentTonies[x].series.name + ' - ' + contentTonies[x].title });
        }

        // Parse creative tonies
        const creativeTonies = graphqlResponse.data.households[0].creativeTonies;
        for (let x in creativeTonies) {
            allTonies.push({ image: creativeTonies[x].imageUrl, name: creativeTonies[x].name });
        }

        // JSON response with cache and CORS
        const response = new Response(JSON.stringify(allTonies));
        response.headers.set('Cache-Control', 'max-age=' + cacheTtl);
        response.headers.set('Access-Control-Allow-Origin', 'https://tildas-tonies.de');
        return response;
    },
};