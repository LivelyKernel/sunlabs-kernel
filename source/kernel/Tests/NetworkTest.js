module('Tests.NetworkTest').requires('lively.TestFramework').toRun(function() {
	
TestCase.subclass('Tests.NetworkTest.URLTest', {
	
	testEnsureAbsoluteURL1: function() {
		var urlString = 'http://livelykernel.sunlabs.com/repository/lively-wiki/index.xhtml';
		var result = URL.ensureAbsoluteURL(urlString);
		this.assertEqual(urlString, result.toString());
		
		urlString = 'http://localhost/lively/index.xhtml';
		result = URL.ensureAbsoluteURL(urlString);
		this.assertEqual(urlString, result.toString());
	},
	
	testEnsureAbsoluteURL2: function() {
		var urlString = 'index.xhtml';
		var result = URL.ensureAbsoluteURL(urlString);
		var expected = URL.source.getDirectory().toString() + urlString;
		this.assertEqual(expected, result.toString());
	},

	testEnsureAbsoluteURL3: function() {
		var urlString = 'bla/http/blupf.xhtml';;
		var result = URL.ensureAbsoluteURL(urlString);
		var expected = URL.source.getDirectory().toString() + urlString;
		this.assertEqual(expected, result.toString());
	},

	testRemoveRelativeParts: function() {
		var urlString = 'http://foo.com/bar/../baz/';
		var result = new URL(urlString).withRelativePartsResolved();
		var expected = 'http://foo.com/baz/';
		this.assertEqual(expected, result.toString());
	},
	
	testRelativePartsFrom: function() {
		var expected = 'test/bar/baz';
		
		var url1 = new URL('http://www.foo.org/test/bar/baz');
		var url2 = new URL('http://www.foo.org/');
		var result = url1.relativePathFrom(url2);
		this.assertEqual(expected, result.toString());
		
		url2 = new URL('http://foo.org/');
		result = url1.relativePathFrom(url2);
		this.assertEqual(expected, result.toString());
		
		try {
			url2 = new URL('http://foo.com/');
			result = url1.relativePathFrom(url2);
		} catch (e) { return }
		this.assert(false, 'error expected')
	},
	
	testMakeProxy: function() {
		var originalProxy = URL.proxy;
		URL.proxy = new URL('http://foo.com/proxy/');
		
		try { // FIXME			
			// normal behavior
			var result = URL.makeProxied('http://bar.com/');
			var expected = 'http://foo.com/proxy/bar.com/'
			this.assertEqual(expected, result.toString());
		
			// don't proxy yourself
			var result = URL.makeProxied(URL.proxy);
			this.assertEqual(URL.proxy.toString(), result.toString());
		
			// don't proxy yourself 2
			var result = URL.makeProxied('http://www.foo.com/proxy/');
			this.assertEqual(URL.proxy.toString(), result.toString());
		} finally {
			URL.proxy = originalProxy;
		}
	},
	
});

TestCase.subclass('Tests.NetworkTest.WebResourceTest', {

	plainTextString: 'this is a test\nfoo\nbar',

	xmlString: '<foo xmlns="http:\/\/www.lively-kernel.org\/fooNS" xmlns:bazNS="http\:\/\/www.lively-kernel.org\/fooNS">\n\
		<bar name="test1"/>\n\
		<bar name="test2">\n\
			<bazNS:baz name="test3"/>\n\
		</bar>\n\
	</foo>',

	writeFile: function(url, content) {
		new WebResource(url).setContent(content);
	},

	removeFile: function(url) {
		new WebResource(url).del();
	},

	setUp: function($super) {
		$super();
		var url = URL.source.getDirectory().withFilename('WebResourceTestDir/');
		this.dir = new WebResource(url);
		if (!this.dir.exists()) this.dir.create();

		this.plainTextFileURL = url.withFilename('TextFileForWebResourceTest.txt');
		this.xmlFileURL = url.withFilename('XMLFileForWebResourceTest.xml');

		this.writeFile(this.plainTextFileURL, this.plainTextString);
		this.writeFile(this.xmlFileURL, this.xmlString);
	},

	tearDown: function($super) {
		$super();
		this.dir.del();
	},

	testGet: function() {
		var sut = new WebResource(this.plainTextFileURL);
		this.assertEqual(this.plainTextString, sut.get().content)
		this.assert(sut.status.isSuccess())

		var resultXML = new WebResource(this.xmlFileURL).get().contentDocument;
		this.assertEqual(this.xmlString, Exporter.stringify(resultXML))
	},

	testPut: function() {
		var sut = new WebResource(this.plainTextFileURL);
		sut.put('test');
		this.assert(sut.status.isSuccess());
		this.assertEqual('test', sut.content);
		this.assertEqual('test', sut.get().content);
	},

	testDel: function() {
		var sut = new WebResource(this.plainTextFileURL);
		sut.del();
		this.assert(sut.status.isSuccess());
		this.assert(!sut.get().isExisting);
	},

	testSubElements: function() {
		var subDir = new WebResource(this.dir.getURL().withFilename('foo/'));
		subDir.create();
		this.dir.getSubElements();
		this.assertEquals(1, this.dir.subCollections.length);
		this.assertEquals(2, this.dir.subDocuments.length);
	},

	testExists: function() {
		var sut = new WebResource(this.plainTextFileURL);
		sut.get();
		this.assert(sut.status.isSuccess());
		this.assert(sut.isExisting);
		this.assert(sut.exists());

		sut = new WebResource(this.plainTextFileURL + 'abc');
		this.assert(!sut.exists());
	},

	testCopy: function() {
		var url2 = this.plainTextFileURL.withFilename('copiedFile.txt');
		var sut = new WebResource(this.plainTextFileURL);
		var other = sut.copyTo(url2);
		this.assert(sut.status.isSuccess());
		this.assert(other.status.isSuccess());
		this.assert(other.exists());
		this.assertEquals(sut.get().content, other.get().content);
	},

	testGetVersions: function() {
		var sut = new WebResource(this.plainTextFileURL);
		sut.getVersions();
		this.assert(sut.headRevision);
		this.assertEqual(1, sut.versions.length);
	},
	
	testGetWithVersion: function() {
		this.writeFile(this.plainTextFileURL, 'new version of file');
		var sut = new WebResource(this.plainTextFileURL);
		var versions = sut.getVersions().versions;
		this.assertEqual(2, versions.length);
		var rev = versions[0].rev;
		this.assert(this.plainTextString, sut.get(rev).content);
	},
	
	testGetHeadRevision: function() {
		var sut = new WebResource(this.plainTextFileURL);
		var rev1 = sut.getHeadRevision().headRevision;
		sut.put('new version of file');
		var rev2 = sut.getHeadRevision().headRevision;
		this.assert(rev1< rev2);
	},



});

// deprecated
TestCase.subclass('Tests.LKWikiTest.FileDirectoryTest', {
    
    shouldRun: false,
    
    setUp: function() {
        this.url = URL.source.getDirectory();
        this.sut = new FileDirectory(this.url);
        this.aFileName = 'newFile';
        this.dirname = 'testdir/';
        this.assert(!this.sut.fileOrDirectoryExists(this.aFileName), 'failure in setup, dummy file exists');
        this.assert(!this.sut.fileOrDirectoryExists(this.dirname), 'failure in setup, dummy dir exists');
    },
    
    tearDown: function() {
        if (this.sut.fileOrDirectoryExists(this.aFileName))
            this.sut.deleteFileNamed(this.aFileName);
        if (this.sut.fileOrDirectoryExists(this.dirname))
            this.sut.deleteFileNamed(this.dirname);
    },
    
    testDeleteFile: function() {
        this.sut.writeFileNamed(this.aFileName, '');
        this.assert(this.sut.fileOrDirectoryExists(this.aFileName), 'could not create file');
        this.sut.deleteFileNamed(this.aFileName);
        this.assert(!this.sut.fileOrDirectoryExists(this.aFileName), 'Could not delete file');
    },
    
    testDeleteDirectory: function() {
        this.assert(this.sut.createDirectory(this.dirname), 'failure when creating directory');
        this.sut.deleteFileNamed(this.dirname);
        this.assert(!this.sut.fileOrDirectoryExists(this.dirname), 'failure deleting directory');
    },
    
    testGetFileContent: function() {
        this.assert(this.sut.fileContent('index.xhtml').match(/.*<title>Sun Labs Lively Kernel<\/title>.*/),
            'false or no content');
    },
    
    testReadFiles: function() {
        this.assert(this.sut.files(), 'no files read');
        this.assert(this.sut.filenames().include('index.xhtml'), 'could not find index.xhtml');
        this.assert(!this.sut.filenames().any(function (ea) { return ea.endsWith('/') }), 'non files recognized as files');
        this.assert(this.sut.fileOrDirectoryExists('index.xhtml'), 'fileOrDirectoryExists failed?');
    },
    
    testReadSubdirectories: function() {
        this.assert(this.sut.subdirectories().first().toString() != this.url.toString(), 'first is this.url');
        this.assert(this.sut.subdirectoryNames().all(function(ea) { return ea.endsWith('/') }), 'strange urls');
    },
    
    testCreateNewFile: function() {
        var content = 'content';
        this.assert(!this.sut.fileOrDirectoryExists(this.aFileName), 'file does already exist');
        this.sut.writeFileNamed(this.aFileName, content);
        this.assert(this.sut.fileOrDirectoryExists(this.aFileName), 'no file created');
    },
    
    testOverwriteExistingFile: function() {
        var content = 'content';
        this.sut.writeFileNamed(this.aFileName, 'blabla');
        this.assert(this.sut.fileOrDirectoryExists(this.aFileName), 'could not create file');
        this.sut.writeFileNamed(this.aFileName, content);
        this.assertEqual(this.sut.fileContent(this.aFileName), content);
    },
    
    testCreateDirectory: function() {
        this.assert(!this.sut.fileOrDirectoryExists(this.dirname), 'directory already exists');
        this.assert(this.sut.createDirectory(this.dirname), 'failure when creating directory');
     //   this.assert(this.sut.fileOrDirectoryExists(dirname), 'directory does not exists');
    },
    
    testCopyFile: function() {
        var anotherFilename = 'anotherName';
        var content = 'istDasSchoen!';
        this.sut.writeFileNamed(anotherFilename, content);
        this.sut.copyFile(this.url.withFilename(anotherFilename), this.url.withFilename(this.aFileName));
        this.sut.deleteFileNamed(anotherFilename);
        this.assert(this.sut.fileOrDirectoryExists(this.aFileName), 'could not copy');
        this.assertEqual(this.sut.fileContent(this.aFileName), content, 'could not copy content');
    },
    
    testCopyAllFiles: function() {
        var test = this;
        var filenames = ['a', 'b', 'c'];
        var toUrl = new URL ('http://to/url.com/bla');
        var copiedFiles = [];
        this.sut.filenames = function() { return filenames };
        this.sut.copyFileNamed = function(srcFileName, rev, destUrl, optNewFileName) {
            test.assertEqual(destUrl, toUrl, 'Wrong destUrl');
            test.assert(!optNewFileName || optNewFileName == srcFileName, 'problem with filename');
            copiedFiles.push(srcFileName);
        };
        this.sut.copyAllFiles(toUrl);
        this.assertIncludesAll(copiedFiles, filenames);
    },
    
    testCopySubdirIfOtherDirExists: function() {
        var test = this;
        var subDirName = 'a/';
        var toUrl = new URL ('http://to/url.com/bla');
        var toFileDir = new FileDirectory(toUrl);
        
        this.sut.subdirectoryNames = function() {return [subDirName]};
        var existsCalled = false;
        toFileDir.fileOrDirectoryExists = function(localName) {
            test.assertEqual(localName, subDirName, 'foreign test localName');
            existsCalled = true;
            return true;
        };
        
        this.sut.copySubdirectory(subDirName, null,toFileDir);
        
        this.assert(existsCalled, 'foreignExistsCalled');
    },
    
    testCopySubdirRecursively: function() {
        var test = this;
        var subDirName = 'a/';
        var toUrl = new URL ('http://to/url.com/bla');
        var toFileDir = new FileDirectory(toUrl);
        
        this.sut.subdirectoryNames = function() {return [subDirName]};
        toFileDir.fileOrDirectoryExists = Functions.True;
        
        this.sut.copySubdirectory(subDirName, null, toFileDir, true);
    },
    
    testCopySubdirIfOtherDirNotExists: function() {
        var test = this;
        var subDirName = 'a/';
        var toUrl = new URL ('http://to/url.com/bla');
        var toFileDir = new FileDirectory(toUrl);
        
        this.sut.subdirectoryNames = function() {return [subDirName]};
        toFileDir.fileOrDirectoryExists = Functions.False;
        var createDirCalled = false;
        toFileDir.createDirectory = function(local) {
            test.assertEqual(local, subDirName, 'wrong dir created');
            createDirCalled = true;
        }
        this.sut.copySubdirectory(subDirName, null, toFileDir, false);
        
        this.assert(createDirCalled, 'createDirCalled not');
    },
    
});
	
});