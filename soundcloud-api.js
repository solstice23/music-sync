let credentials = null;


export const getSCCredentials = async () => {
	if (credentials) {
		return credentials;
	}
	const html = await fetch('https://soundcloud.com/').then(res => res.text());
	const js = html.match(/\<script crossorigin src="(https:\/\/a-v2\.sndcdn\.com\/assets\/0-(.+?))">\<\/script\>/)[1];
	const appVersion = html.match(/window\.__sc_version="(.+?)"/)[1];
	console.log("Soundcloud app version: " + appVersion);
	console.log("Soundcloud js url: " + js);
	const jsContent = await fetch(js).then(res => res.text());
	const clientId = jsContent.match(/client_id:"(.+?)"/)[1];
	console.log("Soundcloud client id: " + clientId);
	credentials = { clientId, appVersion };
	return credentials;
};


const getUserLikes = async (userId, limit = 10000) => {
	const { clientId, appVersion } = await getSCCredentials();
	const url = `https://api-v2.soundcloud.com/users/${userId}/likes?client_id=${clientId}&limit=${limit}&offset=0&linked_partitioning=1&app_version=${appVersion}&app_locale=en`;
	console.log(url);
	const res = await fetch(url);
	const json = await res.json();
	const tracks = json.collection.filter(item => item.track).map(item => {item.track.added_at = item.created_at; return item.track});
	return tracks;
};

const getPlaylist = async (listid) => {
	// const url = 
}

const getM3U8Stream = async (link, key) => {
	const { clientId, appVersion } = await getSCCredentials();
	const url = `${link}?client_id=${clientId}&track_authorization=${key}`;
	console.log("Stream Source URL: " + url);
	const res = await fetch(url);
	const json = await res.json();
	

	const m3u8Url = json.url;
	console.log("Getting m3u8 from: " + m3u8Url);
	const m3u8res = await fetch(m3u8Url);
	const m3u8 = (await m3u8res.text()).split("\n").filter(line => line.startsWith("https://"));
	return m3u8;
}
// console.log(await getUserLikes(899160472));

const downloadTrack = (m3u8, file = "tmp.mp3") {
	const fileListContent = m3u8.map((url, i) => `file '${i}.mp3'`).join("\n");
	const mergeCommand = 'ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp3';
}

console.log(await getM3U8Stream("https://api-v2.soundcloud.com/media/soundcloud:tracks:1678374306/b5c5f712-28d6-4f63-aa93-a3ab4c1c3cc6/stream/hls", "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW8iOiJDQSIsInN1YiI6IiIsInJpZCI6IjU3NjM0N2NiLTgwZjctNGZmZi1hZDA1LTg3Nzg2OWI0NzFjMCIsImlhdCI6MTcwMTgwMTMyOX0.mtLRDNVTdZEJVnp2tohEtJ9DQ_nF14MvPFYEh3eFRRM"));



