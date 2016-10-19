FROM          debian:jessie
MAINTAINER    Robert Krahn <robert.krahn@gmail.com>

ENV DEBIAN_FRONTEND noninteractive

RUN echo 'deb http://mirrors.kernel.org/debian jessie main' >> /etc/apt/sources.list; \
    apt-get update; \
    apt-get upgrade -y; \
    apt-get -y install curl wget git lsof sysstat dnsutils sudo;

RUN echo "deb http://opensource.wandisco.com/debian jessie svn19" >> /etc/apt/sources.list.d/subversion19.list; \
    wget -q http://opensource.wandisco.com/wandisco-debian.gpg -O- | sudo apt-key add -; \
    apt-get update; \
    apt-get -y install subversion apache2 libapache2-svn;

# Set permissions
RUN addgroup subversion; \
    usermod -a -G subversion www-data

# Configure Apache to serve up Subversion
RUN /usr/sbin/a2enmod dav dav_svn dav_fs rewrite proxy_http; \
    rm /etc/apache2/sites-enabled/000-default.conf

RUN mkdir -p /var/lock/DAVLockDB \
 && touch /var/lock/DAVLockDB/DAVLockDB \
 && chown -R www-data:www-data /var/lock/DAVLockDB \
 && chmod 775 /var/lock/DAVLockDB

ENV APACHE_RUN_USER    www-data
ENV APACHE_RUN_GROUP   www-data
ENV APACHE_PID_FILE    /var/run/apache2.pid
ENV APACHE_RUN_DIR     /var/run/apache2
RUN mkdir -p           /var/lock/apache2
ENV APACHE_LOCK_DIR    /var/lock/apache2
ENV APACHE_LOG_DIR     /var/log/apache2

RUN mkdir -p /srv/lively-kernel-repo ; chown -R www-data /srv/lively-kernel-repo

EXPOSE 80

ADD lively-kernel-apache.conf /etc/apache2/conf-enabled/lively-kernel-apache.conf

CMD /usr/sbin/apache2 && tail -f /var/log/apache2/*

# -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
# docker build . --rm -t rksm:lively-kernel
# docker run -it --rm -p 8000:80 -v lively-kernel-repo:/srv/lively-kernel-repo rksm:lively-kernel
