module('lively.Tests.FabrikExtensionsTest').requires('lively.TestFramework', 'lively.Tests.SerializationTests', 'lively.Fabrik', 'lively.FabrikExtensions').toRun(function(ownModule) {

TestCase.subclass('Alively.Tests.FabrikExtensionTest', {
	
	testTokyoDate: function() {
		var time = new Date();
		var hours = time.getUTCHours();
		var tokyoHours;
		withLayers([TokyoTimeLayer], function() {
			tokyoHours = time.getUTCHours();
		});
		this.assertEqual(tokyoHours, hours + 7, "TokyoTimeLayer is broken");

	}
});


});
