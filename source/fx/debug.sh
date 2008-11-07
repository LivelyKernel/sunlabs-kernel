#!/bin/sh
lib=../../lib
exec java -classpath $lib/Scenario.jar:$lib/js-debug.jar org.mozilla.javascript.tools.debugger.Main $*
