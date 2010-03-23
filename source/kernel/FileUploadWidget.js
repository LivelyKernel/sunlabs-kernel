
module("lively.FileUploadWidget").requires().toRun(function(){

/*  Basic upload manager for single or multiple files (Safari 4 Compatible)
 *	adapted from Andrea Giammarchi (webreflection.blogspot.com) original version (under MIT)
 */
Object.subclass("FileUploadHelper", {
	initialize: function() {
		this.uploadFileMaxSize = 1024000;
		this.prefix = ""
	},

	sendFile: function(handler){

		if(this.uploadFileMaxSize < handler.file.fileSize) {
			if(Object.isFunction(handler.onerror))
				handler.onerror();
			return;
		};

		var xhr = new XMLHttpRequest;
		var upload = xhr.upload;


		["onabort", "onerror", "onloadstart", "onprogress"].each(function(eachName){
			upload[eachName] = function(rpe){
				if(Object.isFunction(handler[eachName]))
					handler[eachName].call(handler, rpe, xhr);
			};
		})

		upload.onload = function(rpe){
			if(handler.onreadystatechange === false){
					if(Object.isFunction(handler.onload))
						handler.onload(rpe, xhr);
				} else {
					setTimeout(function(){
						if(xhr.readyState === 4){
							if(Object.isFunction(handler.onload))
								handler.onload(rpe, xhr);
						} else
							setTimeout(arguments.callee, 15);
				}, 15);
			}
		};
		xhr.open("PUT", this.urlForFileName(handler.file.fileName) , true);
		xhr.setRequestHeader("If-Modified-Since", "Mon, 26 Jul 1997 05:00:00 GMT");
		xhr.setRequestHeader("Cache-Control", "no-cache");
		xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		xhr.setRequestHeader("X-File-Name", handler.file.fileName);
		xhr.setRequestHeader("X-File-Size", handler.file.fileSize);
		xhr.setRequestHeader("Content-Type", "multipart/form-data");
		xhr.send(handler.file);
		return  handler;
	},

	// function to upload multiple files via handler
	sendMultipleFiles: function sendMultipleFiles(handler){
	    var length = handler.files.length;
	    var onload = handler.onload;

	    handler.current = 0;
	    handler.total = 0;
	    handler.sent = 0;

	    while(handler.current < length) {
	        handler.total += handler.files[handler.current++].fileSize;
		}
	    handler.current = 0;
		var self = this;
	    if (length) {
	        handler.file = handler.files[handler.current];
	        var singleHandler = this.sendFile(handler);			
			if (!singleHandler) {
				return
			}
			singleHandler.onload = function(rpe, xhr) {
	            if(++handler.current < length){
	                handler.sent += handler.files[handler.current - 1].fileSize;
	                handler.file = handler.files[handler.current];
	                self.sendFile(handler).onload = arguments.callee;
	            } else if(onload) {
	                handler.onload = onload;
	                handler.onload(rpe, xhr);
	            }
	        };
	    };
	    return  handler;
	},

	urlForFileName: function(file) {
		return this.prefix + file
	}
});

Morph.subclass('FileUploadMorph', {
	suppressHandles: true,

	initialize: function($super, bounds) {
		$super(new lively.scene.Rectangle(new Rectangle(100, 100, 420, 280)))

		this.xeno = new FileUploadXenoMorph(new Rectangle(10,10,400,25));
		this.addMorph(this.xeno);

		this.bar = new ProgressBarMorph(new Rectangle(10,43,400,20));
		this.bar.ignoreEvents();
		this.bar.setValue(0);
		this.addMorph(this.bar);

		this.result = new TextMorph(new Rectangle(10, 70, 400, 200));
		this.result.ignoreEvents();
		this.addMorph(this.result);

		this.applyStyle({fill: Color.blue.darker(2).lighter(1), borderRadius: 10});
		
		this.urlPrefix = "media/";
	}
})

XenoMorph.subclass("FileUploadXenoMorph", {

	initialize: function($super, bounds) {
		$super(bounds);
		this.setupHTMLContent();
	},


	handlesMouseDown: function() {return true},
	onMouseDown: function() {return false},
	onMouseMove: function() {return false},

	onDeserialize: function() {

		this.foRawNode.removeChild(this.foRawNode.childNodes[0])
		this.setupHTMLContent()
	},

	setupHTMLContent: function() {

		var input = document.createElement("input");
		input.setAttribute("type", "file");
		input.setAttribute("multiple", "multiple"); 

		this.foRawNode.appendChild(input);
		sub = this.foRawNode.appendChild(document.createElement("div")).appendChild(document.createElement("span"));
		bar = this.foRawNode.appendChild(document.createElement("div")).appendChild(document.createElement("span"));
		div = this.foRawNode.appendChild(document.createElement("pre"));

		var size = function(bytes){   // simple function to show a friendly size
                var i = 0;
                while(1023 < bytes){
                    bytes /= 1024;
                    ++i;
                };
                return  i ? bytes.toFixed(2) + ["", " Kb", " Mb", " Gb", " Tb"][i] : bytes + " bytes";
        };
		var self = this;

		input.addEventListener("change", function(){                
                // disable the input
                input.setAttribute("disabled", "true");
                

				var upload = new FileUploadHelper()				
				if (self.owner.urlPrefix)
					upload.prefix = self.owner.urlPrefix;

                upload.sendMultipleFiles({
                
                    // list of files to upload
                    files: input.files,
                    
                    // clear the container 
                    onloadstart:function(){
                    },
                    
                    // do something during upload ...
                    onprogress:function(rpe){
						self.owner.bar.setValue(rpe.loaded / rpe.total)
                        self.owner.result.setTextString([
                            "Uploading: " + this.file.fileName,
                            "Sent: " + size(rpe.loaded) + " of " + size(rpe.total),
                            "Total Sent: " + size(this.sent + rpe.loaded) + " of " + size(this.total)
                        ].join("\n"));
                    },
                    
                    // fired when last file has been uploaded
                    onload:function(rpe, xhr){
                        self.owner.result.setTextString( self.owner.result.textString + 
							" \n\nServer Response: " + xhr.responseText);                       
                        // enable the input again
                        input.removeAttribute("disabled");
                    },
                    
                    // if something is wrong ... (from native instance or because of size)
                    onerror:function(){
                        self.owner.result.setTextString( "The file " + this.file.fileName + " is too big [" + size(this.file.fileSize) + "]");
                        
                        // enable the input again
                        input.removeAttribute("disabled");
                    }
                });
    	}, false);
	},
})

FileUploadMorph.openSample = function() { 
	// Test Code
	if ($morph("FileUpload"))
		$morph("FileUpload").remove()

	fileUploadMorph =  new FileUploadMorph();
	fileUploadMorph.xeno
	fileUploadMorph.openInWorld();
	fileUploadMorph.name = "FileUpload"
}

})
