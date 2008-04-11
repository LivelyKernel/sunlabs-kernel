// just evaluate  (load) this file from  the file browser  to make the
// browser play the sound encoded in a data URI. Works in Safari 3.1.

(function() {
    var encodedClick = "UklGRkwCAABXQVZFZm10IBAAAAABAAEAIlYAACJWAAABAAgAZGF0YSgCAACAgICAgICAgICAgICA"
	+ "gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgH+AgICA"
	+"gICAgICAf4CAgICDh4qDd3h8f4aJgX2DioyCcWhufYmEe4KRkoR0a298ioyGgISKhnxzb3SBi4yG"
	+ "goOEgHdydn6GjIyGfXl5fICAf4GBgoOAfnx6eXyDiId/enuBhYOBgICCg4KAfn1/goOCgIB/fn5/"
	+ "gIGAfn+BgoKCgYB+fn+BgoKCgYCAgIGBgH+Bg4OCgH+AgYCAgIGAgICAgH9/f4CAgYGAgH9/gIGA"
	+ "gICBgYGBgYB/f4CBgYGAfn5/gIGAf3+AgYCAf3+AgYGAf3+AgICAgH+AgYGBf35/gYGBgYGBgYB/"
	+ "fn+BgoKBgH+AgYB+fX+Bg4OCgYB/f4CAgIGBgYGBgYB/f3+Af3+AgYKDgn99fX6AgoKBgICAgYB/"
	+ "f4CAgICAgICAf3+AgYGAgICAgIB/gICAgICAgIB/f3+AgYCAgICAgICBgYCAgICBgYB/f3+AgICA"
	+ "gYGAgH9/f3+AgYKBgYCAgICAgH9+f4GCgoGAf39/gICAgIGBgYCAf39/gIGBgYCAgIGBgH9/gICB"
	+ "gYGAgICAgYGAgICAgH9/gICBgYCAgH9/f4CAgICAgIGBgYB/fn+AgYKBgICAgIB/f4CBgYGAf35/"
	+ "f4CAgIGBgYCAgIB/f4CAgICAgICAgICAgIA=";

    var clickData = "data:audio/x-wav;base64," + encodedClick;
    var a = new Audio(clickData);
    a.play();
    console.log("played audio " + a.src);
})();