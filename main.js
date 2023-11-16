import config from './config.js';
import { writeLog } from './log.js';
import { getMultiplePlaylistsItems } from './youtube-api.js';
import { getDB, saveDB, getTmpPath, clearTmp, getPath, formatFileName } from './fileio.js';
import { checkPrerequisites, downloadMp3, downloadThumbnail } from './download.js';
import { extractSongMetaGPT } from './gpt.js';
import NodeID3 from 'node-id3';
import fs from 'fs';


const syncLibrary = async (library) => {
	const { path } = library;

	console.log('🔄 Starting sync library', path);
	
	if (library.youtubePlaylists) {
		await syncLibraryYoutubePlaylists(path, library.youtubePlaylists);
	}

	if (library.soundCloudLists) {
		// await syncLibrarySoundCloudLists(path, library.soundCloudLists);
	}
	

	console.log('Done sync library', path, '\n');
}

const syncLibraryYoutubePlaylists = async (path, playlistIDs) => {
	console.log('Starting youtube playlists in library', path);
	console.log('Getting local DB...');
	const db = getDB(path);
	console.log(`${Object.keys(db).length} songs in DB`);

	console.log('Getting playlist items...');
	const playlistItems = (await getMultiplePlaylistsItems(playlistIDs))
						  .filter(item => item.status.privacyStatus === 'public' || item.status.privacyStatus === 'unlisted');
	const playlistLength = playlistItems.length;
	const items = playlistItems.filter(item => !db.some(dbItem => dbItem.videoId === item.contentDetails.videoId));
	console.log(`Got ${playlistLength} items, ${playlistLength - items.length} existing in DB, ${items.length} new songs`);

	for (let i = 0; i < items.length; i++) {
		console.log(`Downloading ${i + 1}/${items.length}...`);
		await downloadYoutubeSong(path, items[i]);
	};
	//await downloadYoutubeSong(path, items[0]);
	
	console.log('Done sync youtube playlists in library', path, '\n');
	console.log('Cleaning up...');
	clearTmp(path);
}



const downloadYoutubeSong = async (libraryPath, item) => {
	const videoId = item.contentDetails.videoId;
	const { title, description, videoOwnerChannelTitle } = item.snippet;
	const thumbnail = Object.keys(item.snippet.thumbnails).reduce((acc, key) => {
		if (item.snippet.thumbnails[key].width > acc.width) {
			return item.snippet.thumbnails[key];
		}
		return acc;
	}, { width: 0 }).url;
	console.log(`Downloading ${videoId}: ${title}...`);
	let meta = null;

	try {
		await Promise.all([
			downloadMp3(videoId, libraryPath),
			downloadThumbnail(videoId, thumbnail, libraryPath),
			new Promise(async (resolve) => {
				console.log(`Extracting metadata using GPT: ${videoId}: ${title}...`);
				meta = await extractSongMetaGPT(title, description, videoOwnerChannelTitle);
				console.log(`Extracted metadata:\n${JSON.stringify(meta, null, 4)}`);
				resolve();
			})
		]);
	} catch (e) {
		console.log(`Error downloading ${videoId}: ${title}`, e);
		console.log(`Skipped.\n`);
		return;
	}
	console.log(`Downloaded ${videoId}: ${title}`);

	console.log(`Writing metadata into mp3...`);
	const tmpPath = getTmpPath(libraryPath);
	const musicPath = getPath(tmpPath, `${videoId}.mp3`);
	const coverPath = getPath(tmpPath, `${videoId}.jpg`);
	const artistStr = [...new Set(meta.artists.concat(meta.coverSingers))].join(', ');
	const tags = {
		title: meta.name,
		artist: artistStr,
		image: coverPath,
		comment: {
			language: 'eng',
			text: `https://www.youtube.com/watch?v=${videoId}`
		}
	};
	NodeID3.write(tags, musicPath);
	console.log("Metadata has been written");
	
	const newMusicName = formatFileName(`${artistStr} - ${meta.name}.mp3`);
	console.log(`Renaming mp3 to ${newMusicName} ...`);
	console.log(`Moving mp3 to library...`);
	fs.renameSync(musicPath, getPath(libraryPath, newMusicName));
	console.log(`Moved mp3 to library`);
	fs.unlinkSync(coverPath);

	console.log(`Updating DB...`);
	const db = getDB(libraryPath);
	db.push({
		"videoId": videoId,
		"fileName": newMusicName,
		"downloadTime": new Date().toISOString(),
		"youtube": {
			"title": title,
			"desc": description,
			"channelName": videoOwnerChannelTitle,
			"thumbnail": thumbnail
		},
		"extractedMeta": meta
	});
	saveDB(libraryPath, db);
	console.log(`DB updated`);

	console.log(`Done ${videoId}: ${title}\n`);
}


const sync = async () => {
	for (const library of config.libraries) {
		await syncLibrary(library);
	}
}

const main = async () => {
	writeLog('');
	writeLog('#########################');
	writeLog('###  Session started  ###');
	writeLog('#########################');
	writeLog('');
	await checkPrerequisites();
	await sync();
	console.log('Done');
}

main()