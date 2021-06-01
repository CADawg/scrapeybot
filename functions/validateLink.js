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
    return str.substring(0, index1) || str;
}

function tidyLink(url) {
    if (url.includes("#")) throw new Error("URL Includes #");
    return removeAfterToken(url, '#');
}

module.exports = {validateLink, tidyLink};