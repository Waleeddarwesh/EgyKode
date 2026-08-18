#!/usr/bin/env bash
# Build and publish the EgyKode lab images.
#
#   ./docker/build-and-push.sh <dockerhub-user> [version]
#   ./docker/build-and-push.sh waleeddarwesh 1.0
#
# Run `docker login` yourself first. This script never handles credentials and
# never reads them — Docker's own credential store does that.
#
# Builds locally and only pushes once every image has built, so a failure
# halfway through does not leave a half-published set that some learners pull
# and others do not.
#
# ── Two images, matching docker-compose.yml ─────────────────────────────────
#
# An earlier version of this script built six: base, docker, iac, k8s, ansible
# and node, from a layered design that predates the current environment. It no
# longer matched anything. `docker-compose.yml` pulls exactly two images —
#
#   ${EGYKODE_REPO}/controller   from docker/all
#   ${EGYKODE_REPO}/node         from docker/managed-node
#
# — so running the old script published six images nothing referenced and never
# built the controller, which is the one a learner actually needs. The images
# and the compose file are now read from the same place: change one, and this
# script is what fails.
set -euo pipefail

cd "$(dirname "$0")/.."

USER_NS="${1:?usage: build-and-push.sh <dockerhub-user> [version]}"
VERSION="${2:-1.0}"

# Tool versions, overridable without touching a Dockerfile.
export KUBECTL_VERSION="${KUBECTL_VERSION:-v1.31.0}"
export HELM_VERSION="${HELM_VERSION:-v3.16.2}"

CONTROLLER="${USER_NS}/controller"
NODE="${USER_NS}/node"

echo "Building ${CONTROLLER} and ${NODE} at ${VERSION}"
echo

docker build \
  --build-arg "KUBECTL_VERSION=${KUBECTL_VERSION}" \
  --build-arg "HELM_VERSION=${HELM_VERSION}" \
  -t "${CONTROLLER}:${VERSION}" -t "${CONTROLLER}:latest" \
  docker/all

docker build \
  -t "${NODE}:${VERSION}" -t "${NODE}:latest" \
  docker/managed-node

echo
echo "Built:"
docker images "${CONTROLLER}" --format '  {{.Repository}}:{{.Tag}}	{{.Size}}'
docker images "${NODE}" --format '  {{.Repository}}:{{.Tag}}	{{.Size}}'

# A smoke test before publishing, because a broken image is worse than a
# missing one: the learner pulls it, follows the lab, and the failure looks
# like their mistake.
echo
echo "Checking the controller carries what the labs expect…"
docker run --rm "${CONTROLLER}:${VERSION}" bash -lc '
  set -e
  for t in git ansible terraform kubectl helm docker; do
    command -v "$t" >/dev/null || { echo "MISSING: $t"; exit 1; }
  done
  echo "  all tools present"
'
echo "Checking the node runs systemd…"
docker run --rm --entrypoint sh "${NODE}:${VERSION}" -c '
  test -x /sbin/init || { echo "MISSING: /sbin/init"; exit 1; }
  command -v systemctl >/dev/null || { echo "MISSING: systemctl"; exit 1; }
  command -v sshd >/dev/null || test -x /usr/sbin/sshd || { echo "MISSING: sshd"; exit 1; }
  echo "  systemd, sshd present"
'

echo
read -r -p "Push these to Docker Hub? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || { echo "Not pushed."; exit 0; }

for image in "${CONTROLLER}" "${NODE}"; do
  docker push "${image}:${VERSION}"
  docker push "${image}:latest"
done

echo
echo "Published. Learners now pull these by setting, in their shell or a .env:"
echo "  EGYKODE_REPO=${USER_NS}"
echo
echo "Without it, docker-compose.yml falls back to the local tag 'egykode/…'"
echo "and builds from source instead of pulling."
