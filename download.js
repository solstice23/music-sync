import config from './config.js';

import { spawn } from 'child_process';
import { getPath, getTmpPath } from './fileio.js';
import { createWriteStream, existsSync } from 'fs';
import { getSCM3U8StreamUrls } from './soundcloud-api.js';
import https from 'https';
import fs from 'fs';

const executeCommand = (command, args, onStdout = null, onStderr = null, onErr = () => {}) => {
	if (!onStdout) {
		onStdout = (data) => {
			//console.log(data.toString());
			process.stdout.write(data.toString());
		}
	}
	if (!onStderr) {
		onStderr = (data) => {
			//console.error(data.toString());
			process.stderr.write(data.toString());
		}
	}
	let stdout = '';
	return new Promise((resolve, reject) => {
		const childProcess = spawn(command, args);

		childProcess.stdout.on('data', (data) => {
			stdout += data.toString();
			onStdout(data);
		});

		childProcess.stderr.on('data', onStderr);

		childProcess.on('error', (err) => {
			onErr(err);
			reject(err);
		});

		childProcess.on('close', (code) => {
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Command execution failed with code ${code}`));
			}
		});
	});
}

const checkFFmpeg = async () => {
	console.log('Checking ffmpeg...');
	try {
		const res = await executeCommand('ffmpeg', ['-version'], () => {}, () => {});
		console.log(res.split('\n')[0]);
	} catch (e) {
		if (e.toString().includes('ENOENT')) {
			console.log('ffmpeg not found, please install ffmpeg');
		} else {
			console.log('Error checking ffmpeg', e);
		}
		process.exit(1);
	}
	console.log('ffmpeg OK');
}




const updateYtDlp = async () => {
	console.log('Checking yt-dlp...');
	let stdout = '', isLatest = true;
	try {
		await executeCommand('pip', ['install', '--upgrade', 'yt-dlp'], (data) => {
			stdout += data.toString();
			if (!isLatest) {
				console.log(data.toString());
			} else if (data.toString().includes('Downloading')) {
				isLatest = false;
				console.log(stdout);
			}
		});
		if (isLatest) {
			console.log('yt-dlp is already the latest version.');
		} else {
			console.log('yt-dlp updated');
		}
	} catch (e) {
		console.log('Error updating yt-dlp', e);
	}
}


export const checkPrerequisites = async () => {
	await checkFFmpeg();
	await updateYtDlp();
}



export const downloadYoutubeMp3 = async (videoId, libraryPath) => {
	const tmpPath = getTmpPath(libraryPath);
	const filePath = getPath(tmpPath, `${videoId}.mp3`);
	console.log(`Downloading mp3 of ${videoId}...`);
	if (existsSync(filePath)) {
		console.log(`File ${videoId}.mp3 already exists, skipping...`);
		return;
	}
	try {
		// yt-dlp -x --audio-format mp3 --audio-quality 0 https://www.youtube.com/watch?v=zqjOKjBRq-g --no-mtime --output "zqjOKjBRq-g.mp3"
		await executeCommand('yt-dlp', [
			'-x',
			'--audio-format',
			'mp3',
			'--audio-quality',
			'0',
			`https://www.youtube.com/watch?v=${videoId}`,
			'--no-mtime',
			'--output',
			filePath
		]);
	} catch (e) {
		// console.log(`Error downloading ${videoId}`, e);
		throw e;
	}
	console.log(`Downloaded ${videoId}.mp3`);
}

// downloadMp3('zqjOKjBRq-g', config.libraries[0].path);

export const downloadYoutubeThumbnail = async (videoId, thumbnailUrl, libraryPath) => {
	const tmpPath = getTmpPath(libraryPath);
	console.log(`Downloading thumbnail ${videoId}...`);
	const url = thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
	
	const file = createWriteStream(getPath(tmpPath, `${videoId}.jpg`));
	const request = https.get(url, function(response) {
		response.pipe(file);
	});
	console.log(`Downloaded thumbnail ${videoId}.jpg`);
}


export const downloadSoundCloudMp3 = async (id, transcodingLink, key, libraryPath) => {
	id = id.toString();
	const tmpPath = getTmpPath(libraryPath);
	const subTmpPath = getPath(getTmpPath(libraryPath), id);
	if (!existsSync(subTmpPath)) {
		fs.mkdirSync(subTmpPath);
	}
	const filePath = getPath(subTmpPath, 'tmp.mp3');
	console.log(`Downloading mp3 of ${id}...`);
	if (existsSync(filePath)) {
		console.log(`File ${id}.mp3 already exists, skipping...`);
		return;
	}
	let m3u8 = await getSCM3U8StreamUrls(transcodingLink, key);
	m3u8 = m3u8.map((url, index) => {
		return new Promise(async (resolve) => {
			//console.log(`Downloading ${index + 1}/${m3u8.length}...`);
			const file = getPath(subTmpPath, `${index}.mp3`);
			const res = await fetch(url);
			const buffer = await res.arrayBuffer();
			fs.createWriteStream(file).write(Buffer.from(buffer));
			console.log(`Downloaded ${index + 1}/${m3u8.length}`);
			resolve();
		});
	});
	await Promise.all(m3u8);
	console.log(`Downloaded ${m3u8.length} fragments, merging...`);

	const fileListContent = m3u8.map((_, i) => `file '${i}.mp3'`).join("\n");
	const filelist = getPath(subTmpPath, 'filelist.txt');
	fs.writeFileSync(filelist, fileListContent);

	try {
		// ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp3
		await executeCommand('ffmpeg', [
			'-f',
			'concat',
			'-safe',
			'0',
			'-i',
			filelist,
			'-c',
			'copy',
			filePath
		], () => {}, () => {});
	} catch (e) {
		console.log(`Error merging ${id}`, e);
		throw e;
	}
	console.log(`Merged ${id}.mp3`);

	console.log(`Cleaning up tmp files...`);
	//fs.renameSync(filePath, getPath(tmpPath, `${id}.mp3`));
	fs.copyFileSync(filePath, getPath(tmpPath, `${id}.mp3`));
	fs.rmSync(filelist);
	/*m3u8.forEach((_, i) => {
		fs.rmSync(getPath(subTmpPath, `${i}.mp3`));
	});
	fs.rmSync(subTmpPath, { recursive: true, force: true });*/
	console.log(`Cleaned up tmp files`);
	console.log(`Downloaded ${id}.mp3`);
}

export const downloadSoundCloudThumbnail = async (id, thumbnailUrl, libraryPath) => {
	id = id.toString();
	const tmpPath = getTmpPath(libraryPath);
	console.log(`Downloading thumbnail ${id}...`);
	const url = thumbnailUrl.replace('large.jpg', 'original.jpg');
	const file = createWriteStream(getPath(tmpPath, `${id}.jpg`));
	const request = https.get(url, function(response) {
		response.pipe(file);
	});
	console.log(`Downloaded thumbnail ${id}.jpg`);
}