# Incident resolved

The database was healthy. The Service was healthy. The API could even reach
the database IP. It failed before opening a connection because its egress
policy omitted CoreDNS. The durable fix was a narrow DNS exception, not
deleting the policy.
