#!/bin/sh
lib=../../lib
#exec /usr/local/soylatte/bin/java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
#exec java -classpath $lib/Scenario-0.6.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
exec java -classpath $lib/Scenario.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
