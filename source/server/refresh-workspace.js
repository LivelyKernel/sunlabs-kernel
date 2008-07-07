#!/usr/bin/env java -jar ../../lib/js.jar
// beginnings of serverside svn

print("Content-Type: text/plain\n\n");


load("lib.js");


var command = ["svn", "update", "../.."];
var p = spawn(command);

print("running " + command);
print("exit value " + p.exitValue);
if (p.exitValue !== 0)
    print(p.stderr.join("\n"));
else	
    print(p.stdout.join("\n"));
