## Set up

1. Clone this repo

2. Install dependencies

3. Rename `config.example.js` to `config.js` and fill in the fields

4. Install `ffmpeg` and `yt-dlp` (python version)

5. install dependencies: `npm install`

6. Run `npm start` for the first sync to check if everything is working

7. Set up a cron job to run the sync regularly

## Requirements

Youtube playlist should be a public or unlisted playlist.

## Tips

`GPT4` has a better accuracy than `GPT3.5` in extracting the metadata.

But be aware of that if you choose to use the `GPT4` api, expect receiving expensive bills from OpenAI. (average 700-1000 tokens per song depending on the original meta of the video)