## Set up

1. Clone this repo

2. Install dependencies

3. Rename `config.example.js` to `config.js` and fill the fields

4. Install `ffmpeg` and the python version `yt-dlp`

4. Run `npm main` for the first sync to check if everything is working

5. Set up a cron job to run the sync regularly

## Requirements

Playlist should be a public or unlisted playlist.

## Tips

`GPT4` has a better performance than `GPT3.5` in extracting the metadata.

But be aware of that if you choose to use the `GPT4` api, expect receiving expensive bills from OpenAI. (average 1000-1500 tokens per song depending on the original meta of the video)