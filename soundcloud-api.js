import fs from 'fs';
import config from './config.js';
import { exec } from 'child_process';
import { getTmpPath, getPath } from './fileio.js';

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


const userIdCache = {};
const getUserIdByUsername = async (username) => {
	if (userIdCache[username]) {
		return userIdCache[username];
	}
	console.log("Getting soundcloud user id for " + username);
	const html = await fetch(`https://soundcloud.com/${username}`).then(res => res.text());
	const userId = html.match(/soundcloud\:\/\/users:(\d+)/)[1];
	console.log("Soundcloud user id: " + userId);
	userIdCache[username] = userId;
	return userId;
};


export const getSCPlaylist = async (url) => {
	url = url.split("?")[0];
	const html = await fetch(url).then(res => res.text());
	//const secretToken = html.match(/"secret_token":"(.*?)",/)[1];

	let json = html.match(/<script>window\.__sc_hydration = (.*?);<\/script>/)[1];
	const data = JSON.parse(json).filter(item => item.hydratable === "playlist")[0].data;
	const secretToken = data.secret_token;
	const tracks = data.tracks.filter(item => item?.kind === "track");
	const title = data.title;

	return { title, secretToken, tracks };
};

//console.log(await getSCPlaylist("https://soundcloud.com/233-solstice/sets/test/s-pjDNgRzKBhB?si=1a820481f5c244c0bfd896e76b8095e0"));
//console.log(await getSCPlaylist("https://soundcloud.com/sc-playlists/sets/old-school-beats"));

export const getSCUserLikes = async (user, limit = 10000) => {
	const userId = (typeof user === "number") ? user : await getUserIdByUsername(user);
	const { clientId, appVersion } = await getSCCredentials();
	const url = `https://api-v2.soundcloud.com/users/${userId}/likes?client_id=${clientId}&limit=${limit}&offset=0&linked_partitioning=1&app_version=${appVersion}&app_locale=en`;
	console.log(url);
	const res = await fetch(url);
	const json = await res.json();
	const tracks = json.collection.filter(item => item.track).map(item => {item.track.added_at = item.created_at; return item.track});
	return tracks;
};

export const getSCSongsMetadata = async (songs) => {
	const { clientId, appVersion } = await getSCCredentials();
	const ids = songs.map(song => song.id);
	const blocks = [[]];
	ids.forEach((id) => {
		if (blocks[blocks.length - 1].length >= 50) {
			blocks.push([]);
		}
		blocks[blocks.length - 1].push(id);
	});
	for (let i in blocks) {
		const block = blocks[i];
		const ids = block.join("%2C");
		const url = `https://api-v2.soundcloud.com/tracks?ids=${ids}&client_id=${clientId}&%5Bobject%20Object%5D=&app_version=${appVersion}&app_locale=en`;
		//console.log(url);
		console.log(`Getting metadata for [${i * 50 + 1}, ${Math.min(i * 50 + 50, songs.length)}] of ${songs.length} songs...`);
		const res = await fetch(url);
		const json = await res.json();
		json.forEach((song, index) => {
			songs[songs.findIndex(item => item.id === song.id)] = song;
		});
	}
	return songs;	
}
/*console.log(await getSCSongsMetadata(
	[{"id": 1554542551}, {"id": 1576335790}, {"id": 1538945224}, {"id": 1652086437}, {"id": 1557832864}, {"id": 1556875285}, {"id": 1596404922}, {"id": 1432368064}, {"id": 1604148357}, {"id": 1669601274}, {"id": 1559047243}, {"id": 1621183659}, {"id": 1591830067}, {"id": 1528199557}, {"id": 1594521015}, {"id": 1549066672}, {"id": 1651416219}, {"id": 1554013225}, {"id": 1538315827}, {"id": 1564492870}, {"id": 1558468171}, {"id": 1559664217}, {"id": 1671733998}, {"id": 1601946966}, {"id": 1633781724}, {"id": 1657675497}, {"id": 1548222454}, {"id": 1656295182}, {"id": 1590527895}, {"id": 1493610022}, {"id": 1592436903}, {"id": 1578104014}, {"id": 1546617904}, {"id": 1601857725}, {"id": 1593273813}, {"id": 1583816959}, {"id": 1611813030}, {"id": 1609182123}, {"id": 1536219535}, {"id": 1560494143}, {"id": 1601307798}, {"id": 1557358939}, {"id": 1600112745}, {"id": 1578877574}, {"id": 1597453665}, {"id": 1653480894}, {"id": 1588768435}, {"id": 1566573040}, {"id": 1528227697}, {"id": 1533705043}, {"id": 1569729484}, {"id": 1676310438}, {"id": 1609798062}, {"id": 1548552361}, {"id": 1540017460}, {"id": 1545964051}, {"id": 1532396170}, {"id": 1554051748}, {"id": 1669964985}, {"id": 1546259353}, {"id": 1651519074}, {"id": 1535983135}, {"id": 1552148770}, {"id": 1673715552}, {"id": 1539277810}, {"id": 1578521870}, {"id": 1618750455}, {"id": 1593404958}, {"id": 1556915914}, {"id": 1611562644}, {"id": 1553677921}, {"id": 1645059141}, {"id": 1646339529}, {"id": 1664055201}, {"id": 1549612828}, {"id": 1654870503}, {"id": 1624980492}, {"id": 1554313168}, {"id": 1496230084}, {"id": 1527964852}, {"id": 1544972407}, {"id": 1552482094}, {"id": 1654904808}, {"id": 1545781537}, {"id": 1545189634}, {"id": 1671109074}, {"id": 1674213657}, {"id": 1494909115}, {"id": 1652436018}, {"id": 1673925363}, {"id": 1547415328}, {"id": 1643828457}, {"id": 1561493929}, {"id": 1595177256}, {"id": 1466119498}, {"id": 1571385199}, {"id": 1554309088}, {"id": 1628745507}, {"id": 1530856291}, {"id": 1548120403}, {"id": 1552199062}, {"id": 1667219619}, {"id": 1640291952}, {"id": 1618188330}, {"id": 1676788674}, {"id": 1627350225}, {"id": 1532436652}, {"id": 1594582167}, {"id": 1610053140}, {"id": 1651236357}, {"id": 1675566600}, {"id": 1584332755}, {"id": 1584896763}, {"id": 1557192313}, {"id": 1559384881}, {"id": 1664974407}, {"id": 1591711359}, {"id": 1647103743}, {"id": 1514646949}, {"id": 1546801204}, {"id": 1564496761}, {"id": 1581657719}, {"id": 928744123}, {"id": 1611048387}, {"id": 1609813128}, {"id": 1526186914}, {"id": 1560329353}, {"id": 1527374806}, {"id": 1553005156}, {"id": 1580019390}, {"id": 1662515394}, {"id": 1653212565}, {"id": 1552139008}, {"id": 1556575612}, {"id": 1635773376}, {"id": 1634743428}, {"id": 1585821351}, {"id": 1644605883}, {"id": 1659600807}, {"id": 1557635173}, {"id": 1496695999}, {"id": 1576090291}, {"id": 1618422240}, {"id": 1633355664}, {"id": 1671537777}, {"id": 1587950559}, {"id": 1555611220}, {"id": 1595598957}, {"id": 1631005206}, {"id": 1618351623} ]
));*/


export const getSCM3U8StreamUrls = async (link, key) => {
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