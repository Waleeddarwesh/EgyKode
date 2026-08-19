#!/bin/bash
# CloudWatch Logs, custom metrics and alarms against LocalStack.
#
# Pinned to 3.8. The `latest` tag now requires an auth token and quits with
# exit code 55 and "License activation failed" - which reads as a broken
# environment rather than a licensing change, so it is worth not discovering
# by accident.
echo "Installing the AWS CLI..."
# Two paths on purpose. Ubuntu 24.04 dropped the `awscli` package entirely -
# `apt-cache policy awscli` reports "Candidate: (none)" and the install fails
# with "has no installation candidate" - so an apt-only setup leaves every
# later command dying on "aws: not found", several steps after the real cause.
# The official v2 installer is also what the lab actually calls for; the apt
# package was v1.
if ! command -v aws >/dev/null 2>&1; then
  apt-get update -qq >/dev/null 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq awscli >/dev/null 2>&1
fi
if ! command -v aws >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unzip curl >/dev/null 2>&1
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip 2>/dev/null
  unzip -q -o /tmp/awscliv2.zip -d /tmp 2>/dev/null
  /tmp/aws/install --update >/dev/null 2>&1
fi
command -v aws >/dev/null 2>&1 || echo "WARNING: the AWS CLI did not install - every step below will fail"
aws --version 2>&1 | head -1

# The credentials are deliberately worthless; LocalStack checks the shape of a
# request, not who sent it.
mkdir -p /root/.aws
printf '[default]\naws_access_key_id = test\naws_secret_access_key = test\nregion = us-east-1\n' > /root/.aws/credentials
printf '[default]\nregion = us-east-1\noutput = json\n' > /root/.aws/config

# awslocal is the same CLI with the endpoint already set, so the commands in
# these steps read the way they would against real AWS.
cat > /usr/local/bin/awslocal <<'WRAP'
#!/bin/bash
exec aws --endpoint-url=http://localhost:4566 "$@"
WRAP
chmod +x /usr/local/bin/awslocal

echo "Starting LocalStack (this pulls an image; give it a minute)..."
docker rm -f localstack >/dev/null 2>&1
docker run -d --name localstack -p 4566:4566 \
  -e SERVICES=logs,cloudwatch,ssm,ec2,iam,sts -e DEBUG=0 \
  localstack/localstack:3.8 >/dev/null 2>&1

echo "Waiting for CloudWatch Logs..."
for i in $(seq 1 60); do
  if curl -s --max-time 5 http://localhost:4566/_localstack/health 2>/dev/null | grep -qE '"logs": *"(available|running)"'; then
    echo "LocalStack is ready."
    break
  fi
  sleep 3
done

# A small application that writes the kind of log lines the steps go looking
# for. Written here rather than typed, so the step is about CloudWatch rather
# than about composing log lines.
mkdir -p /root/ops
cat > /root/ops/app.log <<'LOG'
INFO  startup complete in 412ms
INFO  GET /healthz 200 3ms
ERROR database timeout after 5000ms
INFO  GET /api/orders 200 88ms
ERROR upstream payments returned 503
INFO  GET /api/orders 200 91ms
LOG

echo done
