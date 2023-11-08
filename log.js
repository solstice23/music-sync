import fs from 'fs';
import config from "./config.js";
import { getPath } from "./fileio.js";


const initLogFile =  () => {
	const logFile = getPath(config.logPath, 'log.txt');
	if (!fs.existsSync(logFile)) {
		fs.writeFileSync(logFile, '');
	}
}
export const writeLog = (msg) => {
	initLogFile();
	msg = msg.trim();
	msg = `[${new Date().toLocaleString()}] ${msg}`;
	fs.appendFileSync(getPath(config.logPath, 'log.txt'), `${msg.trim()}\n`);
}


const oldConsoleLog = console.log;
console.log = function (...args) {
	oldConsoleLog.apply(console, args);
	writeLog(args.map(arg => arg.toString()).join(' '));
}