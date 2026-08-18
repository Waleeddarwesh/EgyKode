# EgyKode lab environment — everything, one control node.
#
# The default. The four layered images below it still exist for anyone who
# wants a smaller pull, but making a beginner choose between base/docker/iac/k8s
# before they have learned what those words mean is friction at exactly the
# wrong moment.
#
# One container, one `docker compose up`, and the same shell for every lab from
# the first Linux command to the last Terraform plan — which is also what the
# curriculum promises: one system, built in phases, not disconnected exercises.
#
# The cost is size. This is a large image and it is a deliberate trade: one big
# pull once, rather than four smaller pulls and a decision each time.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

ARG TERRAFORM_VERSION=1.9.8
ARG KUBECTL_VERSION=v1.31.0
ARG HELM_VERSION=v3.16.2

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git jq less nano openssh-client sshpass \
      python3 python3-pip sudo tree unzip vim wget \
      docker.io docker-compose-v2 \
 && rm -rf /var/lib/apt/lists/*

# One RUN per tool, not one for all four. The first build failed on the last
# download and discarded the three that had already succeeded; separate layers
# mean a network failure costs one retry rather than the whole image.
RUN pip3 install --no-cache-dir --break-system-packages ansible-core

RUN curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" -o /tmp/tf.zip \
 && unzip -q /tmp/tf.zip -d /usr/local/bin && rm /tmp/tf.zip

RUN curl -fsSL "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl" -o /usr/local/bin/kubectl \
 && chmod +x /usr/local/bin/kubectl

RUN curl -fsSL "https://get.helm.sh/helm-${HELM_VERSION}-linux-amd64.tar.gz" | tar xz -C /tmp \
 && mv /tmp/linux-amd64/helm /usr/local/bin/helm \
 && chmod +x /usr/local/bin/helm

# No kind in here, deliberately.
#
# kind creates clusters on the *host* Docker daemon, and this image does not
# mount the socket — so a kind binary here could not create anything. The
# controller talks to a cluster through kubectl and helm; the learner runs
# `kind create cluster` on their own machine. The first build failing on that
# download is how the mistake surfaced.

COPY egykode-doctor /usr/local/bin/egykode-doctor
RUN chmod +x /usr/local/bin/egykode-doctor

# Non-root, with sudo. Several labs teach that running as root is the wrong
# habit; several others need to install a package. Both must be possible.
RUN useradd --create-home --shell /bin/bash --uid 10001 learner \
 && echo "learner ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/learner

USER learner
WORKDIR /home/learner/work

RUN git config --global user.name "Learner" \
 && git config --global user.email "learner@egykode.com" \
 && git config --global init.defaultBranch main \
 && mkdir -p /home/learner/.ssh && chmod 700 /home/learner/.ssh \
 && printf 'Host *\n  StrictHostKeyChecking no\n  UserKnownHostsFile /dev/null\n' > /home/learner/.ssh/config

# The SSH key and inventory were in docker/ansible/Dockerfile, but compose
# builds the controller from here — so the first `ansible all -m ping` found
# no inventory and fell back to implicit localhost, which is exactly the
# non-lesson this two-container design exists to avoid.
#
# The key is a throwaway lab credential shared with the nodes through a compose
# volume. It is worthless outside this environment, which is why baking it is
# acceptable here and would not be anywhere else.
RUN ssh-keygen -t ed25519 -N "" -C "egykode-lab" -f /home/learner/.ssh/id_ed25519

# Inventory in $HOME, not in the work volume: the volume is the learner's, and
# mounting it would hide anything the image placed there.
# node1 only. node2 belongs to the `multinode` profile and is absent by
# default, so listing it here made every first `ansible all -m ping` report a
# failure the learner has done nothing wrong to cause.
RUN printf '[web]\nnode1\n\n[all:vars]\nansible_user=learner\nansible_python_interpreter=/usr/bin/python3\n' \
      > /home/learner/inventory.ini \
 && printf '[web]\nnode1\nnode2\n\n[all:vars]\nansible_user=learner\nansible_python_interpreter=/usr/bin/python3\n' \
      > /home/learner/inventory-multinode.ini

# Point Ansible at that inventory from anywhere.
#
# Writing the file was not enough. The shell opens in /home/learner/work, and
# Ansible looks for an inventory relative to its config — of which there was
# none (`ansible --version` reported `config file = None`), so it fell back to
# /etc/ansible/hosts, found nothing, and warned that only implicit localhost
# was available. `ansible all -m ping` is the first command of the Ansible
# phase, and it failed for every learner who ran it as written.
#
# ~/.ansible.cfg rather than ./ansible.cfg: the working directory is a mounted
# volume the learner owns, and Ansible ignores a config in a world-writable
# directory, silently, for security reasons.
RUN printf '[defaults]\ninventory = /home/learner/inventory.ini\nhost_key_checking = False\n\n[ssh_connection]\npipelining = True\n' \
      > /home/learner/.ansible.cfg

CMD ["/bin/bash"]
