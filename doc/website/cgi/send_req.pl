#!/usr/bin/perl -wT

use strict;

use LWP::UserAgent;
use HTTP::Request::Common;

my $ua = LWP::UserAgent->new(agent => 'GoogieSpell Client');
my $reqXML = "";

read (STDIN, $reqXML, $ENV{'CONTENT_LENGTH'});

my $url = "https://www.google.com/tbproxy/spell?$ENV{QUERY_STRING}";
my $res = $ua->request(POST $url, Content_Type => 'text/xml', Content => $reqXML);

print "Content-Type: text/xml\n\n";
print $res->{_content};
