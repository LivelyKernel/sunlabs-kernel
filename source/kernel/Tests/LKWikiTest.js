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
		this.svnResource = new SVNResource(wikiUrl, completeUrl);
	},
	
	testGetLocalUrl: function() {
		var localUrl = 'local';
		var wikiUrl = 'http://path/to/svn/repo';
		this.svnResource = new SVNResource(wikiUrl, wikiUrl + '/' + localUrl);
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
		this.assertEqual(rev, this.svnResource.getModelValue('getHeadRevision'));
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
		this.assertEqual(expectedContent, this.svnResource.getModelValue('getContentText'));
	},
	
	testFetchMetadata: function() {
		var startRev = 76;
		var wasRequested = false;
		var expectedRequestContent = '<S:log-report xmlns:S="svn:">' + 
	    	'<S:start-revision>' + startRev + '</S:start-revision>' + '<S:end-revision>0</S:end-revision>' +
			'<S:all-revprops/>' + '<S:path/>' + '</S:log-report>';
		var expectedData = [{rev: 75, date: '2008-08-08T23:03:01.342813Z'},
							{rev: 18, date: '2008-08-08T22:37:07.441511Z'}];
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
		this.assertEqualState(expectedData, this.svnResource.getModelValue('getMetadata'),
			'Metadata is not correct');
	},
	
	tearDown: function() {
		NetRequest = this.oldNetRequest;
	}
});

function exampleSVNResource() {
	var repoUrl = URL.proxy.toString() + 'wiki';
	var url = repoUrl + '/abc';
	var res = new SVNResource(repoUrl, url);
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