#!/usr/bin/env ruby

require 'generate_navigation'

@do_backups = false
@write_files = true

fullmenu = [
  ["index.html",              "Home", nil, "home"],
  ["lively/index.html", "Lively"],
  ["publications/index.html", "Publications"],
  ["presentations/index.html", "Presentations"],
  ["development/index.html", "Development"],
  ["projects/index.html", "Projects", [
#       ["projects/webwerkstatt/index.html", "Webwerkstatt"],
  ]],
  ["list/index.html", "Mailing list"],
#  ["http://www.lively-kernel.org/repository/lively-wiki/index.xhtml",       "Wiki"],
  ["license/index.html", "License"],
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
    <a class=\"plain\" href=\"http://www.lively-kernel.org/\">
      <img class=\"logoimage1\" src=\"#{root}media/livelylogo-small.png\" alt=\"http://www.lively-kernel.org/\" />
    </a>
  </div>\n"  
end

def generate_logo2(root)
  return  " 
  <div class=\"logo2\">
    <!-- http://www.hpi.uni-potsdam.de/swa -->
    <!-- http://www.hpi.uni-potsdam.de/willkommen.html?L=1 -->
    <a class=\"plain\" href=\"http://www.hpi.uni-potsdam.de/swa\" rel=\"external\">
      <img class=\"logoimage1\" src=\"#{root}media/hpi_logo_tranparent.png\" alt=\"Hasso-Plattner-Institut\" />
    </a>
  </div>"
end

def generate_footer(root)
  return  "<!-- -=-=-=-=-=-=-=-=-=-= FOOTER -=-=-=-=-=-=-=-=-=-= -->
  <div class=\"copyright\">
    <p> 
      &copy; 2006-2012 
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

