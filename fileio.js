import fs from 'fs';
import config from './config.js';

export const getPath = (libraryPath, path = '') => {
	const basePath = libraryPath.replace(/\\/g, '/').replace(/\/$/, '');
	path = path.replace(/\\/g, '/');
	return `${basePath}/${path}`;
}

const DBName = 'db.json';

export const getDB = (libraryPath) => {
	const DBPath = getPath(libraryPath, DBName);
	if (!fs.existsSync(DBPath)) {
		console.log('DB not found, creating new one');
		fs.writeFileSync(DBPath, '[]');
		return [];
	}
	try {
		return JSON.parse(fs.readFileSync(DBPath));
	} catch (e) {
		console.log('Error reading DB', e);
		return {};
	}
}

export const saveDB = (libraryPath, db) => {
	const DBPath = getPath(libraryPath, DBName);
	fs.writeFileSync(DBPath, JSON.stringify(db, null, 4));
}

export const getLibraryMusics = (libraryPath) => {
	libraryPath = getPath(libraryPath);
	const files = fs.readdirSync(libraryPath);
	const music = files.filter(file => file.endsWith('.mp3'));
	return music;
}

export const getTmpPath = (libraryPath) => {
	if (!fs.existsSync(getPath(libraryPath, 'tmp'))) {
		fs.mkdirSync(getPath(libraryPath, 'tmp'));
	}
	return getPath(libraryPath, 'tmp');
}

export const clearTmp = (libraryPath) => {
	const tmpPath = getTmpPath(libraryPath);
	fs.rmSync(tmpPath, { recursive: true });
}

export const formatFileName = (fileName) => {
	fileName = fileName.replace(/[<>:"\/\\|?*]/g, '');
	fileName = fileName.trim().replace(/\.+$/, '');
	if (fileName.length === 0) {
		return 'invalid_fileName';
	}
	if (fileName.length > 255) {
		fileName = fileName.substring(0, 255);
	}
	return fileName;
}