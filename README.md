## Set up

1. Clone this repo

2. Install dependencies

3. Rename `config.example.js` to `config.js` and fill in the fields

4. Install `ffmpeg` and `yt-dlp` (python version)

5. Use Node 22 (LTS) — newer versions break `googleapis`'s dependencies. Recommended: `mise use node@22`

6. install dependencies: `npm install`

7. Run `npm start` for the first sync to check if everything is working

8. Set up a cron job to run the sync regularly (if using mise, point it at the mise-installed `node.exe` directly, since scheduled tasks don't run in your shell)

## Requirements

Youtube playlist should be a public or unlisted playlist.
