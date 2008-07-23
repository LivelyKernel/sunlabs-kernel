#!/bin/sh
project_root=../../..
#project_root=.
#js=../../lib/js.jar
#js=${project_root}/trunk/lib/js.jar
js=trunk/lib/js.jar

#brazil=../../lib/brazil-04-Mar-08.jar
#brazil=${project_root}/trunk/lib/brazil-04-Mar-08.jar
#brazil=trunk/lib/brazil-02-Jul-08.jar
brazil=trunk/lib/brazil-minimal.jar

cd $project_root
#echo pwd is `pwd`
#exec java -classpath ${js}:${brazil} sunlabs.brazil.server.Main  -c $project_root/trunk/source/server/brazil.config
exec java -classpath ${js}:${brazil} sunlabs.brazil.server.Main  -c trunk/source/server/brazil.config
