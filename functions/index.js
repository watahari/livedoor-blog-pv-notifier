const functions = require("firebase-functions");
const puppeteer = require("puppeteer");
const fs = require("fs");
const axios = require("axios");

const timezone = "Asia/Tokyo";
process.env.TZ = timezone;

const LOGIN_USER = functions.config().ldb.user;
const LOGIN_PASS = functions.config().ldb.pwd;
const BLOG_ID = functions.config().ldb.blog_id;
const DISCORD_URL = functions.config().discord.webhook;

const LOGIN_URL = "https://member.livedoor.com/login/";
const TARGET_URL = "https://livedoor.blogcms.jp/blog/"+BLOG_ID+"/report/";
const LOGIN_USER_SELECTOR = "input[name=livedoor_id]";
const LOGIN_PASS_SELECTOR = "input[name=password]";
const LOGIN_SUBMIT_SELECTOR = "input[id=submit]";
const CSV_DL_BUTTON = "a[id=reportCSVDownload]";
const DISCORD_BOT_NAME = "PV教えるくん";

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: "1GB",
};

/**
 * @param {int} msec - wait time
 */
async function sleep(msec) {
  setTimeout(() => { }, msec);
}

/**
 * @param {string} message - post message text
 */
async function postDiscord(message) {
  const config = {
    headers: {
      "Accept": "application/json",
      "Content-type": "application/json",
    },
  };
  const postData = {
    username: DISCORD_BOT_NAME,
    content: message,
  };
  const res = await axios.post(DISCORD_URL, postData, config);
  console.log(res);
}

/**
 * @return {array} - current time array
 */
async function getDate() {
  const offset = (new Date()).getTimezoneOffset() * 60000;
  const iso = (new Date(Date.now() - offset)).toISOString();
  return iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
}

/**
 * @param {string} fp - CSV filepath
 * @param {string} targetDataDate - today date string
 * @param {string} now - current time string
 * @return {string} - message
 */
async function getMessageFromCSV(fp, targetDataDate, now) {
  const text = fs.readFileSync(fp, "utf8");
  const lines = text.toString().split("\r\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(targetDataDate)) {
      const data = lines[i].split(",");
      return `${now}時点のPVをお伝えします。
PV: ${data[3]}
├ PC: ${data[1]}
└ mobile: ${data[2]}
UU: ${data[6]}
├ PC: ${data[4]}
└ mobile: ${data[5]}`;
    }
  }
}

/**
 * main function
 */
async function scrapePVAndPostDiscord() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-dev-shm-usage",
    ],
  });
  // if you use windows, change here when local run, maybe... (i'm mac)
  const downloadPath = "/tmp";

  try {
    const page = await browser.newPage();

    // login page
    await page.goto(LOGIN_URL, {waitUntil: "domcontentloaded"} );
    await page.type(LOGIN_USER_SELECTOR, LOGIN_USER);
    await page.type(LOGIN_PASS_SELECTOR, LOGIN_PASS);
    await Promise.all([
      page.waitForNavigation( {waitUntil: "networkidle0"} ),
      page.click(LOGIN_SUBMIT_SELECTOR),
    ]);

    // analytics page
    await page.goto(TARGET_URL);

    // anallytics csv download
    const client = await page.target().createCDPSession();
    client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });
    await page.click(CSV_DL_BUTTON);
    await sleep(2000);
  } catch (e) {
    console.error(e);
  } finally {
    browser.close();
  }

  // calc date
  const m = await getDate();
  const targetDataDate = `${m[2]}/${m[3]}`;
  const now = `${m[2]}/${m[3]} ${m[4]}:${m[5]}`;
  const filePath = downloadPath+"/"+BLOG_ID+"_"+`${m[1]}${m[2]}`+".csv";
  const message = await getMessageFromCSV(filePath, targetDataDate, now);
  fs.unlinkSync(filePath);
  await postDiscord(message);
}

exports.scraping = functions.region("asia-northeast1")
    .runWith(runtimeOpts)
    .https.onRequest(async (req, res) => {
      await scrapePVAndPostDiscord();
      return res.status(200).json({status: "finished"});
    });

exports.scheduledScraping = functions.region("asia-northeast1")
    .runWith(runtimeOpts)
    .pubsub.schedule("0 13 * * *")
    .timeZone("Asia/Tokyo")
    .onRun( async (context) => {
      await scrapePVAndPostDiscord();
      console.log("finished");
    });
