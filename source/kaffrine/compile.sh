#!/bin/sh
fxlib=/Library/Frameworks/JavaFX.framework/Versions/Current/lib
javac  -extdirs $fxlib/shared  -classpath ../../lib/js.jar:. org/mozilla/javascript/*.java
