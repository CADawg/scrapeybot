// Check if it's a url with lacking robots.txt so we can ignore it because it leads to lots of wasted space and resources
// Also Infinitely redirecting links

const badUrls = [
    /^https?:\/\/elixir\.bootlin\.com.*$/
];

module.exports = function canSaveUrl(url) {
    for (let url in badUrls) {
        if (badUrls.hasOwnProperty(url)) {
            if (url.match(badUrls[url])) return false;
        }
    }

    return true;
}