# The proxy accepted the request

`incident.example.test` is served through ingress-nginx. The application Pod
is ready, yet the edge returns 502. A 502 means the proxy reached the point of
trying an upstream and did not get a usable answer. Work the path in order;
do not change fields until you can name the broken hop.
