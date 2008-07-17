// small library of serverside code, currently dependent on rhino

function readAll(stream) {
    var bin = new Packages.java.io.BufferedReader(new Packages.java.io.InputStreamReader(stream));
    lines = [];
    var line;
    while((line = bin.readLine()) != null) {
	lines.push(line);
    }
    return lines;
}

function load(filename) {
    var str = new Packages.java.io.FileInputStream(filename);
    var content = readAll(str).join('\n');
    return eval(content);
}

var window = this;
load('trunk/source/kernel/miniprototype.js');
load('trunk/source/kernel/JSON.js');

function spawn(command) {
    var proc = java.lang.Runtime.getRuntime().exec(command);
    var stdout = readAll(proc.getInputStream());
    proc.getInputStream().close();
    var stderr = readAll(proc.getErrorStream());
    proc.getErrorStream().close();

    proc.waitFor();
    return {stdout: stdout, stderr: stderr, code: proc.exitValue()};
}


function proplistToObject(props) {
    var result = {};
    for (var e = props.keys(); e.hasMoreElements(); ) {
	var key = e.nextElement();
	result[key] = props.getProperty(key);
    }
    return result;
}

function prettyPrintProplist(props) {
    var obj = proplistToObject(props);
    return Object.keys(obj).map(function(key) { return key + ":" + obj[key]; }).join("<br>");
}


function parseProps(props, line) {
    var parts = line.match("([^:]*):(.*)");
    if (!parts) {
	//print('empty line'); 
	return null;
    }
    // print('processing prop ' + parts[1]);
    props[parts[1]] = parts[2];
}

