#!/bin/sh
lib=../../lib
fxlib=/Library/Frameworks/JavaFX.framework/Versions/Current/lib

exec java -javaagent:rhinifier.jar -Djava.ext.dirs=$fxlib/shared:$fxlib/desktop:ext  jline.ConsoleRunner com.sun.javafx.runtime.Main org.mozilla.javascript.tools.shell.Main $*



#exec /usr/local/soylatte/bin/java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#exec java -classpath $lib/Scenario-0.6.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#exec java -Djava.ext.dirs=$fxlib/shared:$fxlib/desktop -classpath $lib/js.jar:$lib/jline.jar:. jline.ConsoleRunner Spawn $*

#exec java -classpath $lib/javafxrt.jar:$lib/Scenario.jar:$lib/javafxgui.jar:$lib/js.jar:$lib/jline.jar:. jline.ConsoleRunner org.mozilla.javascript.tools.shell.Main $*
