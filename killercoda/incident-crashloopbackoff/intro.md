# A restart is evidence, not the cause

The `worker` Deployment is in `incident-crash`. Its container exits at startup
because a required startup contract is missing. The important output belongs to
the **previous** container, not necessarily the replacement currently running.
