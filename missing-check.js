import fs from 'fs';
import path from 'path';
import config from './config.js';
import { getDB } from './fileio.js';

const checkLibrary = (libraryPath) => {
	const db = getDB(libraryPath);
	console.log("Checking for library", libraryPath);
	
	const getPath = (filename) => {
		return path.join(libraryPath, filename);
	}
	const missing = db.filter(song => {
		if (!fs.existsSync(getPath(song.fileName))) {
			console.log("Missing", song.fileName);
			return true;
		}
		return false;
	});

	console.log("Missing", missing.length, "songs");

	const missingList = JSON.stringify(missing, null, 4);
	fs.writeFileSync(getPath('missing.json'), missingList);
};

const checkMissingForAllLibraries = () => {
	config.libraries.forEach(library => {
		checkLibrary(library.path);
	});
};

checkMissingForAllLibraries();