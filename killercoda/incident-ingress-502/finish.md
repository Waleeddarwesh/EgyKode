# Incident resolved

The Pod was healthy and the Service had endpoints. The Service’s target port
was the only broken hop: ingress-nginx tried port 80 while the container
listened on 8080. The one-field correction restored a real HTTP 200 through
the edge.
