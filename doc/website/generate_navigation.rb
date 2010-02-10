#!/usr/bin/env ruby

## default content

def generate_logo1(root)
  return "  <div class=\"logo1\"><a class=\"plain\" href=\"http://www.hpi-web.de\" rel=\"external\">
    <img src=\"#{root}media/hpi_logo_wb_rhi.png\" alt=\"Hasso-Plattner-Institut\" />
  </a></div>\n"  
end

def generate_logo2(root)
  return  "  <div class=\"logo2\"><a class=\"plain\" href=\"http://www.uni-potsdam.de\" rel=\"external\">
    <img src=\"#{root}media/unip_logo_t.png\" alt=\"University of Potsdam\" />
  </a></div>"
end

def generate_banner(root)
  return  ""
end

def generate_footer(root)
  return  "<!-- -=-=-=-=-=-=-=-=-=-= FOOTER -=-=-=-=-=-=-=-=-=-= -->
  <div class=\"copyright\">
  <p> &copy; 2006-2009 HPI Software Architecture Group <a class=\"plain\" href=\"http://validator.w3.org/check/referer\" rel=\"external\">&nbsp;&nbsp;&nbsp;&nbsp;</a> </p>
  </div>"
end

def title_base()
  return "Software Architecture Group (HPI)"
end


## generate navigation for SWA homepage

def depth_for_link(link)
  return (link.split("/").size) - 1 ## calculate depth for relative links
end

def root_for_link(link)
  return "" unless link
  if depth_for_link(link) == 0 then 
    return "./" 
  else 
    result = "" 
    (1..depth_for_link(link)).each() { |ea|
      result += "../"
    }
    return result
  end
end

def relative_link?(link)
  return !(/^(http)|(\#)/.match(link))

end

def make_ref(root, link)
  if (relative_link?(link))
    return root+link
  else
    return link
  end
end

def in_path?(element, path)
  if (element == path)
    return true
  elsif (/index.html$/.match(element) && /index.html$/.match(path))
    return File.fnmatch(File.dirname(path) + "*", element)
  else
    return element == path
  end
end

def generate_menu(menu, indent, current, root)
  result = "" 
  # puts "generate_menu " + current + ": " + root
  menu.each { |link, name, submenu, classes|
    # puts "  link " + link
    descent = in_path?(current, link) || (submenu && submenu.detect{|sublink, subname| in_path?(current, sublink)}) # hack for "cop"
    if (descent) then
      result << indent << "<div#{classes ? " class=\"" + classes.to_s + "\"" : ""}><a class=\"plain#{(current == link ? ' current' : '')}\" href=\"#{make_ref(root, link)}\">#{name}</a></div>\n"
      if (submenu) then
        result << indent << "<div class=\"submenu\">\n"
        result << generate_menu(submenu, indent + "  ", current, root)
        result << indent <<"</div>\n"
      end
    else
      result << indent << "<div><a class=\"plain\" href=\"#{make_ref(root, link)}\">#{name}</a></div>\n"
    end
  }
  return result
end



def generate_menu_for_link(link, menu)
  root = root_for_link(link)
  result = "<!-- -=-=-=-=-=-=-=-=-=-= NAVIGATION/#{depth_for_link(link)} -=-=-=-=-=-=-=-=-=-= -->
<div class=\"navigation\">\n"
  result << generate_logo1(root)
  result << generate_menu(menu, "  ", link, root)
  result << generate_logo2(root)
  result << "</div>\n"
  result << generate_banner(root)
  return result
end

def update_link(link, menu)
  html = File.read(link)
  if (@do_backups)
    File.open(link+".backup", "w") {|file| file.write(html)} # make backup
  end
  html = update_header(link, html, menu);
  html = update_navigation(link, html, menu);
  html = update_footer(link, html);
  html = replace_email_with_java_script(html);
  if (@write_files)
    File.open(link, "w") {|file| file.write(html)} # write file with updated navigation
  else
    puts html
  end
end

def generate_header(root, title)
  return "  <title>#{title}</title>
  <link rel=\"stylesheet\" type=\"text/css\" href=\"#{root}styles/style.css\" media=\"screen\" />
  <link rel=\"stylesheet\" type =\"text/css\" href=\"#{root}styles/print.css\" media=\"print\" />
  <link rel=\"icon\" href=\"#{root}styles/favicon.ico\" type=\"image/ico\" />
  <link rel=\"shortcut_icon\" href=\"#{root}styles/favicon.ico\" />
  <script type=\"text/javascript\" src=\"#{root}scripts/external.js\" ></script>
  <script type=\"text/javascript\" src=\"#{root}scripts/decodemail.js\" ></script>"
end

def name_for_link(link, menu) 
  menu.each{|each_link, name, submenu| 
    if (link == each_link)
      return name;
    end
    if (submenu)
      result = name_for_link(link, submenu)
      return result if result
    end 
  }
  return nil
end



def update_header(link, html, menu)
  name = name_for_link(link, menu) 
  if (name)
    title = title_base() + " - " + name
  else
    title = title_base()
  end
  content = generate_header(root_for_link(link), title)
  begin_tag = "<!-- BEGIN AUTO GENERATED HEADER -->"
  end_tag = "<!-- END AUTO GENERATED HEADER -->"
  re = Regexp.new(Regexp.escape(begin_tag) + ".*" + Regexp.escape(end_tag), Regexp::MULTILINE)
  return html.sub(re, begin_tag +"\n" +  content + "\n" + end_tag )
end

def update_navigation(link, html, menu)
  content = generate_menu_for_link(link, menu)
  begin_tag = "<!-- BEGIN AUTO GENERATED NAVIGATION -->"
  end_tag = "<!-- END AUTO GENERATED NAVIGATION -->"
  re = Regexp.new(Regexp.escape(begin_tag) + ".*" + Regexp.escape(end_tag), Regexp::MULTILINE)
  return html.sub(re, begin_tag +"\n" +  content + "\n" + end_tag )
end

def update_footer(link, html)
  content = generate_footer(root_for_link(link))
  begin_tag = "<!-- BEGIN AUTO GENERATED FOOTER -->"
  end_tag = "<!-- END AUTO GENERATED FOOTER -->"
  re = Regexp.new(Regexp.escape(begin_tag) + ".*" + Regexp.escape(end_tag), Regexp::MULTILINE)
  return html.sub(re, begin_tag +"\n" +  content + "\n" + end_tag )
end


def replace_email_with_java_script(html)
  return html.gsub(/([a-z.-]*)@(hpi.uni-potsdam.de)/) { |match|
      user = $1
      host = $2
      puts "replaced " + match
      "<script type=\"text/javascript\">insertMailToHostUser('" + host +"', '" + user + "')</script>"
  }
end

def update_navigation_menu(menu, fullmenu)
  menu.each { |link, name, submenu|
    if (relative_link?(link))
      puts "updating " + link
      update_link(link, fullmenu);
      update_navigation_menu(submenu, fullmenu) if submenu
    end
  }
end