# Healthy Pods, broken calls

`api` and `db` are healthy in the `incident-dns` namespace. The API has an
egress policy that permits TCP/80 to the database, yet an HTTP call to `db`
times out. Do not delete the policy: its database rule is intentional.

The three possibilities are distinct: a name that resolves proves DNS works;
an `NXDOMAIN` means the name is wrong; a timeout means the resolver cannot be
reached. Work from inside the calling Pod, where Kubernetes DNS exists.
