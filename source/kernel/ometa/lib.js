/*
  Copyright (c) 2007, 2008 Alessandro Warth <awarth@cs.ucla.edu>

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation
  files (the "Software"), to deal in the Software without
  restriction, including without limitation the rights to use,
  copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following
  conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
  OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
  WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
  OTHER DEALINGS IN THE SOFTWARE.
*/

// try to use StringBuffer instead of string concatenation to improve performance

module('ometa/lib.js').requires().toRun(function() {
    
Global.StringBuffer = function StringBuffer() {
  this.strings = []
  for (var idx = 0; idx < arguments.length; idx++)
    this.nextPutAll(arguments[idx])
}
StringBuffer.prototype.nextPutAll = function(s) { this.strings.push(s) }
StringBuffer.prototype.contents   = function()  { return this.strings.join("") }
String.prototype.writeStream      = function() { return new StringBuffer(this) }

// make Arrays print themselves sensibly



Global.toOmetaString = function toOmetaString(array) { var ws = "".writeStream(); printOn(array,ws); return ws.contents() };
// Array.prototype.toOmetaString = function() { var ws = "".writeStream(); this.printOn(ws); return ws.contents() }

Global.printOn = function printOn(objOrArray, ws) {
    if (Object.isArray(objOrArray)) {
        ws.nextPutAll("[")
         for (var idx = 0; idx < objOrArray.length; idx++) {
           if (idx > 0)
             ws.nextPutAll(", ")
           printOn(objOrArray[idx], ws);
         }
         ws.nextPutAll("]")
    } else {
        ws.nextPutAll(objOrArray.toString())
    }
}
// Object.prototype.printOn = function(ws) { ws.nextPutAll(this.toString()) }
// Array.prototype.printOn = function(ws) {
//   ws.nextPutAll("[")
//   for (var idx = 0; idx < this.length; idx++) {
//     if (idx > 0)
//       ws.nextPutAll(", ")
//     this[idx].printOn(ws)
//   }
//   ws.nextPutAll("]")
// }

// delegation

Object.delegated = function(from, props) {
  var f = function() { }
  f.prototype = from // rk what's the reason for that?
  var r = new f()
  r.prototype = from // rk this makes sense .... 
  for (var p in props)
    if (props.hasOwnProperty(p))
      r[p] = props[p]
  return r
}

// some reflective stuff
Global.ownPropertyNames = function ownPropertyNames(obj) {
    var r = []
    for (name in obj)
      if (obj.hasOwnProperty(name))
        r.push(name)
    return r
}
// Object.prototype.ownPropertyNames = function() {
//   var r = []
//   for (name in this)
//     if (this.hasOwnProperty(name))
//       r.push(name)
//   return r
// }

Global.hasProperty = function hasProperty(obj, p) { { return obj[p] != undefined } }
// Object.prototype.hasProperty = function(p) { return this[p] != undefined }

Global.isNumber = function isNumber(obj)  { return Object.isNumber(obj) }
//Object.prototype.isNumber    = function() { return false }
//Number.prototype.isNumber    = function() { return true }

Global.isString = function isString(obj)  { return Object.isString(obj) }
//Object.prototype.isString    = function() { return false }
//String.prototype.isString    = function() { return true }

Global.isCharacter = function isCharacter(obj)  { return Object.isString(obj) && obj.length == 1 }
//Object.prototype.isCharacter = function() { return false }
//String.prototype.isCharacter = function() { return this.length == 1 }

Global.isSpace = function isSpace(obj)  { return isCharacter(obj) && obj.charCodeAt(0) <= 32   }
//String.prototype.isSpace     = function() { return this.isCharacter() && this.charCodeAt(0) <= 32   }
Global.isDigit = function isDigit(obj)  { return isCharacter(obj) && obj >= "0" && obj <= "9" }
//String.prototype.isDigit     = function() { return this.isCharacter() && this >= "0" && this <= "9" }
Global.isLower = function isLower(obj)  { return isCharacter(obj) && obj >= "a" && obj <= "z" }
//String.prototype.isLower     = function() { return this.isCharacter() && this >= "a" && this <= "z" }
Global.isUpper = function isUpper(obj)  { return isCharacter(obj) && obj >= "A" && obj <= "Z" }
//String.prototype.isUpper     = function() { return this.isCharacter() && this >= "A" && this <= "Z" }
  
Global.digitValue = function digitValue(obj)  { return Object.isString(obj) && obj.charCodeAt(0) - "0".charCodeAt(0) };
//String.prototype.digitValue  = function() { return this.charCodeAt(0) - "0".charCodeAt(0) }

// Why aren't these functions???
// Object.prototype.isSequenceable = false
// Array.prototype.isSequenceable  = true
// String.prototype.isSequenceable = true

// some functional programming stuff

// Array.prototype.map = function(f) {
//   var r = []
//   for (var idx = 0; idx < this.length; idx++)
//     r[idx] = f(this[idx])
//   return r
// }

// Array.prototype.reduce = function(f, z) {
//   var r = z
//   for (var idx = 0; idx < this.length; idx++)
//     r = f(r, this[idx])
//   return r
// }

// Array.prototype.delimWith = function(d) {
//   return this.reduce(
//     function(xs, x) {
//       if (xs.length > 0)
//         xs.push(d)
//       xs.push(x)
//       return xs
//     },
//    [])
// }

// Squeak's ReadStream, kind of

Global.ReadStream = function ReadStream(anArrayOrString) {
  this.src = anArrayOrString
  this.pos = 0
}
ReadStream.prototype.atEnd = function() { return this.pos >= this.src.length }
ReadStream.prototype.next  = function() { return this.src.at(this.pos++) }

// escape characters

escapeStringFor = new Object()
for (var c = 0; c < 256; c++)
  escapeStringFor[c] = String.fromCharCode(c)
escapeStringFor["\\".charCodeAt(0)] = "\\\\"
escapeStringFor['"'.charCodeAt(0)]  = '\\"'
escapeStringFor["'".charCodeAt(0)]  = "\\'"
escapeStringFor["\r".charCodeAt(0)] = "\\r"
escapeStringFor["\n".charCodeAt(0)] = "\\n"
escapeStringFor["\t".charCodeAt(0)] = "\\t"
Global.escapeChar = function escapeChar(c) {
  var charCode = c.charCodeAt(0)
  return charCode > 255 ? String.fromCharCode(charCode) : escapeStringFor[charCode]
}

Global.ometaUnescape = function ometaUnescape(s) {
  if (s[0] == '\\')
    switch (s[1]) {
      case '\\': return '\\'
      case 'r':  return '\r'
      case 'n':  return '\n'
      case 't':  return '\t'
      default:   return s[1]
    }
  else
    return s
}

String.prototype.toProgramString = function() {
  var ws = "\"".writeStream()
  for (var idx = 0; idx < this.length; idx++)
    ws.nextPutAll(escapeChar(this[idx]))
  ws.nextPutAll("\"")
  return ws.contents()
}

// C-style tempnam function

Global.tempnam = function tempnam(s) { return (s ? s : "_tmpnam_") + tempnam.n++ }
tempnam.n = 0

});