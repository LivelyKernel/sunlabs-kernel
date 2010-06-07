module('Tests.PageNavigationTest').requires('apps.PageNavigation', 'lively.TestFramework').toRun(function() {

TestCase.subclass("Tests.PageNavigationTest.Test1", {
	setUp: function() {
		this.sut = new PageNavigation(
			URL.codeBase.withRelativePartsResolved(),
			[
				"introduction/title.xhtml",
				"introduction/contents.xhtml",
				"introduction/template.xhtml",
			]);
	},

	testPageName: function() {
		this.assertEqual(this.sut.pageName(),  "introduction/template.xhtml")
	},

	testPageIndex: function() {
		this.assertEqual(this.sut.pageIndex(), 2)
	}
});

	
});