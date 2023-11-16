const config = {
	APIKey: "YOUR YOUTUBE API KEY",
	
	libraries: [
		{
			path: "C:\\Users\\solstice23\\Music",
			youtubePlaylists: [
				"YOUR PLAYLIST ID",
			],
			soundCloudLists: [
				""
			]
		}
	],
	logPath: "D:\\dev\\youtube-playlist-song-sync",

	//chatGPTModel: "gpt-3.5-turbo",
	chatGPTModel: "gpt-4",
	chatGPTAPIKey: "YOUR OPENAI API KEY",
}

export default config;