#!/bin/sh
lib=../../lib
#exec /usr/local/soylatte/bin/java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#exec java -classpath $lib/Scenario-0.6.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
fxlib=/Library/Frameworks/JavaFX.framework/Versions/Current/lib
exec java -classpath $fxlib/desktop/Scenario.jar:$lib/js.jar:$fxlib/shared/javafxrt.jar:$fxlib/desktop/javafxgui.jar:$lib/jline.jar org.mozilla.javascript.tools.shell.Main $*
