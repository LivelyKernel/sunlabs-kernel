function readAllLines(stream) {
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
    var content = readAllLines(str).join('\n');
    try {
	return eval(content);
    } finally { 
	str.close();
    }
}

load('trunk/source/server/lib.js');
