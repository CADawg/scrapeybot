const {get} = require("./proxiedAxios");
const parse = require('robots-txt-parse');
const guard = require('robots-txt-guard');
const path = require("path");
const fs = require("fs");

function getPath(url) {
    const arr = url.split("/");
    try {
        arr.splice(0, 3);

        return "/" + arr.join("/");
    } catch (ignored) {
        return false;
    }
}

async function robotsCanViewPage(url, userAgent = "scrapeBot") {
    const tld = extractHostname(url, false)
    const dir = path.join(__dirname, "..", "robots");
    const location = path.join(dir, tld + ".robots");
    if(!fs.existsSync(location)) {
        try {
            const arr = url.split("/");
            const urlBase = arr[0] + "//" + arr[2] + "/";

            const data = await get(urlBase + "robots.txt");

            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            fs.writeFileSync(location, data.data);
        } catch (ignored) {
            return true;
        }
    }

    if(fs.existsSync(location)) {
        const input = fs.createReadStream(location);
        const result = await parse(input);

        const guardForResult = guard(result);

        let path = getPath(url);

        return guardForResult.isIndexable(userAgent, path) && guardForResult.isAllowed(userAgent, path);
    }

    return true;
}

function extractHostname(url,tld) {
    let hostname;

    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];

    //find & remove "?"
    hostname = hostname.split('?')[0];

    if(tld){
        let hostnames = hostname.split('.');
        hostname = hostnames[hostnames.length-2] + '.' + hostnames[hostnames.length-1];
    }

    return hostname.replace(/\./g, "_");
}

module.exports = {robotsCanViewPage, extractHostname, getPath};