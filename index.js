require("dotenv").config();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const {validateLink, tidyLink} = require("./functions/validateLink");
const {robotsCanViewPage, extractHostname} = require("./functions/robotsText");
const mysql = require("mysql2");
const sleep = require("./functions/sleep");
const chalk = require("chalk");
const siteLoadsHeavyJavascript = require("./functions/siteLoadsHeavyJavascript");
const canSaveUrl = require("./functions/badDomains");

const queryGet = "SELECT g.* FROM unindexed g JOIN(SELECT id FROM unindexed WHERE unindexable = 0 AND failed = 0 AND alreadyindexed = 0 AND priority = (SELECT MAX(priority) FROM unindexed) and RAND() < (SELECT ((1 / COUNT(*)) * 10) FROM unindexed where unindexable = 0 AND failed = 0 AND alreadyindexed = 0 AND priority = (SELECT MAX(priority) FROM unindexed)) ORDER BY RAND() LIMIT 1) AS z ON z.id= g.id where unindexable = 0 AND failed = 0 AND alreadyindexed = 0 AND priority = (SELECT MAX(priority) FROM unindexed);";

// So we can rethrow true errors.
class DataBaseError extends Error {}

const dbPoolSync = mysql.createPool({
  connectionLimit: 100,
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4"
});

const dbPool = dbPoolSync.promise();

let nextUrl = null;

(async function() {
  [[nextUrl]] = await dbPool.query(queryGet);

  let args = [];
  if (process.env.USE_PROXY.toLowerCase() === "true") args.push(`--proxy-server=${process.env.PROXY}`);
  if (process.env.CAN_SANDBOX.toLowerCase() === "false") args.push("--no-sandbox");

  const puppet = puppeteer
      .launch({ headless: true, args })
      .then(async function(browser) {return browser.newPage();});


  while (nextUrl !== null && nextUrl !== undefined) {
    if (!await robotsCanViewPage(nextUrl.link, process.env.USER_AGENT)) {
      try {
        await dbPool.query("UPDATE `unindexed` SET `unindexable`=1 WHERE `id`=?", [nextUrl.id]);
        console.log(chalk.yellow("Link:"), chalk.blue(nextUrl.link), chalk.yellow("avoided due to robots.txt"));
        [[nextUrl]] = await dbPool.query(queryGet);
        continue;
      } catch (ignored) {
        throw new DataBaseError("Database Unavailable.");
      }
    }

    console.log(chalk.yellow("Loading:") , chalk.blue(nextUrl.link));

    await puppet
    .then(async function(page) {
      try {
        return await page.goto(nextUrl.link, {timeout: parseInt(process.env.PAGE_TIMEOUT)}).then(async function () {
          console.log(chalk.yellow("Loaded:"), chalk.blue(nextUrl.link));
          if (siteLoadsHeavyJavascript(nextUrl.link)) {
            console.log(chalk.bgBlue.white("Site Loads Heavy Javascript, Waiting 5 Seconds!"));
            await sleep(5000);
          }
          return page.content();
        });
      } catch (error) {
        if (error.message.match(/Navigation timeout of [0-9]+ ms exceeded/) || error.message.match(/net::ERR/)) {
          try {
            await dbPool.query("UPDATE `unindexed` SET `failed`=1 WHERE `id`=?", [nextUrl.id]);
            console.log(chalk.red("Link:"), chalk.blue(nextUrl.link), chalk.red("failed to load. Ignoring."));
          } catch (ignored) {
            throw new DataBaseError("Database Unavailable.");
          }
        } else {
          throw error;
        }
        return false;
      }
    })
    .then(async function(html) {
      if (html !== false) {
        let $ = cheerio.load(html);

        let title = "", description = "", links = [];
        try {
          title = ($("head>title").text() || "").trim();
          description = ($('meta[name=description]').attr('content') || "").trim();
          $('a').each(function () {
            let href = $(this).attr('href');
            try {
              href = new URL(href, nextUrl.link).toString();
              href = tidyLink(href);

              try {
                let rel = $(this).attr('rel');
                if (rel.includes("noindex")  || canSaveUrl(href) === false) {
                  return;
                }
              } catch (ignored) {
              }

              if (validateLink(href)) {
                links.push(href);
              }
            } catch (ignored) {
            }
          });
        } catch (ignored) {
        }

        try {
          await dbPool.query("INSERT IGNORE `indexed` SET ?", {title, url: nextUrl.link, description});
          await dbPool.query("UPDATE `unindexed` SET `alreadyindexed`=1 WHERE `id`=?", [nextUrl.id]);

          for (let link in links) {
            if (links.hasOwnProperty(link)) {
              await dbPool.query("INSERT IGNORE `unindexed` SET ?", {link: links[link], parent: nextUrl.id});
              console.log(chalk.red("Found Link:"), chalk.blue(links[link]));
            }
          }
        } catch (ignored) {
          throw new DataBaseError("Database Unavailable.");
        }

        console.log(chalk.yellow(title), chalk.blue("\r\n", nextUrl.link), chalk.yellow("\r\n", description), chalk.green(links.length) + chalk.yellow(" links"));
      }
    })
    .catch(async function(error) {throw error});
    [[nextUrl]] = await dbPool.query(queryGet);
  }
  process.exit(0);
})();
