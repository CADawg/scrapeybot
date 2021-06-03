const heavySites = [
    /^https?:\/\/(www\.)?twitter\.com.*$/,
    /^https?:\/\/(www\.)?peakd\.com.*$/
]

module.exports = function siteLoadsHeavyJavascript(url) {
    for (let site in heavySites) {
        if (heavySites.hasOwnProperty(site)) {
            if (url.match(heavySites[site])) return true;
        }
    }

    return false;
}