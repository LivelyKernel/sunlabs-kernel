#!/usr/bin/env java -jar ../../lib/js.jar
// beginnings of serverside svn

print("Content-Type: text/plain\n\n");

load("lib.js");

var query  = String(java.lang.System.getenv().get("QUERY_STRING")).toQueryParams();
print('query: ' + Object.keys(query));

var command = ["svn", query["command"]];

if (query["command"] == "commit") {
    print("commit");
}

var p = spawn(command);


print('command ' + command.join(' ') + ' says:');

if (p.exitValue !== 0)
    print(p.stderr.join("\n"));
else	
    print(p.stdout.join("\n"));

