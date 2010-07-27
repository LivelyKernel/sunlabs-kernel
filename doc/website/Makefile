
all: style
	./generate_navigation_lively.rb

style:
	cd styles; ./generate_style.rb

testupload:
	rsync -a --progress --exclude '.svn'  . quatur.net:website/lively-kernel.org

quatur:
	rsync -a --progress --exclude '.svn' . quatur.net:/var/www/lively

upload:
	rsync -r -v --delete-after  --progress --exclude '.svn' . lively-kernel.org:/var/www
	ssh lively-kernel.org echo -n "WARNING: this directory was uploaded on " `date` "from \n http://lively-kernel.org/repository/lively-kernel/trunk/doc/website \n please make changes there und upload here" \> /var/www/DO_NOT_EDIT_HERE 
	ssh lively-kernel.org chgrp  www-data -R /var/www