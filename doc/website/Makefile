
all: style
	./generate_navigation_lively.rb
	
style:
	cd styles; ./generate_style.rb



testupload:
	rsync -a --progress --exclude '.svn' . quatur.net:website/lively-kernel.org

upload:
	rsync -a --progress --exclude '.svn' . lively-kernel.org:/var/www
	ssh lively-kernel.org chgrp www-data -R /var/www