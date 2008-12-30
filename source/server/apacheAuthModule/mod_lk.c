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

#define XHTML "xhtml"
#define FALSE 0
#define TRUE 1

// forward declarations
module AP_MODULE_DECLARE_DATA lk_module;
static int mod_lk_wikiauth_handler(request_rec*);

// what callbacks should be called for request processing and configuration requests
static void mod_lk_register_hooks (apr_pool_t *p) {
	ap_hook_auth_checker(mod_lk_wikiauth_handler, NULL, NULL, APR_HOOK_FIRST);
	// for basic request handling use:
	// ap_hook_handler(mod_lk_method_handler, NULL, NULL, APR_HOOK_LAST);
}

// config stuff
typedef struct {
  int useWikiAuth;
} lk_module_config;
static void *create_lk_module_config(apr_pool_t *p, server_rec *s) {
	lk_module_config *cfg;
	cfg = (lk_module_config*)apr_pcalloc(p, sizeof(lk_module_config));
	cfg->useWikiAuth = FALSE;
	return (void *) cfg;
};
static const command_rec lk_module_cmds[] = {
	AP_INIT_FLAG(
		"UseLKWikiAuth",
		ap_set_flag_slot,
		(void*)APR_OFFSETOF(lk_module_config, useWikiAuth),
		OR_ALL,
		"Something went wrong with UseLKWikiAuth"
	), {NULL}
};

// name is important!
module AP_MODULE_DECLARE_DATA lk_module = {
	STANDARD20_MODULE_STUFF,
	create_lk_module_config,
	NULL,
	NULL,
	NULL,
	lk_module_cmds,
	mod_lk_register_hooks, // cb for hook registration
};

// authorization callback
// if the requested file is not a xhtml file, don't modify authorization
// if it is xhtml and it does not starts with the user name forbid writting the file
// else allow writing the file
static int mod_lk_wikiauth_handler (request_rec *r) {
	// only handle PUT requests
	// if (r->method_number != M_PUT)
	// 	return DECLINED;

	lk_module_config* cfg = ap_get_module_config(r->per_dir_config, &lk_module);
	if (cfg->useWikiAuth == FALSE) return DECLINED; // check config
	
	// extract filename
	char *filename = strrchr(r->uri, '/') + 1;
	if (filename == NULL) filename = r->uri;

	// is this an xhtml?
	// --> better would be to use content_type but it is not initialized yet...
	char *ending = strrchr(filename, '.') + 1;
	if (ending == NULL || strcmp(ending, XHTML) != 0) return DECLINED;
	
	fprintf(stderr, "XHTML found!!!\n");
	fprintf(stderr, filename); fflush(stderr);
	
	// does the file starts with the user name?
	char *userInFilename = strstr(filename, r->user);
	if (userInFilename == NULL || strcmp(userInFilename, filename) != 0) return 403; // forbidden
	
	fprintf(stderr, "User name matches!\n"); fflush(stderr);
	return OK;
}