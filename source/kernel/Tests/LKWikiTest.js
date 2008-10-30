function createPropfindResponse(filename, partOfRepoUrl, revisionNumber) {
	/* e.g. fileName = 'abc', partOfRepoUrl = '/testsvn/repo1/' revisionNumber = 74 */
	var xmlString = '<?xml version="1.0" encoding="utf-8"?>' +
		'<D:multistatus xmlns:D="DAV:">' +
		'<D:response xmlns:S="http://subversion.tigris.org/xmlns/svn/" ' + 
		 	'xmlns:C="http://subversion.tigris.org/xmlns/custom/" ' +
			' xmlns:V="http://subversion.tigris.org/xmlns/dav/" ' + 
			'xmlns:lp1="DAV:" xmlns:lp3="http://subversion.tigris.org/xmlns/dav/" ' + 
			'xmlns:lp2="http://apache.org/dav/props/">' +
		'<D:href>'+ partOfRepoUrl + filename + '</D:href>' + 
		'<D:propstat>' + '<D:prop>' + '<lp1:resourcetype/>' +
		'<lp1:getcontentlength>11</lp1:getcontentlength>' +
		'<lp1:getcontenttype>text/xml; charset="utf-8"</lp1:getcontenttype>' +
		'<lp1:getetag>"' + revisionNumber + '//' + filename + '"</lp1:getetag>' +
		'<lp1:creationdate>2008-08-12T17:55:30.184069Z</lp1:creationdate>' +
		'<lp1:getlastmodified>Wed, 12 Aug 2008 17:55:30 GMT</lp1:getlastmodified>' +
		'<lp1:checked-in><D:href>' + partOfRepoUrl + '!svn/ver/' + revisionNumber + '/' + filename + '</D:href></lp1:checked-in>' +
		'<lp1:version-controlled-configuration><D:href>' + partOfRepoUrl + '!svn/vcc/default</D:href></lp1:version-controlled-configuration>' +
		'<lp1:version-name>' + revisionNumber + '</lp1:version-name>' +
		'<lp1:auto-version>DAV:checkout-checkin</lp1:auto-version>' +
		'<lp3:baseline-relative-path>' + filename + '</lp3:baseline-relative-path>' +
		'<lp3:md5-checksum>96c15c2bb2921193bf290df8cd85e2ba</lp3:md5-checksum>' +
		'<lp3:repository-uuid>356c892c-17b4-4da3-8f97-36f2baa338bc</lp3:repository-uuid>' +
		'<lp3:deadprop-count>0</lp3:deadprop-count>' +
		'<D:supportedlock>' + '<D:lockentry>' +
		'<D:lockscope><D:exclusive/></D:lockscope>' + '<D:locktype><D:write/></D:locktype>' +
		'</D:lockentry>' + '</D:supportedlock>' + '<D:lockdiscovery/>' +
		'</D:prop>' + '<D:status>HTTP/1.1 200 OK</D:status>' + '</D:propstat>' +
		'</D:response>' + '</D:multistatus>';
	return new DOMParser().parseFromString(xmlString, "text/xml")
};

function createReportResponse() {
	var xmlString = '<?xml version="1.0" encoding="utf-8"?>' +
		'<S:log-report xmlns:S="svn:" xmlns:D="DAV:">' +
		'<S:log-item>' +
			'<D:version-name>75</D:version-name>' +
			'<D:comment>Autoversioning commit:  a non-deltaV client made a change to /abc</D:comment>' +
			'<S:revprop name="svn:autoversioned">*</S:revprop>' +
			'<S:date>2008-08-08T23:03:01.342813Z</S:date>' +
		'</S:log-item>' +
		'<S:log-item>' +
			'<D:version-name>18</D:version-name>' +
			'<D:comment></D:comment>' +
			'<S:date>2008-08-08T22:37:07.441511Z</S:date>' +
		'</S:log-item>' +
	'</S:log-report>';
	return new DOMParser().parseFromString(xmlString, "text/xml")
};

TestCase.subclass('SVNResourceTest', {
	
	setUp: function() {
		/* Mock the NetRequest: save NetRequest */
		this.oldNetRequest = NetRequest;
		/* Create the mock */
		NetRequest.subclass('MockNetRequest', {
			onReadyStateChange: function() {
				this.setModelValue('setStatus', this.getStatus());
				this.setModelValue('setResponseText', this.getResponseText());
				this.setModelValue('setResponseXML', this.getResponseXML());
			},
			request: function(method, url, content) {
			    return this;
			}
		});
		/* Replace the original NetRequest with the Mock*/
		NetRequest = MockNetRequest;
		
		var wikiUrl = URL.proxy.toString() + 'wiki';
		var completeUrl = wikiUrl + '/directory/file123';
		this.svnResource = new SVNResource(wikiUrl,
		        Record.newPlainInstance({URL: completeUrl, HeadRevision: null, ContentText: null, Metadata: null}));
	},
	
	testGetLocalUrl: function() {
		var localUrl = 'local';
		var wikiUrl = 'http://path/to/svn/repo';
		this.svnResource = new SVNResource(wikiUrl, Record.newPlainInstance({URL: wikiUrl + '/' + localUrl}));
		var result = this.svnResource.getLocalUrl();
		this.assertEqual(result, localUrl);
	},
	
	testFetchHeadRevision: function() {
		var rev = 29;
		var wasRequested = false;
		var test = this;
		MockNetRequest.prototype.request = function(method, url, content) {
			test.assertEqual(method, 'PROPFIND');
			test.assertEqual(url, test.svnResource.getURL());
			wasRequested = true;
			this.onReadyStateChange();
			return this;
		};
		MockNetRequest.prototype.getResponseXML = function() {
			return createPropfindResponse(test.svnResource.getLocalUrl(), '/change/me!/', rev);
		};
		
		this.svnResource.fetchHeadRevision();
		
		this.assert(wasRequested, 'request() should be called');
		this.assertEqual(rev, this.svnResource.getHeadRevision());
	},
	
	testFetchFileContent: function() {
		var rev = 29;
		var wasRequested = false;
		var expectedContent = 'someContent';
		var correctRequestUrl = this.svnResource.repoUrl + '/!svn/bc/' + rev + '/' + this.svnResource.getLocalUrl();
		var test = this;
		MockNetRequest.prototype.request = function(method, url, content) {
			test.assertEqual(method, 'GET');
			test.assertEqual(url, correctRequestUrl);
			wasRequested = true;
			this.onReadyStateChange();
			return this;
		};
		MockNetRequest.prototype.getResponseText = function() {
			return expectedContent;
		};
		
		this.svnResource.fetch(true, null, rev);
		
		this.assert(wasRequested, 'request() should be called');
		this.assertEqual(expectedContent, this.svnResource.getContentText());
	},
	
	testFetchMetadata: function() {
		var startRev = 76;
		var wasRequested = false;
		var expectedRequestContent = '<S:log-report xmlns:S="svn:">' + 
	    	'<S:start-revision>' + startRev + '</S:start-revision>' + '<S:end-revision>0</S:end-revision>' +
			'<S:all-revprops/>' + '<S:path/>' + '</S:log-report>';
		var expectedData = [{rev: 75, date: new Date(2008, 8, 8, 23, 3, 1), author: '(no author)'},
							{rev: 18, date: new Date(2008, 8, 8, 22, 37, 7), author: '(no author)'}];
		var test = this;
		MockNetRequest.prototype.request = function(method, url, content) {
			test.assertEqual(method, 'REPORT');
			test.assertEqual(url, test.svnResource.getURL());
			test.assertEqual(content, expectedRequestContent);
			wasRequested = true;
			this.onReadyStateChange();
			return this;
		};
		MockNetRequest.prototype.getResponseXML = function() {
			console.log('MockNetRequest.getResponseXML() called');
			return createReportResponse();
		};
		
		this.svnResource.fetchMetadata(true, null, startRev);
		this.assert(wasRequested, 'request() should be called');
		this.assertEqualState(expectedData, this.svnResource.getMetadata(), 'Metadata is not correct');
	},
	
    // testListDirectory: function() {
    //     var theUrl = 'http://localhost/livelyBranch/proxy/wiki/test/';
    //     this.svnResource = new SVNResource('http://localhost/livelyBranch/proxy/wiki',
    //          Record.newPlainInstance({URL: theUrl, ContentText: null}));
    //     var contentText = '<html><head><title>repo1 - Revision 268: /test</title></head>' + 
    //         '<body>' +
    //         '<h2>repo1 - Revision 268: /test</h2>' + 
    //         '<ul>'
    //           '<li><a href="../">..</a></li>' + 
    //           '<li><a href="a.js">Contributions.js</a></li>' +
    //           '<li><a href="abc.js">Core.js</a></li>' +
    //           '<li><a href="demo1.xhtml">demo1.xhtml</a></li>' +
    //           '<li><a href="folder1/">folder1/</a></li>' +
    //          '</ul>' +
    //          '<hr noshade><em>Powered by <a href="http://subversion.tigris.org/">Subversion</a> version 1.5.1 (r32289).</em>'
    //         '</body></html>';
    //  var expected = [url + 'a.js', url + 'abc.js', url + 'demo1.xhtml', url + 'folder1/'];
    //  MockNetRequest.prototype.request = function(method, url, content) {
    //      test.assertEqual(method, 'GET');
    //      test.assertEqual(theUrl, url);
    //      wasRequested = true;
    //      this.onReadyStateChange();
    //      return this;
    //  };
    //  MockNetRequest.prototype.getResponseText = function() {
    //      return contentText;
    //  };
    //  
    //  this.svnResource.fetch(true);
    //  this.assert(wasRequested, 'request() should be called');
    // },
	
	tearDown: function() {
		NetRequest = this.oldNetRequest;
	}
});

TestCase.subclass('SVNVersionInfoTest', {
    testParseUTCDate: function() {
        var sut = new SVNVersionInfo(0, '', null);
        var dateString = '2008-08-08T23:03:01.342813Z';
        var result = sut.parseUTCDateString(dateString);
        var expected = new Date(2008, 8, 8, 23, 3, 1);
        this.assertEqualState(expected, result, 'date parsing not correct');
    },
    
    testToString: function() {
        var sut = new SVNVersionInfo(75, '2008-08-08T23:03:01.342813Z', null);
        
        this.assertEqual(sut.toString(), '(no author), 23:03:01 GMT-0700 (PDT), Fri Aug 08 2008, Revision 75',
            'vers info toString failure');
        // see SVNVersionInfo.toString()
        // this.assert(sut.toString().orig === sut, 'vers info string has not pointer to original');
    }
});

TestCase.subclass('WikiNavigatorTest', {
    	
    testIsActiveForWikiUrls: function() {
        var nav = new WikiNavigator('http://localhost/lively/proxy/wiki/test.xhtml');
        this.assert(nav.isActive(), 'Navigator did not recognize wiki url');
        var nav = new WikiNavigator('http://localhost/lively/index.xhtml');
        this.assert(!nav.isActive(), 'Navigator did not recognize non-wiki url');
    },
    
    testRecognizeAndModifiesBaselineURIs: function() {
        var url1 = 'http://localhost/lively/proxy/wiki/test.xhtml';
        var nav = new WikiNavigator(url1);
        this.assertEqual(nav.model.getURL(), url1, "Modified url1");
        
        var url2 = 'http://localhost/livelyBranch/proxy/wiki/!svn/bc/187/test/index.xhtml';
        var expectedUrl2 = 'http://localhost/livelyBranch/proxy/wiki/test/index.xhtml';
        nav = new WikiNavigator(url2);
        this.assertEqual(nav.model.getURL(), expectedUrl2, "Could not modify url2");
    },
     
    // Tests are doing real stuff and work only when current url is correct
    // (something like *proxy/wiki/*xhtml)
    setUp: function() {
        //this.nav = new WikiNavigator(URL.source.toString());
        this.nav = new WikiNavigator('http://localhost/livelyBranch/proxy/wiki/test/blabla');
        WikiNavigator.current = this.nav;
    },
    
    // testFindVersions: function() {
    //     var wasCalled = false;
    //     this.nav.model.setVersions = this.nav.model.setVersions.wrap(function(proceed, list) {
    //         wasCalled = true;
    //         proceed(list); 
    //     });
    //     // execute
    //     this.nav.findVersions();
    //     this.assert(wasCalled, "setversions was not triggered");
    //     this.assert(this.nav.model.getVersions().length > 0, "cannot read versions from: " + this.nav.model.getURL());
    // },
    // 
    // testWikiWorldExists: function() {
    //     this.nav = new WikiNavigator('http://localhost/livelyBranch/proxy/wiki/abc');
    //     this.assert(this.nav.worldExists(), 'did not found abc');
    //     this.nav = new WikiNavigator('http://localhost/livelyBranch/proxy/wiki/IdoNOTexists');
    //     this.assert(!this.nav.worldExists(), 'notified false existence');
    // }
});

TestCase.subclass('FileDirectoryTest', {
    
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
        this.sut.copyFileNamed = function(srcFileName, destUrl, optNewFileName) {
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
        debugger;
        this.sut.copySubdirectory(subDirName, null, toFileDir, false);
        
        this.assert(createDirCalled, 'createDirCalled not');
    },
    
});


function exampleSVNResource() {
	var repoUrl = URL.proxy.toString() + 'wiki';
	var url = repoUrl + '/abc';
	var res = new SVNResource(repoUrl, Record.newPlainInstance({URL: url}));
	res.store('this is new content which was written from exampleSVNResource()');
	res.fetchHeadRevision();
	res.fetchMetadata();
	res.fetch();
	exampleResource = res;
};

//exampleSVNResource();

function printExampleSVNResource() {
	console.log(exampleResource.getModelValue('getHeadRevision'));
	console.log(exampleResource.getModelValue('getContentText'));
	var metadata = exampleResource.getModelValue('getMetadata');
	console.log((metadata[0]).rev);
	console.log((metadata[0]).date);
	$A(metadata).each(function(ea) {
		console.log(ea.rev + '    ' + ea.date);
	});
};

function endlessLoop() {
	var endLoop = false;
	Global.setTimeout(function() {endLoop = true}, 1);
	var i = 0;
	
	while (!endLoop) {
		i += 1;
		console.log(i);
	};
	
};