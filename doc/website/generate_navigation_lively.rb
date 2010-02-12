#!/usr/bin/env ruby

require 'generate_navigation'

@do_backups = false
@write_files = true

fullmenu = [
  ["index.html",              "Home", nil, "home"],
  ["http://www.lively-kernel.org/repository/lively-wiki/index.xhtml",       "Wiki⇗"],
  ["publications/index.html", "Publications"],
  ["development/index.html", "Development"],
  ["projects/index.html", "Projects", [
#       ["projects/webwerkstatt/index.html", "WebWerkstatt"],
  ]],
  ["list/index.html", "Mailing list"],
  ["imprint/index.html",      "Imprint"],
]


def generate_banner(root)
  return  "<!-- -=-=-=-=-=-=-=-=-=-= BANNER -=-=-=-=-=-=-=-=-=-= -->
<div class=\"banner\">
   <div class=\"banner1\">Lively Kernel</div>
   <!-- <div class=\"banner2\"> </div> -->
</div>\n"
end

def generate_logo1(root)
  return "  <div class=\"logo1\">
    <a class=\"plain\" href=\"http://www.lively-kernel.org/repository/lively-wiki/Engine.xhtml\" rel=\"external\">
      <img class=\"logoimage1\" src=\"#{root}media/livelylogo-small.png\" alt=\"Engine Morph\" />
    </a>
  </div>\n"  
end

def generate_logo2(root)
  return  " 
  <div class=\"logo2\">
    <!-- http://www.hpi.uni-potsdam.de/swa -->
    <a class=\"plain\" href=\"http://www.hpi.uni-potsdam.de/willkommen.html?L=1\" rel=\"external\">
      <img class=\"logoimage1\" src=\"#{root}media/hpi_logo_tranparent.png\" alt=\"Hasso-Plattner-Institut\" />
    </a>
  </div>"
end

def generate_footer(root)
  return  "<!-- -=-=-=-=-=-=-=-=-=-= FOOTER -=-=-=-=-=-=-=-=-=-= -->
  <div class=\"copyright\">
    <p> 
      &copy; 2006-2010 
      <a class=\"plain\" href=\"http://www.hpi.uni-potsdam.de/swa\" rel=\"external\">HPI Software Architecture Group</a> 
      <a class=\"plain\" href=\"http://validator.w3.org/check/referer\" rel=\"external\">&nbsp;&nbsp;&nbsp;&nbsp;</a> 
    </p>
  </div>"
end

def title_base()
  return "Lively Kernel"
end

update_navigation_menu(fullmenu, fullmenu)

# @write_files = false
# update_link("projects/ave/index.html", fullmenu)

