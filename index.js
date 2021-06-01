require("dotenv").config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const StormDB = require("stormdb");
const path = require("path");
const {validateLink, tidyLink} = require("./functions/validateLink");
const {robotsCanViewPage, extractHostname, getPath} = require("./functions/robotsText");
const mysql = require("mysql2");
const sleep = require("./functions/sleep");

const engine = new StormDB.localFileEngine(path.join(__dirname,"storm.db"));
const db = new StormDB(engine);

const dbPoolSync = mysql.createPool({
  connectionLimit: 100,
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4"
});

const dbPool = dbPoolSync.promise();

let url = null;

dbPoolSync.query("SELECT `id`,`link`,(SELECT url FROM indexed WHERE indexed.id = parent) as parent_link,`failed`,`unindexable` FROM unindexed WHERE unindexable = 0 AND failed = 0 ORDER BY RAND() LIMIT 1;", function (err, result) {
  if (err || result.length === 0) throw new Error("No Sites To Index or Database Error!");
  url = result[0];
});

(async function() {
let puppet = null;

while (url !== null) {
  if (!await robotsCanViewPage(url, process.env.USER_AGENT)) {
    try {
      await dbPool.query("UPDATE `unindexed` SET `unindexable`=1 WHERE `id`=?", [url.id]);
      console.log("Link:", url, "avoided due to robots.txt");
    } catch (ignored) {}
    continue;
  }

  if (db.get("visited").get(extractHostname(url, true)).value() === undefined) {
    db.get("visited").set(extractHostname(url, true), []);
  }

  if (db.get("visited").get(extractHostname(url, true)).value().length < 10 && !db.get("visitedURL").value().includes(url)) {
    console.log("Loading:" , url);

    if (puppet === null) {
      puppet = puppeteer
      .launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=socks://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`] })
      .then(function(browser) {return browser.newPage();})
    }

    await puppet
    .then(async function(page) {
      return await page.goto(url, {timeout: 20000}).then(async function() {
        console.log("Loaded:" , url);
        if (url.includes("twitter.com")) {
          await sleep(5000);
        }
        return page.content();
      });
    })
    .then(function(html) {
      let $ = cheerio.load(html);
      //console.log(html);

        let title = "", description = "", links = [];
        try {
          title = $("head>title").text();
          description = $('meta[name=description]').attr('content');
          $('a').each(function() {
            let href = $(this).attr('href');
            href = tidyLink(href);
            if(!urlsToVisit.includes(href)) {
              try {
              href = new URL(href, url).toString();

              try {
                let rel = $(this).attr('rel');
                if (rel.includes("noindex")) {
                  return;
                }
              } catch (ignored) {}

              if (validateLink(href)) {
                urlsToVisit.push(href);
                links.push(href);
              }
              } catch (ignored) {}
            }
          });
        } catch (ignored) {
          console.log(ignored);
        }

        db.get("visited").get(extractHostname(url, true)).push({
          title, url, description, links
        });
        db.get("visitedURL").push(url);
        db.set("unvisited", urlsToVisit);
        db.save();

        console.log({
          title, url, description, links
        });
    })
    .catch(function(err) {
      console.log(err);
      db.get("errored").push(url);
      db.save();
    });

  }
}
})();