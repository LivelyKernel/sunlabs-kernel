var window = this;

load('../kernel/rhino-compat.js');

// from http://www.jsresources.org/examples/SynthNote.java.html
function midiDemo(/**/) {
    var MidiSystem =  Packages.javax.sound.midi.MidiSystem;
    var Synthesizer = Packages.javax.sound.midi.Synthesizer;
    var MidiChannel = Packages.javax.sound.midi.MidiChannel;

    var nChannelNumber = 0;
    var	nNoteNumber = 0;	// MIDI key number
    var	nVelocity = 0;
    
    /*
     *	Time between note on and note off event in
     *	milliseconds. Note that on most systems, the
		 *	best resolution you can expect are 10 ms.
		 */
    var	nDuration = 0;
    var nNoteNumberArgIndex = 0;
    switch (arguments.length) {
    case 4:
	nChannelNumber = arguments[0] - 1;
	nChannelNumber = Math.min(15, Math.max(0, nChannelNumber));
	nNoteNumberArgIndex = 1;
	// FALL THROUGH
	
    case 3:
	nNoteNumber = arguments[nNoteNumberArgIndex];
	nNoteNumber = Math.min(127, Math.max(0, nNoteNumber));
	nVelocity = arguments[nNoteNumberArgIndex + 1];
	nVelocity = Math.min(127, Math.max(0, nVelocity));
	nDuration = arguments[nNoteNumberArgIndex + 2];
	nDuration = Math.max(0, nDuration);
	break;
	
    default:
	console.log('args: ([<channel>], <note_number>, <velocity>, <duration>)');
	return;
    }
    
    /*
     *	We need a synthesizer to play the note on.
     *	Here, we simply request the default
     *	synthesizer.
     */
    var synth = MidiSystem.getSynthesizer();
    synth.open();
    try {
	var channels = synth.getChannels();
	var channel = channels[nChannelNumber];
	channel.noteOn(nNoteNumber, nVelocity);
	/*
        *	Wait for the specified amount of time
        *	(the duration of the note).
       */
	java.lang.Thread.sleep(nDuration);
	//Turn the note off.
	channel.noteOff(nNoteNumber);
	// Close the synthesizer.
    } finally {
	synth.close();
    }

}


    midiDemo(2, 42, 120, 1000)
    midiDemo(2, 43, 120, 1000)
    midiDemo(2, 46, 120, 1000)
    midiDemo(2, 45, 120, 1000)
    java.lang.System.exit(0);