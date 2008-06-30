#!/usr/bin/env java -jar ../../lib/js.jar
// beginnings of serverside svn

print("Content-Type: text/plain\n\n");

window = this;
load('../kernel/miniprototype.js');

var query  = String(java.lang.System.getenv().get("QUERY_STRING")).toQueryParams();
print('query: ' + Object.keys(query));

var command = ["svn", query["command"]];

function spawn(command) {
    var proc = java.lang.Runtime.getRuntime().exec(command);
    var bin = new Packages.java.io.BufferedReader(new Packages.java.io.InputStreamReader(proc.getInputStream()));
    var line;
    var lines = [];
    
    while((line = bin.readLine()) != null) {
	lines.push(line);
    }
    return lines;
}
if (query["command"] == "commit") {
    print("commit");
}

var output = spawn(command);

function parseProps(props, line) {
    var parts = line.match("([^:]*):(.*)");
    if (!parts) {
	//print('empty line'); 
	return null;
    }
    // print('processing prop ' + parts[1]);
    props[parts[1]] = parts[2];
}

print('command ' + command.join(' ') + ' says:');

print(output.join("\n"));
