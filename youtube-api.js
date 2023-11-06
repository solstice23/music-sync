import config from './config.js';
import { google } from 'googleapis';

const youtube = google.youtube({
	version: 'v3',
	auth: config.APIKey
});

export const getPlaylistItems = async (playlistID, pageToken = '', nthPage = 1) => {
	if (nthPage === 1) {
		console.log(`Getting playlist ${playlistID}...`);
		console.log(`Getting page ${nthPage}...`);
	}
	const result = (await youtube.playlistItems.list({
		part: [
			"id",
			"contentDetails",
			"snippet",
        	"status"
		],
		playlistId: playlistID,
		maxResults: 1000000,
		pageToken
	})).data;
	const list = result.items;
	if (result.nextPageToken) {
		console.log(`Getting page ${nthPage + 1} (total ${Math.ceil(result.pageInfo.totalResults / result.pageInfo.resultsPerPage)} pages)...`);
		return list.concat(await getPlaylistItems(playlistID, result.nextPageToken, nthPage + 1));
	} else {
		console.log(`Playlist ${playlistID} done, got ${result.pageInfo.totalResults} items`);
		return list;
	}
}

export const getMultiplePlaylistsItems = async (playlistIDs) => {
	const items = [];
	for (const playlistID of playlistIDs) {
		items.push(...await getPlaylistItems(playlistID));
	}
	return items;
}

// console.log(await getPlaylistItems(config.playlistIDs[0]))
