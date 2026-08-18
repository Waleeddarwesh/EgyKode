# Done

You now have:

- an account that belongs to the job rather than to a person
- a directory whose permissions survive the next engineer joining
- a service that comes back on boot, proven rather than assumed

The habit worth keeping is the last check. `systemctl is-active` and
`systemctl is-enabled` answer different questions, and only one of them
survives a restart.

Back on [EgyKode](https://egykode.com/en/labs/lab-20-linux-server-administration/)
the same lab covers the disk investigation this scenario leaves out, and the
troubleshooting cases behind each of these steps.
