var sys = require('sys');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn
var http = require('http');

require('./miniprototype')
require('./Base')

var runCommand = function(command, parameter, callback) {
	var proc = spawn(command, parameter);
	var stdout = '';
	var stderr = '';
	proc.stdout.addListener('data', function (data) { stdout += data });
	proc.stderr.addListener('data', function (data) { stderr += data });
	proc.addListener('exit', function (code) {
		// sys.puts(command + ' done, exit code: ' + code);
		callback && callback(code, stdout, stderr);
	});
	return proc;
};

var runCommandInDir = function(dir, command, parameter, callback) {
	var currentDir = process.cwd();
	try {
		process.chdir(dir);
		return runCommand(command, parameter, callback);
	} catch (e) {
		sys.puts('Error in runCommandInDir (' + command + ' in ' + dir + '): ' + e);
		throw e;
	} finally {
		process.chdir(currentDir);
	}
}

// recursively retrieves contents of a given URL into a directory
Object.subclass('Downloader', {
	downloadContents: function(url, path, callback) {
		sys.puts('Downloading from ' + url + ' to ' + path);
		var wget = runCommand('wget',
			[url, '--no-host-directories', '--cut-dirs=' + this.urlDepth(url), '-r', '--no-parent', '-P', path], callback);
	},
	
	urlDepth: function(url) {
		// number of directories on the url following the host
		// we need it for wget to put donloaded files directly into current dir
		var chars = Array.from(url);
		var noOfChars = chars.select(function(ea) { return ea == '/' }).length;
		// the first three slashes belong to the host part (http://foo.org)
		if (noOfChars < 2) throw Error('strange url ' + url);
		noOfChars -= 2;
		if (url.endsWith('/') && noOfChars > 0 /*when just host is given*/) noOfChars -= 1;
		return noOfChars
	},
	
});


var count = (function createCounter() {
	var  i = 0;
	return function() { return i++ }
})();
// creating/removeing directories
Object.subclass('FileHandler', {
	currentDir: function() { return process.cwd() + '/' },
	
	createDir: function(path) { fs.mkdirSync(path, 0755) },
	removeDir: function(dirName, callback) { runCommand('rm', ['-rfd', dirName], callback) },
	
	createNewDir: function() {
		var path = this.currentDir() + count() + '_PDFCreator/';
		try {
			fs.readdirSync(path)
		} catch(e) {
			// dir not existing, FIXME at least I assume...
			this.createDir(path);
			return path;
		}
		// dir existing, try again
		return this.createNewDir();
	},
	
	readFile: function(pathToFile) {
		sys.puts('reading ' + pathToFile);
		return fs.readFileSync(pathToFile, 'binary');
	},
	
	lastNLines: function(filename, noOfLines, callback) {
		runCommand('tail', ['-' + noOfLines, filename], function(exitCode, stdout, stderr) { callback && callback(stdout) });
	},
	
	writeFile: function(pathToFile, content) {
		return fs.writeFileSync(pathToFile, content, 'binary')
	}
});

Object.subclass('LaTeXTypesetter', {
	
	noPDFCreated: function(pathToPDF, output) {
		throw new Error('Couldn\'t create ' + pathToPDF + '\npdflatex output: ' + output);
	},
	
	compile: function(pathToDir, relativePathToTexFile, callback) {
		var self = this;
		// if (!pathToDir.endsWith('/')) pathToDir += '/';
		var completePath = path.join(pathToDir, relativePathToTexFile);
		// when texFilename is HTML5/test.tex then dirOfTextFile != pathToDir
		var dirOfTexFile = path.dirname(completePath);
		var texFilename = path.basename(completePath);
		var texFilenameNoExtension = path.basename(completePath, '.tex'); // remove .tex
		var pathToPDF = path.join(dirOfTexFile, texFilenameNoExtension + '.pdf');
		
		sys.puts('Will run pdflatex and bibtex on ' + texFilenameNoExtension);
		
		var output = ''
		runCommandInDir(dirOfTexFile, 'pdflatex', ['-halt-on-error', '-interaction=nonstopmode', texFilename], function(exitCode, stdout, stderr) {
			if (exitCode != 0) {
				self.noPDFCreated(pathToPDF, 'pdflatex stdout:\n' + stdout + '\n\n\n\npdflatex stderr:\n' + stderr);
				return;
			}
				
			runCommandInDir(dirOfTexFile, 'bibtex', [texFilenameNoExtension], function(exitCode, stdout, stderr) {
				// output += output;
				runCommandInDir(dirOfTexFile, 'pdflatex', ['-halt-on-error', '-interaction=nonstopmode', texFilename], function(exitCode, stdout, stderr) {					
					if (exitCode != 0) {
						self.noPDFCreated(pathToPDF, 'pdflatex stdout:\n' + stdout + '\n\n\n\npdflatex stderr:\n' + stderr);
						return;
					}
					callback && callback(stdout);
				});
			});
		});
		
	},
});

Object.subclass('PDFCreator', {
	
	initialize: function() {
		this.downloader = new Downloader();
		this.fileHandler = new FileHandler();
		this.typesetter = new LaTeXTypesetter();
	},
	
	downloadSources: function(url, callback) {
		var path = this.fileHandler.createNewDir();
		var self = this;
		this.downloader.downloadContents(url, path, function() {
			self.pathToDownloadedSource = path;
			callback && callback(path) });
	},
		
	compile: function(path, texFile, callback) {
		if (!texFile.endsWith('.tex'))
			throw new Error('Cannot compile strange file ' + texFile);
		var pdfFile = texFile.substring(0, texFile.length - 3) + 'pdf'
		var fileHandler = this.fileHandler;
		this.typesetter.compile(path, texFile, function() {
			callback && callback(fileHandler.readFile(path + pdfFile));			
		});
	},
	
	uploadPdf: function(resultURL, content) {
		if (!resultURL.endsWith('.pdf'))
			throw new Error('resultURL should point to a pdf file but is ' + resultURL);
		var host = resultURL, serverPath = '';
		if (host.startsWith('http://')) host = host.substring('http://'.length, host.length);
		serverPath = host.substring(host.indexOf('/'), host.length);
		host = host.substring(0, host.indexOf('/'))
		var writer = http.createClient(80, host);
		var request = writer.request('PUT', serverPath, {'host': host, 'Content-Length': content.length});
		request.write(content, 'binary');
		request.end();
	},
	
	downloadAndCompile: function(url, texFile, resultURL, callback) {
		var pdfCreator = this;
		sys.puts('Will download and compile ' + texFile +
			'\nusing the sources in ' + url +
			'\nand upload the resulting pdf to ' + resultURL);
		sys.puts('.................. 1 -- Downloading started')
		pdfCreator.downloadSources(url, function(path) {
			sys.puts('.................. 1 -- Downloading done');
			sys.puts('.................. 2 -- Compiling started')
			pdfCreator.compile(path, texFile, function(content) {
				sys.puts('.................. 2 -- Compiling done')
				sys.puts('.................. 3 -- Uploading started')
				pdfCreator.uploadPdf(resultURL, content);
				sys.puts('.................. 3 -- Uploading done')
				pdfCreator.cleanup();
				callback && callback();
			});
		});
	},
	
	cleanup: function() {
		if (!this.pathToDownloadedSource) return
		sys.puts('Removing directory ' + this.pathToDownloadedSource);
		this.fileHandler.removeDir(this.pathToDownloadedSource);
	},
});

exports.PDFCreator = PDFCreator;