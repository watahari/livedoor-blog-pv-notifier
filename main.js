const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');


const LOGIN_URL = 'https://member.livedoor.com/login/';
const LOGIN_USER = '<your livedoor id>';
const LOGIN_PASS = '<your livedoor password>';
const BLOG_ID = '<blog owner livedoor id>';
const TARGET_URL = 'https://livedoor.blogcms.jp/blog/'+BLOG_ID+'/report/';
const LOGIN_USER_SELECTOR = 'input[name=livedoor_id]';
const LOGIN_PASS_SELECTOR = 'input[name=password]';
const LOGIN_SUBMIT_SELECTOR = 'input[id=submit]';
const CSV_DL_BUTTON = 'a[id=reportCSVDownload]';
const DISCORD_URL = '<your discord webhook url https://discord.com/api/webhooks/****>';
const DISCORD_BOT_NAME = 'PV教えるくん';

(async () => {
  async function sleep(msec) {
      setTimeout(() => { }, msec);
  }

  async function postDiscord(message) {
      const config = {
          headers: {
              'Accept': 'application/json',
              'Content-type': 'application/json',
          }
      }
      const postData = {
          username: DISCORD_BOT_NAME,
          content: message
      }
      const res = await axios.post(DISCORD_URL, postData, config);
      console.log(res);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--disable-dev-shm-usage'
    ]
  })

  try {
    const page = await browser.newPage()
    // await page.setViewport({ width: 1440, height: 900 });

    // login page
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.type(LOGIN_USER_SELECTOR, LOGIN_USER); // ユーザー名入力
    await page.type(LOGIN_PASS_SELECTOR, LOGIN_PASS); // パスワード入力
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click(LOGIN_SUBMIT_SELECTOR),
    ]);

    // analytics page
    await page.goto(TARGET_URL);
    // await page.screenshot({ path: 'example.png', fullPage: true })

    // anallytics csv download
    client = await page.target().createCDPSession();
    client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: './',
    });
    await page.click(CSV_DL_BUTTON);
    await sleep(2000);
  } catch (e) {
    console.error(e)
  } finally {
    browser.close()
  }

  // calc date
  const offset = (new Date()).getTimezoneOffset() * 60000;
  const iso = (new Date(Date.now() - offset)).toISOString();
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
  const targetFileDate = `${m[1]}${m[2]}`;
  const targetDataDate = `${m[2]}/${m[3]}`;
  const now = `${m[2]}/${m[3]} ${m[4]}:${m[4]}`;

  // today PV
  const filePath = BLOG_ID+'_'+targetFileDate+'.csv';
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.toString().split('\r\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(targetDataDate)) {
      const data = lines[i].split(",");
      const message = `${now}時点のPVをお伝えします。
PV: ${data[3]}
├ PC: ${data[1]}
└ mobile: ${data[2]}
UU: ${data[6]}
├ PC: ${data[4]}
└ mobile: ${data[5]}`;
      postDiscord(message);
      break;
    }
  }

})()
