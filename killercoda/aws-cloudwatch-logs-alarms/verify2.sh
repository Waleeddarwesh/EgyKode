#!/bin/bash
# Criterion 2: application logs appear in a log group and you can query them.
#
# "You can query them" leaves no trace by itself - a query changes nothing, so
# there is nothing to inspect afterwards. What is checked instead is that the
# query *would* return something (the events are there and the pattern matches
# them) and that the learner built the metric filter, which is the durable
# artifact this step produces and the thing step 3 alarms on.
AWS="aws --endpoint-url=http://localhost:4566"
# A missing CLI must not be reported as missing work. Without this the checks
# below see empty output and confidently name the wrong cause - which is how a
# verifier ends up lying about a setup failure.
command -v aws >/dev/null 2>&1 || {
  echo "FAIL: the AWS CLI is not installed"
  echo "      Setup could not install it. Ubuntu 24.04 dropped the awscli"
  echo "      package; check /root for the fallback install, or re-run setup."
  exit 1; }
GROUP=/egykode/lab/app

for i in $(seq 1 20); do
  curl -s --max-time 5 http://localhost:4566/_localstack/health 2>/dev/null \
    | grep -qE '"logs": *"(available|running)"' && break
  sleep 3
done

$AWS logs describe-log-groups --log-group-name-prefix "$GROUP" 2>/dev/null | grep -q "$GROUP" || {
  echo "FAIL: no log group named $GROUP - finish step 1 first"; exit 1; }

# Presence: the pattern must actually match events in the group. Without this,
# an empty group satisfies every assertion below by having nothing to disagree
# with - the failure shape that has bitten this repository before.
HITS=$($AWS logs filter-log-events --log-group-name "$GROUP" \
  --filter-pattern ERROR --query 'length(events)' --output text 2>/dev/null)
case "$HITS" in ''|*[!0-9]*) HITS=0 ;; esac
if [ "$HITS" -lt 1 ]; then
  echo "FAIL: an ERROR query against $GROUP returns nothing"
  echo "      Either no events were shipped, or their timestamps are wrong."
  echo "      put-log-events takes milliseconds; a value in seconds lands in"
  echo "      1970 and sits outside every window you query."
  exit 1
fi

FILTERS=$($AWS logs describe-metric-filters --log-group-name "$GROUP" 2>/dev/null)
echo "$FILTERS" | grep -q 'ApplicationErrors' || {
  echo "FAIL: no metric filter publishing ApplicationErrors on $GROUP"
  echo "      Querying is what you do after someone notices. A metric filter"
  echo "      evaluates the pattern on every event as it arrives, so the logs"
  echo "      can drive an alarm instead of waiting to be read."
  exit 1; }

# A filter whose pattern matches nothing is the silent version of this bug: it
# exists, it is wired to a metric, and it will never fire.
PATTERN=$(echo "$FILTERS" | tr -d ' "' | grep -o 'filterPattern:[^,}]*' | head -1 | cut -d: -f2)
if [ -z "$PATTERN" ]; then
  echo "FAIL: the metric filter has an empty pattern"
  echo "      It would match nothing and the alarm built on it could never fire."
  exit 1
fi

echo "PASS - ERROR events are queryable in $GROUP and a metric filter turns them into ApplicationErrors"
exit 0
