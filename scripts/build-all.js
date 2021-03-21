#!/usr/bin/env node

var fs = require("fs"),
	path = require("path"),
	util = require("util"),
	{ execFile } = require("child_process"),

	recursiveReadDir = require("recursive-readdir-sync"),

	execFileAsync = util.promisify(execFile),
	packageJSON,
	copyrightHeader,
	version,
	year = (new Date()).getFullYear(),
	builds,

	ROOT_DIR = path.join(__dirname,".."),
	SRC_DIR = path.join(ROOT_DIR,"src"),
	DIST_DIR = path.join(ROOT_DIR,"dist"),
	DIST_UMD_DIR = path.join(DIST_DIR,"umd"),
	DIST_ESM_DIR = path.join(DIST_DIR,"esm"),
	DIST_ESM_BROWSER_DIR = path.join(DIST_DIR,"esm-browser"),
	MONIO_FROM_DIR = path.join(ROOT_DIR,"node_modules","monio","dist"),

	result
;

console.log("*** Building DOMIO ***");

(async function main(){
	try {
		// try to make the dist directories, if needed
		safeMkdir(DIST_DIR);
		safeMkdir(DIST_ESM_BROWSER_DIR);

		// read package.json
		packageJSON = JSON.parse(
			fs.readFileSync(
				path.join(ROOT_DIR,"package.json"),
				{ encoding: "utf8", }
			)
		);
		// read version number from package.json
		version = packageJSON.version;
		// read copyright-header text, render with version and year
		copyrightHeader = fs.readFileSync(
			path.join(SRC_DIR,"copyright-header.txt"),
			{ encoding: "utf8", }
		);
		copyrightHeader = copyrightHeader.replace(/#VERSION#/g,version).replace(/#YEAR#/g,year);

		// run moduloze CLI on the src/ tree
		await execFileAsync(
			path.join(ROOT_DIR,"node_modules",".bin","mz"),
			[
				`--prepend=${ copyrightHeader }`,
				"-ruben",
			]
		);

		console.log("Built dist/umd/");
		console.log("Built dist/esm/");

		// run import-remap CLI on the dist/esm tree
		// to remap the external dependency references to URLs
		await execFileAsync(
			path.join(ROOT_DIR,"node_modules",".bin","import-remap"),
			[
				`--from=${DIST_ESM_DIR}`,
				`--to=${DIST_ESM_BROWSER_DIR}`,
				"--map=./scripts/esm-browser-import-map.json",
				"-rn"
			]
		);

		console.log("Built dist/esm-browser/");

		// copy over external dependencies (monio) into
		// dist/umd/, dist/esm/, and dist/esm-browser/
		copyExternalDependencies();

		console.log("External depedencies copied into dist/*");

		console.log("Complete.");
	}
	catch (err) {
		console.error(err);
		process.exit(1);
	}
})();

function copyExternalDependencies() {
	// scan the directory for input files?
	if (isDirectory(MONIO_FROM_DIR)) {
		let monioUMDPath = path.join(MONIO_FROM_DIR,"umd");
		let monioESMPath = path.join(MONIO_FROM_DIR,"esm");
		let monioUMDFiles;
		let monioESMFiles;

		try {
			monioUMDFiles = recursiveReadDir(monioUMDPath);
			monioESMFiles = recursiveReadDir(monioESMPath);
		}
		catch (err) {
			throw new Error("Monio could not be found");
		}

		copyFilesTo(monioUMDFiles,monioUMDPath,path.join(DIST_UMD_DIR,"monio"));
		copyFilesTo(monioESMFiles,monioESMPath,path.join(DIST_ESM_DIR,"monio"));
		copyFilesTo(monioESMFiles,monioESMPath,path.join(DIST_ESM_BROWSER_DIR,"monio"));
	}
	else {
		throw new Error("Monio could not be found");
	}
}

function copyFilesTo(files,fromBasePath,toDir) {
	if (!safeMkdir(toDir)) {
		throw new Error(`While copying Monio to dist/, directory (${toDir}) could not be created.`);
	}

	for (let fromPath of files) {
		let relativePath = fromPath.slice(fromBasePath.length);
		let outputPath = path.join(toDir,relativePath);
		let outputDir = path.dirname(outputPath);

		if (!fs.existsSync(outputDir)) {
			if (!safeMkdir(outputDir)) {
				throw new Error(`While copying Monio to dist/, directory (${outputDir}) could not be created.`);
			}
		}

		let contents = fs.readFileSync(fromPath);
		fs.writeFileSync(outputPath,contents);
	}
}

function isDirectory(pathStr) {
	return fs.existsSync(pathStr) && fs.lstatSync(pathStr).isDirectory();
}

function safeMkdir(pathStr) {
	if (!fs.existsSync(pathStr)) {
		try {
			fs.mkdirSync(pathStr,0o755);
			return true;
		}
		catch (err) {}
		return false;
	}
	return true;
}
