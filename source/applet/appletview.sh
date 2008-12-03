#!/bin/sh
exec appletviewer -J-Djava.security.policy=./java.policy.applet $*
