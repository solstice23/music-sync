import fs from 'fs-extra';
import { exit } from 'process';
import { execSync } from 'child_process';

export const getPath = (libraryPath, path = '') => {
	const basePath = libraryPath.replace(/\\/g, '/').replace(/\/$/, '');
	path = path.replace(/\\/g, '/');
	return `${basePath}/${path}`;
}

const DBName = 'db.json';

const emptyDB = { version: 1, entries: [] };

export const getDB = (libraryPath) => {
	const DBPath = getPath(libraryPath, DBName);
	if (!fs.existsSync(DBPath)) {
		console.log('DB not found, creating new one');
		fs.writeFileSync(DBPath, JSON.stringify(emptyDB(), null, 4));
		return [];
	}
	let db = null;
	try {
		db = JSON.parse(fs.readFileSync(DBPath));
	} catch (e) {
		console.log('Error reading DB', e);
		exit(1);
	}
	const version = getDBVersion(db);
	if (version === 0) {
		db = migrateDB0to1(db);
		saveDB(libraryPath, db.entries);
	} else if (version !== 1) {
		console.log('DB version not supported, please update the repo');
		exit(1);
	}
	return db.entries;
}

export const saveDB = (libraryPath, db) => {
	const DBPath = getPath(libraryPath, DBName);
	fs.writeFileSync(DBPath, JSON.stringify({
		version: 1,
		entries: db,
	}, null, 4));
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

export const clearTmp = async (libraryPath, times = 50) => {
	if (times === 0) {
		console.log('Failed to clear tmp folder');
		return;
	}
	const tmpPath = getTmpPath(libraryPath);
	/*try {
		//fs.rmSync(tmpPath, { recursive: true });
		fs.removeSync(tmpPath);
	} catch (e) {
		//if (e.code !== 'ENOTEMPTY') {
			console.log('Error clearing tmp folder, retrying...', e);
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve();
				}, 100);
			});
			await clearTmp(libraryPath, times - 1);
		//}
		//throw e;
	}*/
	if (process.platform === 'win32') {
		execSync(`rmdir /s /q "${tmpPath}"`);
	} else {
		execSync(`rm -rf "${tmpPath}"`);
	}
}

export const formatFileName = (fileName) => {
	fileName = fileName.replace(/[<>:"\/\\|?*]/g, '');
	fileName = fileName.replace(/(\u00a9|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, ''); // emojis
	fileName = fileName.trim().replace(/\.+$/, '');
	if (fileName.length === 0) {
		return 'invalid_fileName';
	}
	if (fileName.length > 255) {
		fileName = fileName.substring(0, 255);
	}
	return fileName;
}

const getDBVersion = (db) => {
	return db?.version ?? 0;
}

const migrateDB0to1 = (db) => {
	console.log('Migrating DB from version 0 to 1...');
	return {
		version: 1,
		entries: db.map(entry => {
			return {
				source: 'youtube',
				...entry,
			}
		})
	};
}