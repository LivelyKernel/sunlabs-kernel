#!/bin/sh
lib=../../lib
#exec /usr/local/soylatte/bin/java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#exec java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
fxlib=/Library/Frameworks/JavaFX.framework/Versions/1.1/lib
exec java -classpath $lib/Scenario.jar:$lib/js.jar:$lib/javafxrt.jar:$lib/javafxgui.jar:$lib/jline.jar jline.ConsoleRunner org.mozilla.javascript.tools.shell.Main $*
