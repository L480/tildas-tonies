export default {
    async fetch(request, env, ctx) {
        const tokenEndpoint = 'https://login.tonies.com/auth/realms/tonies/protocol/openid-connect/token';
        const graphqlEndpoint = 'https://api.prod.tcs.toys/v2/graphql';
        const tokenBody = 'grant_type=refresh_token&refresh_token=' + await env.kv.get('REFRESH_TOKEN') + '&client_id=my-tonies';
        const graphqlBody = '{"query":"query ContentTonies($canBuyTunes: Boolean\u0021) {\\n  households {\\n    id\\n    name\\n    access\\n    contentTonies {\\n      id\\n      title\\n      lock\\n      series {\\n        id\\n        name\\n        __typename\\n      }\\n      imageUrl\\n      tune {\\n        id\\n        item {\\n          title\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  tunesItems(first: 10, compatibleTonies: \\"require\\", myTuneStatus: \\"purchasable\\") @include(if: $canBuyTunes) {\\n    edges {\\n      node {\\n        id\\n        title\\n        thumbnail\\n        description\\n        series {\\n          name\\n          __typename\\n        }\\n        price {\\n          status\\n          currency\\n          centAmount\\n          strikeCentAmount\\n          __typename\\n        }\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n","operationName":"ContentTonies","variables":{"canBuyTunes":true}}';
        const cacheTtl = 3600;
        const cf = {
            cacheTtl: cacheTtl,
            cacheEverything: true,
        };
  
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
  
        const tokenRequest = await fetch(tokenEndpoint, {
            body: tokenBody,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            cf: cf
        });
        const tokenResponse = await gatherResponse(tokenRequest);
        await env.kv.put('REFRESH_TOKEN', tokenResponse.refresh_token);
  
        const graphqlRequest = await fetch(graphqlEndpoint, {
            body: graphqlBody,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + tokenResponse.access_token,
                'Content-Type': 'application/json'
            },
            cf: cf
        });
        const graphqlResponse = await gatherResponse(graphqlRequest);
  
        const tonies = graphqlResponse.data.households[0].contentTonies;
        let allTonies = [];
        for (let x in tonies) {
            allTonies.push({ image: tonies[x].imageUrl, name: tonies[x].series.name + ' - ' + tonies[x].title });
        }
  
        const response = new Response(JSON.stringify(allTonies));
        response.headers.set('Cache-Control', 'max-age=' + cacheTtl);
        response.headers.set('Access-Control-Allow-Origin', 'https://tildas-tonies.de');
        return response;
    },
  };