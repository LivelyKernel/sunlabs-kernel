function decodemail(s)
{
  var s1=s.replace('[at]','@'); 
  location.href=s1.replace(/\[([^\[\]]*)\]/g,'$1');
}

function insertMailToHostUser(host, user) {
  email = user + "@" + host
  document.write('<a href="mailto:' + email + '">' + email + '</a>')
}