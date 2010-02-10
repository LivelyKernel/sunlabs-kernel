
require 'test/unit'
require 'generate_navigation'

class TC_GenerateNaviagtion < Test::Unit::TestCase
  
  def test_root_for_link()
    assert_equal(root_for_link("index.html"),"./");
    assert_equal(root_for_link("projects/index.html"),"../");
    assert_equal(root_for_link("projects/ave/index.html"),"../../");  
  end


  def test_in_path()
    assert(in_path?("projects/index.html", "projects/index.html"));
    assert(in_path?("projects/ave/index.html", "projects/index.html"));
    assert(!in_path?("index.html", "projects/index.html"));
    assert(!in_path?("misc/index.html", "projects/index.html"));
  end
  
  
  def test_name_for_link()
    assert_equal(name_for_link("a/index.html", [["a/index.html","hello"]]), "hello");
    assert_equal(name_for_link("a/b/index.html", [["a/index.html","hello", 
                                                    [["a/b/index.html", "deep hello"]]]]), "deep hello");
  end
  
end
