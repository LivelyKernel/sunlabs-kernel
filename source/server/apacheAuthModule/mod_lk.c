/*
 * To build:
 * aclocal && autoconf && automake -a && ./configure --with-apache=/opt/local/apache2
 * make && sudo /opt/local/apache2/bin/apxs -i -a -n lk libmod_lk.la && sudo /opt/local/apache2/bin/apachectl graceful
 * make clean &&  rm -rfd aclocal.m4 config.* configure depcomp install-sh libtool Makefile Makefile.in missing autom4te.cache
 * last steps: clean http.conf, edit lk.conf
 */

/*
 * TODO
 * - path to apr headers in Makefile.am
 * - test & isntall in wiki
 */

// Apache core
#include "httpd.h"
#include "http_config.h"

// For string manipulation
#include <string.h>

// authorization callback
// if the requested file is not a xhtml file, don't modify authorization
// if it is xhtml and it does not starts with the user name forbid writting the file
// else allow writing the file
static int mod_lk_wikiauth_handler (request_rec *r) {
	fprintf(stderr,"mod_lk: An auth request was made. --> ");

	// only handle PUT requests
	// if (r->method_number != M_PUT)
	// 	return DECLINED;

	// extract filename
	char *filename = strrchr(r->uri, '/') + 1;
	if (filename == NULL) filename = r->uri;

	fprintf(stderr, filename);
	fprintf(stderr, "\n");
	fflush(stderr);
		
	// is this an xhtml?
	// --> better would be to use content_type but it is not initialized yet...
	char *ending = strrchr(filename, '.') + 1;
	fprintf(stderr, ending); fflush(stderr);
	
	if (ending == NULL || strcmp(ending, "xhtml") != 0) return DECLINED;
	
	fprintf(stderr, "XHTML found!!!\n"); fflush(stderr);
	
	// does the file starts with the user name?
	char *usernameInFilename = strstr(filename, r->user);
	if (usernameInFilename == NULL) return 403; // forbidden
	
	fprintf(stderr, "User name matches!\n");
	fprintf(stderr, usernameInFilename);
	fprintf(stderr, "\n"); fflush(stderr);

	return OK;
}

// what callbacks should be called for request processing and configuration requests
static void mod_lk_register_hooks (apr_pool_t *p) {
	ap_hook_auth_checker(mod_lk_wikiauth_handler, NULL, NULL, APR_HOOK_FIRST);
	// for basic request handling use:
	// ap_hook_handler(mod_lk_method_handler, NULL, NULL, APR_HOOK_LAST);
}

// name is important!
module AP_MODULE_DECLARE_DATA lk_module = {
	STANDARD20_MODULE_STUFF,
	NULL,
	NULL,
	NULL,
	NULL,
	NULL,
	mod_lk_register_hooks, // cb for hook registration
};