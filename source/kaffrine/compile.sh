#!/bin/sh
fxlib=/Library/Frameworks/JavaFX.framework/Versions/Current/lib
javac   -classpath ../../lib/js.jar:/Library/Frameworks/JavaFX.framework/Versions/Current/lib/shared/javafxrt.jar:. org/mozilla/javascript/*.java
