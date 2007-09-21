/*
 * Copyright © 2006-2007 Sun Microsystems, Inc.
 * All rights reserved.  Use is subject to license terms.
 * This distribution may include materials developed by third parties.
 *  
 * Sun, Sun Microsystems, the Sun logo, Java and JavaScript are trademarks
 * or registered trademarks of Sun Microsystems, Inc. in the U.S. and
 * other countries.
 */ 

/**
 * defaultconfig.js.  System default configuration.
 */

// Allows easy object duplication using the Shift key
Config.shiftDragForDup = true;

// New scheduler is the default now
Config.useNewScheduler = true;

// URL that acts as a proxy for network operations 
// Config.proxyURL = 'http://www.hanaalliance.org/jsl/proxy/';

// Quickly enabling/disabling most demos
Config.skipMostExamples = false;
Config.skipAllExamples = Config.skipMostExamples && false;
Config.showWebStore = false;

// Additional demo configuration options 
Config.loadFromMarkup = false;
Config.showThumbnail = false;

// Enables/disables network-dependent demos
Config.showNetworkExamples = true;

