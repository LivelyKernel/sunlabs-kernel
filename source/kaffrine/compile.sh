#!/bin/sh
fxlib=/Library/Frameworks/JavaFX.framework/Versions/Current/lib
rm -f ext/rhinoglue.jar
javac  -extdirs $fxlib/shared:ext org/mozilla/javascript/*.java
files=`find org -name '*.class' -print`

jar cvf ext/rhinoglue.jar $files
