const config = {
	APIKey: "YOUR YOUTUBE API KEY",
	
	libraries: [
		{
			path: "C:\\Users\\solstice23\\Music",
			playlistIDs: [
				"YOUR PLAYLIST ID",
			],
			soundCloudPlaylists: [
				"PLAYLIST URL",
			],
			soundCloudLikes: [
				"USER NAME OR ID",
			],
		}
	],
	logPath: "D:\\dev\\music-sync",

	chatGPTModel: "gpt-4o",
	chatGPTAPIKey: "YOUR OPENAI API KEY",
}

export default config;