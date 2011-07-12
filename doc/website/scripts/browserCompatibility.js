function detectBrowser() {
	var nav = window.navigator;
  return {
		webKitVersion: (function() {
		  if (!nav) return 0;
		  var match = navigator.userAgent.match(/.*AppleWebKit\/(\d+).*/) 
		  return match ? parseInt(match[1]) : 0;
		})(),
		isMozilla: nav && nav.userAgent.indexOf("Mozilla") > -1,
		isChrome: nav && nav.userAgent.indexOf("Chrome") > -1,
		isOpera: nav && nav.userAgent.indexOf("Opera") > -1,
		isIE: nav && nav.userAgent.indexOf("MSIE") > -1,
		fireFoxVersion: nav && (nav.userAgent.split("Firefox/")[1] || nav.userAgent.split("Minefield/")[1])
  }
}

function createBrowserWarningOverlay(browser) {
	var overlay = document.createElement('div');
  overlay.setAttribute('class', 'overlay');
  overlay.innerHTML = '<div class="important">\
	<p style="margin: 10px"><span class="colored">Please note: </span> Lively runs best on Safari/Webkit or Chrome browsers. We detected that you are using ' + browser + '. You will be able to use Lively Kernel, however, <a class="external" href="./lively/index.html">bugs</a> regarding transformations,	gradients, and text events can appear. <p style="text-align: center">Lively will load in <span id="secDisplay"></span> seconds.</p></p>\
  </div>';
  document.getElementsByTagName('body')[0].appendChild(overlay);
}

function visitURLInSecs(url, secs) {
	var secDisplay = document.getElementById('secDisplay');
  (function countdownToLoad() {
		if (secs === 0) { document.location = url; return }
		if (secDisplay) secDisplay.textContent = String(secs);
		secs--;
		window.setTimeout(countdownToLoad, 1000);
  })();
}

function showBrowserWarningAndFollowLink(url) {
  try {
		var browserSpec = detectBrowser();
		if (browserSpec.isChrome || browserSpec.webKitVersion > 0) {
		  document.location = url;
		  return;
		}
  } catch(e) { }

  var browser = (function() {
		if (browserSpec.fireFoxVersion) return 'Firefox';
		if (browserSpec.isIE) return 'Internet Explorer';
		if (browserSpec.isOpera) return 'Opera';
		return 'another browser';
  })();

  createBrowserWarningOverlay(browser);
	visitURLInSecs(url, 5);

}