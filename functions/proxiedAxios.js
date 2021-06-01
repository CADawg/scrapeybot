const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');
const proxyOptions = process.env.PROXY;

async function get(url) {
    const httpsAgent = new SocksProxyAgent(proxyOptions);
    let client;
    if (process.env.USE_PROXY.toLowerCase() === "true") {
        client = axios.create({httpsAgent, httpAgent: httpsAgent});
    } else {
        client = axios.create({});
    }

    return await client.get(url);
}

module.exports = {get};