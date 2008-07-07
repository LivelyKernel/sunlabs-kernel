window = this;
load('../kernel/miniprototype.js');

function parseProps(props, line) {
    var parts = line.match("([^:]*):(.*)");
    if (!parts) {
	//print('empty line'); 
	return null;
    }
    // print('processing prop ' + parts[1]);
    props[parts[1]] = parts[2];
}

function spawn(command) {
    var proc = java.lang.Runtime.getRuntime().exec(command);
    var bin = new Packages.java.io.BufferedReader(new Packages.java.io.InputStreamReader(proc.getInputStream()));
    var berr = new Packages.java.io.BufferedReader(new Packages.java.io.InputStreamReader(proc.getErrorStream()));
    var line;
    var lines = [];
    
    while((line = bin.readLine()) != null) {
	lines.push(line);
    }
    
    var errs = [];
    while((line = berr.readLine()) != null) {
	errs.push(line);
    }


    proc.waitFor();
    return {stdout: lines, stderr: errs, exitValue: proc.exitValue()};
}
