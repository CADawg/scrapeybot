const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');// replace with your proxy's hostname and port
const proxyOptions = `socks://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;

async function get(url) {
    const httpsAgent = new SocksProxyAgent(proxyOptions);
    const client = axios.create({httpsAgent, httpAgent: httpsAgent});
    console.log(client);
    return await client.get(url);
}

module.exports = {get};