// TODO the following should done by an HTML parser. For now, we're hard
// coding the structure of the SimpleObjects.xhtml document of the Lively Kernel.
window.document = (function() {
  var XHTMLNS = 'http://www.w3.org/1999/xhtml';
  var SVGNS   = 'http://www.w3.org/2000/svg';

  var document = new HTMLDocument; 
  // TODO baseURI is actually part of dom level 3 core, and is defined
  // for all Nodes (and is complicated to implement).
  // TODO baseURI here should be 'file:///...xhtml' */
    document.baseURI = 'http://localhost/index.xhtml';  // TODO

  // TODO doctype

  var html  = document.createElementNS(XHTMLNS, 'html');
  document.appendChild(html);
  html.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  var head  = document.createElementNS(XHTMLNS, 'head');
  html.appendChild(head);
  var title = document.createElementNS(XHTMLNS, 'title');
  head.appendChild(title);
  title.appendChild(document.createTextNode('Sun Labs Lively Kernel'));

  var body  = document.createElementNS(XHTMLNS, 'body');
  html.appendChild(body);
  body.setAttribute('style', 'margin:0px');

  var svg = document.createElementNS(SVGNS, 'svg');
  body.appendChild(svg);
  svg.setAttribute('id', 'canvas');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:lively', 'http://www.experimentalstuff.com/Lively');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
  svg.setAttribute('xml:space', 'preserve');
  svg.setAttribute('zoomAndPan', 'disable');

  var defs  = document.createElementNS(SVGNS, 'defs');
  svg.appendChild(defs);
  // TODO add <script>s to defs and evaluate the scripts automatically,
  // so I don't have to include them on the command line.

  /* TODO don't hard code window height, use window.height instead */

/*
  document.geziraBegin =
    (new gezira.Translation(0, 600)).child(
      (new gezira.Scale(1, -1)).child(
        (new gezira.Background(0.5, 0.7, 0.8)).child(
          gezira.dom.render(document.documentElement))));
  gezira.paint(document.geziraBegin);
*/

  /* TODO ideally, we would call gezira.dom.update() after all the files
   * are read in. Or perhaps we can set it up so that anytime a file is
   * compiled and run, gezira.dom.update() is called afterward?
   */

  return document;
})();
