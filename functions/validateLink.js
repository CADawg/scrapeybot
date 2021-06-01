const domainTest = /^https?:\/\/.*$/;

function validateLink(url) {
    let valid = true;
    if (!url.match(domainTest)) valid = false;
    if (url.includes("undefined")) valid = false;
    if (url.endsWith(".jpg")) valid = false;
    if (url.endsWith(".png")) valid = false;
    if (url.endsWith(".gif")) valid = false;
    if (url.endsWith(".webp")) valid = false;

    return valid;
}

function removeAfterToken(str, token=".") {
    const index1 = str.indexOf(token);
    if (index1 < 0) return str;
    return str.substring(0, index1) || "";
}

function tidyLink(url) {
    return removeAfterToken(url, '#');
}

module.exports = {validateLink, tidyLink};