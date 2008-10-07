#!/bin/sh
lib=../../lib
exec java -classpath $lib/Scenario-0.6.jar:$lib/js.jar org.mozilla.javascript.tools.shell.Main $*
