import config from './config.js';
import { writeLog } from './log.js';
import { getMultiplePlaylistsItems } from './youtube-api.js';
import { getSCPlaylist, getSCUserLikes, getSCSongsMetadata } from './soundcloud-api.js';
import { getDB, saveDB, getTmpPath, clearTmp, getPath, formatFileName } from './fileio.js';
import { checkPrerequisites, downloadYoutubeMp3, downloadYoutubeThumbnail, downloadSoundCloudMp3, downloadSoundCloudThumbnail } from './download.js';
import { extractSongMetaGPT } from './gpt.js';
import NodeID3 from 'node-id3';
import fs from 'fs';


const syncLibrary = async (library) => {
	const { path } = library;

	console.log('🔄 Starting sync library', path);
	
	if (library.youtubePlaylists) {
		await syncLibraryYoutubePlaylists(path, library.youtubePlaylists);
	}

	if (library.soundCloudPlaylists || library.soundCloudLikes) {
		await syncLibrarySoundcloud(path, library.soundCloudPlaylists, library.soundCloudLikes);
	}
	

	console.log('Done sync library', path, '\n');
}

const syncLibraryYoutubePlaylists = async (path, playlistIDs) => {
	console.log('Start syncing youtube playlists in library', path);
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
	await clearTmp(path);
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
			downloadYoutubeMp3(videoId, libraryPath),
			downloadYoutubeThumbnail(videoId, thumbnail, libraryPath),
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
	
	const newMusicName = formatFileName(musicName(artistStr, meta.name)) + '.mp3';
	console.log(`Renaming mp3 to ${newMusicName} ...`);
	console.log(`Moving mp3 to library...`);
	fs.renameSync(musicPath, getPath(libraryPath, newMusicName));
	console.log(`Moved mp3 to library`);
	fs.unlinkSync(coverPath);

	console.log(`Updating DB...`);
	const db = getDB(libraryPath);
	db.push({
		"source": "youtube",
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

const syncLibrarySoundcloud = async (path, playlists, likes) => {
	playlists = playlists || [];
	likes = likes || [];
	console.log('Start syncing soundcloud playlists & likes in library', path);
	console.log('Getting local DB...');
	const db = getDB(path);
	console.log(`${Object.keys(db).length} songs in DB`);

	let songs = [];
	const addSong = (song) => {
		const existing = songs.find(item => item.id === song.id);
		if (!existing) {
			songs.push(song);
		} else if (!existing.media) {
			songs[songs.indexOf(existing)] = song;
		}
	}
	for (let playlist of playlists) {
		console.log(`Getting playlist ${playlist}...`);
		const playlistSongs = (await getSCPlaylist(playlist)).tracks;
		playlistSongs.forEach(song => addSong(song));
		console.log(`Got ${playlistSongs.length} songs from playlist ${playlist}`);
	}
	for (let user of likes) {
		console.log(`Getting likes of user ${user}...`);
		const userLikes = await getSCUserLikes(user);
		userLikes.forEach(song => addSong(song));
		console.log(`Got ${userLikes.length} songs from likes of user ${user}`);
	}
	console.log(`Got ${songs.length} songs in total`);
	
	const existingIds = db.filter(item => item.source === 'soundcloud').map(item => item.musicId);
	songs = songs.filter(song => !existingIds.includes(song.id));
	console.log(`${songs.length} of them are new songs`);
	
	const missingMetaSongs = songs.filter(song => !song.media);
	if (missingMetaSongs.length > 0) {
		console.log('Getting missing metadata of songs...');
		const missingMetadata = await getSCSongsMetadata(missingMetaSongs);
		missingMetadata.forEach(song => addSong(song));
		console.log(`Got ${missingMetadata.length} missing metadata`);
	}

	for (let i = 0; i < songs.length; i++) {
		console.log(`Downloading ${i + 1}/${songs.length}...`);
		await downloadSoundcloudSong(path, songs[i]);
	};

	console.log('Done sync soundcloud playlists & likes in library', path, '\n');
	console.log('Cleaning up...');
	await clearTmp(path);
}

const downloadSoundcloudSong = async (libraryPath, song) => {
	const id = song.id;
	const transcodingLink = song.media.transcodings[0].url;
	const key = song.track_authorization;
	
	
	const title = song.title;
	const caption = song.caption;
	const description = song.description;
	const username = song.user.username;
	const userId = song.user.id;
	const thumbnail = song.artwork_url.replace('large.jpg', 'original.jpg');
	const url = song.permalink_url;
	const genre = song.genre;

	const meta = {};
	meta.name = title;
	meta.artists = [username];
	meta.genres = genre.split(',').map(item => item.trim()).filter(item => item !== '').map(item => 
		item.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
	);

	console.log(`Downloading ${id}: ${meta.name}...`);
	try {
		await Promise.all([
			downloadSoundCloudMp3(id, transcodingLink, key, libraryPath),
			downloadSoundCloudThumbnail(id, thumbnail, libraryPath),
		]);
	} catch (e) {
		console.log(`Error downloading ${id}: ${title}`, e);
		console.log(`Skipped.\n`);
		return;
	}
	console.log(`Downloaded ${id}: ${meta.name}`);

	console.log(`Writing metadata into mp3...`);
	const tmpPath = getTmpPath(libraryPath);
	const musicPath = getPath(tmpPath, `${id}.mp3`);
	const coverPath = getPath(tmpPath, `${id}.jpg`);
	const artistStr = [...new Set(meta.artists)].join(', ');
	const tags = {
		title: meta.name,
		artist: artistStr,
		image: coverPath,
		genre: meta.genres.join(', '),
		comment: {
			language: 'eng',
			text: url
		}
	};
	NodeID3.write(tags, musicPath);
	console.log("Metadata has been written");

	const newMusicName = formatFileName(musicName(artistStr, meta.name)) + '.mp3';
	console.log(`Renaming mp3 to ${newMusicName} ...`);
	console.log(`Moving mp3 to library...`);
	fs.renameSync(musicPath, getPath(libraryPath, newMusicName));
	console.log(`Moved mp3 to library`);
	fs.unlinkSync(coverPath);

	console.log(`Updating DB...`);
	const db = getDB(libraryPath);
	db.push({
		"source": "soundcloud",
		"musicId": id,
		"fileName": newMusicName,
		"downloadTime": new Date().toISOString(),
		"soundcloud": {
			"title": title,
			"caption": caption,
			"desc": description,
			"username": username,
			"userId": userId,
			"thumbnail": thumbnail,
			"url": url,
			"genre": genre
		},
		"extractedMeta": meta
	});
	saveDB(libraryPath, db);
	console.log(`DB updated`);

	console.log(`Done ${id}: ${meta.name}\n`);
}
	




const musicName = (artist, name) => {
	artist = artist.trim();
	name = name.trim();
	if (artist === '') {
		return name;
	}
	return `${artist} - ${name}`;
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
