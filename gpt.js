import config from './config.js';


const systemPrompt = `
You are a tool that extracts information about songs on YouTube from the given text of user.

You should follow these rules:

1. User will provide you the metadata of a YouTube video, which is a song. The metadata includes the title, channel name, and video description.
2. Your task is to extract the song name, artist list, and cover singer list from the metadata.
3. You need to return the extracted information in the JSON format. The JSON format is as follows:
\`\`\`json
{
	"name": "song name",
	"artists": ["artist1", "artist2", "artist3"],
	"coverSingers": ["cover singer1", "cover singer2", "cover singer3"]
}
\`\`\`
4. If the song is a covered version, the cover singers should be extracted. Otherwise, the cover singers should be an empty list. Fpr example, if the video title is "MIMI - ゆめまぼろし - cover - 綰子/wanko", the cover singer should be "綰子".
5. The channel that uploaded the video is not always the original artist, it can be a cover singer, a music recommend account or just a random user. So, you need to extract the original artist from all the title, channel name and description if necessary. For example, if there is a "MIMI様のゆめまぼろしを歌わせていただきました。" or "本家: MIMI - ゆめまぼろし" in the description, you should extract "MIMI" as the original artist.
6. You need to extract the exact name of the song, because sometimes the video title contains more information than the song name. For example, the title can be "A wonderful song: Taylor Swift - Blank Space [Eng/Chn Lyrics]". In this case, the song name should be "Blank Space".
7. If the original song name or artist name is in Chinese/Japanese/Korean, and there are both Chinese/Japanese/Korean and the corresponding English/Romanized versions in the given metadata, you should only extract the Chinese/Japanese/Korean version. For example, the video title is "感情を沢山込めて「花時計/yoin」歌ってみた【 こはならむ 】" and the channel name is "こはならむ- Kohana Lam". In this case, the song name should be "花時計" and the artist name should be "こはならむ".
8. Remix, Remaster, Rearrange, Instrumental, etc. should be a part of the song name. For example, if the video title is "Cloudier - A Centimetre Apart (Sylrica Remix)", the song name should be "A Centimetre Apart (Sylrica Remix)".
9. If the song is a remix or rearrange or bootleg, the remix artist should be included in the artist list, too.
10. If the composer, mixer, lyricist, etc. that works in the background is mentioned in the description, but not in the title or channel name, you should not extract them.
`.trim();


// from https://github.com/ztjhz/chatgpt-free-app
const url = 'https://api.openai.com/v1/chat/completions';


export const getChatCompletion = async (messages, apiKey = config.chatGPTAPIKey, modelConfig = {presence_penalty: 0, temperature: 1}, customHeaders = {}) => {
	const headers = {
		'Content-Type': 'application/json',
		...customHeaders,
	};
	if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

	const response = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model: config.chatGPTModel,
			messages,
			...modelConfig,
			max_tokens: undefined,
		}),
	});
	if (!response.ok) throw new Error(await response.text());

	const data = await response.json();
	return data.choices[0].message.content;
};

const promptTemplate = (title, owner, description) => {
	return `
Title: ${title}
Channel Name: ${owner}
Description:
${description}
`.trim();
}

export const extractSongMetaGPT = async (title, owner, description) => {
	let attempts = 3;
	while (attempts--) {
		try {
			const result = await getChatCompletion([
				{ content: systemPrompt, role: "system"},
				{ content: promptTemplate(title, owner, description), role: "user"}
			]);
			const json = JSON.parse(result.replace(/\`\`\`/g, '').replace(/^json/, ''));
			return json;
		} catch (e) {
			console.log('Error extracting metadata using GPT', e);
			console.log('Retrying...');
		}
	}
	console.log('Failed to extract metadata using GPT');
	process.exit(1);
}