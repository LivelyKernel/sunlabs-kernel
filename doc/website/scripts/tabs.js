window.onload = function() {
    var container = document.getElementById("tabcontainer"),
        pages = container.querySelectorAll(".tabpage");
    for (i = 0; i < pages.length; i++) { pages[i].style.display = "none"; }

    var headers = document.querySelectorAll(".tabheader"), i;
    for (i = 0; i < headers.length; i++) {
        (function(i) {
            headers[i].onclick = function() {debugger; displayPage(i+1) };
        })(i);
    }

    displayPage(1);
}

// on click of one of tabs
function displayPage(tabIndex) {
    var dataHolder = document.getElementById('tabcontainer'),
        prev = dataHolder.getAttribute("data-current");
    if (prev) {
        //remove class of activetabheader and hide old contents
        document.getElementById("tabheader_" + prev).removeAttribute("class");
        document.getElementById("tabheader_" + prev).setAttribute("class", "tabheader");
        document.getElementById("tabpage_" + prev).style.display="none";
    }
    var header = document.getElementById("tabheader_" + tabIndex),
        page = document.getElementById("tabpage_" + tabIndex);
    header.setAttribute("class","tabheader tabActiveHeader");
    page.style.display="block";
    dataHolder.setAttribute("data-current", tabIndex);
}