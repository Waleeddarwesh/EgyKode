# EgyKode lab environment — managed node
#
# A machine for Ansible to configure. Runs sshd because that is how Ansible
# reaches a host, and carries python3 because that is what its modules need on
# the far end.
#
# Not derived from :base — base runs as a non-root user with no sshd, and this
# has the opposite job.
#
# ── Why this runs systemd ───────────────────────────────────────────────────
#
# It used to run sshd as PID 1. That was simpler, and it made ten labs lie.
#
# `systemctl`, `journalctl` and `systemctl enable` are the subject of the Linux
# service labs, and Ansible's `service` and `systemd` modules do nothing useful
# without an init system — so "configure a service with Ansible" degraded into
# "run a command and hope", which is the opposite of the lesson. A learner
# would follow the lab exactly and get `System has not been booted with systemd`
# with no idea whether they or the environment was wrong.
#
# Running systemd inside a container needs a writable cgroup filesystem and
# tmpfs on /run, both granted in docker-compose.yml. It does not need
# `privileged: true`, and is not given it.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
# dbus is not optional here, despite systemd technically starting without it.
# systemctl talks to systemd over the system bus, and a non-root user with no
# bus gets "Failed to connect to bus: No such file or directory" — which reads
# like a permissions problem and is not one. Every `systemctl status` in the
# Linux labs is run as the learner, not as root.
RUN apt-get update && apt-get install -y --no-install-recommends \
      systemd systemd-sysv dbus \
      openssh-server python3 sudo \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /run/sshd

# Units that cannot work in a container, removed so `systemctl` reports a clean
# system. Left in place they fail on every boot, and a learner reading
# `systemctl --failed` during a troubleshooting lab cannot tell the noise from
# the fault they are looking for.
RUN find /etc/systemd/system /lib/systemd/system \
      -path '*.wants/*' \
      \( -name '*udev*' \
      -o -name '*getty*' \
      -o -name 'systemd-firstboot*' \
      -o -name 'systemd-resolved*' \
      -o -name 'systemd-networkd*' \) \
      -exec rm -f {} +
# systemd-logind is deliberately kept. Removing it was a mistake: it is what
# creates a login session, and without one `systemctl` as a non-root user over
# SSH cannot reach the bus at all.

# sshd as a unit rather than as PID 1. This is also how it works on a real
# server, so `systemctl status ssh` in a lab shows a genuine service.
RUN systemctl enable ssh

RUN useradd --create-home --shell /bin/bash --uid 10001 learner \
 && echo "learner ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/learner \
 && mkdir -p /home/learner/.ssh && chmod 700 /home/learner/.ssh \
 && chown -R learner:learner /home/learner/.ssh

# systemd's shutdown signal. Without it `docker stop` waits the full timeout
# and then kills the container, so every stop takes ten seconds.
STOPSIGNAL SIGRTMIN+3

# The public half of the control node's key is mounted in by compose rather
# than baked here, so the two images stay independently buildable.
EXPOSE 22
CMD ["/sbin/init"]
