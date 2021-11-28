# livedoor-blog-pv-notifier

This app scrape livedoor blog admin page, and post PV to Discord.

```
PV教えるくん ボット — 今日 10:00
11/28 10:00時点のPVをお伝えします。
PV: 50
├ PC: 20
└ mobile: 30
UU: 45
├ PC: 18
└ mobile: 27
```

This is Firebase function.

## Local run

### Prepare to run

You need to have installed the Firebase CLI. If you haven't run:
``
npm install -g firebase-tools
```

Create a Firebase Project on the Firebase Console.

Set up your Firebase project by running `firebase use --add`.

Install dependency packages.
```
cd functions
npm i
```

### Run

Emulate Firebase localy,
```
cd functions
npm run serve
```

Open `http://localhost:4000/functions` in web browser, then you see message like `http function initialized (http://localhost:5001/XXXXXXX/asia-northeast1/scraping).`.

Now, you open `http://localhost:5001/XXXXXXX/asia-northeast1/scraping` in web browser, or `curl` url.

After few seconds, Discord message has come from bot.

## Deploy

```
firebase functions:config:set ldb.user="<your livedoor id>"
firebase functions:config:set ldb.pwd="<your livedoor password>"
firebase functions:config:set ldb.blog_id="<blog owner livedoor id>"
firebase functions:config:set discord.webhook="<your discord webhook url https://discord.com/api/webhooks/****>"
firebase deploy --only functions
```
