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
	}
	
});
	
});