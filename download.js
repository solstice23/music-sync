import config from './config.js';

import { spawn } from 'child_process';
import { getPath, getTmpPath } from './fileio.js';
import { createWriteStream, existsSync } from 'fs';
import https from 'https';

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



export const downloadMp3 = async (videoId, libraryPath) => {
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

export const downloadThumbnail = async (videoId, thumbnailUrl, libraryPath) => {
	const tmpPath = getTmpPath(libraryPath);
	console.log(`Downloading thumbnail ${videoId}...`);
	const url = thumbnailUrl || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
	
	const file = createWriteStream(getPath(tmpPath, `${videoId}.jpg`));
	const request = https.get(url, function(response) {
		response.pipe(file);
	});
	console.log(`Downloaded thumbnail ${videoId}.jpg`);
}

