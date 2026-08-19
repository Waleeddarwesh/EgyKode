# Query the logs

A log group you cannot query is a more expensive `/var/log`. Find the errors:

```
awslocal logs filter-log-events \
  --log-group-name /egykode/lab/app \
  --filter-pattern ERROR \
  --query 'events[].message' --output text
```{{exec}}

## The filter pattern is not a regular expression

This is the thing that wastes an afternoon. `ERROR` matches the term anywhere in
the message. `"ERROR database"` in quotes matches that exact phrase. But
`ERR.*` matches nothing at all — CloudWatch filter patterns are a small
term-matching language, not regex, and an invalid pattern is not an error. It
simply returns nothing, which looks exactly like an application that had no
problems.

```
echo "--- ERROR (term match) ---"
awslocal logs filter-log-events --log-group-name /egykode/lab/app \
  --filter-pattern 'ERROR' --query 'length(events)'
echo "--- ERR.* (looks like regex, matches nothing) ---"
awslocal logs filter-log-events --log-group-name /egykode/lab/app \
  --filter-pattern 'ERR.*' --query 'length(events)'
echo "--- ?ERROR ?timeout (OR of two terms) ---"
awslocal logs filter-log-events --log-group-name /egykode/lab/app \
  --filter-pattern '?ERROR ?timeout' --query 'length(events)'
```{{exec}}

Zero from a pattern that looked reasonable. **A query language that returns
silence for a malformed query is one you have to test deliberately**, the same
way you would test an alert.

## Bound it by time, or you will read the whole group

```
NOW=$(($(date +%s) * 1000))
awslocal logs filter-log-events \
  --log-group-name /egykode/lab/app \
  --filter-pattern ERROR \
  --start-time $((NOW - 900000)) \
  --query 'events[].{at:timestamp,msg:message}' --output table
```{{exec}}

Fifteen minutes back. On a real group this is the difference between a query
that returns and one that scans months of data and bills you for it.

## Turn the pattern into a metric

Querying is what you do *after* someone notices. A **metric filter** evaluates
the same pattern on every incoming event and increments a metric, so the logs
can drive an alarm instead of waiting to be read:

```
awslocal logs put-metric-filter \
  --log-group-name /egykode/lab/app \
  --filter-name error-count \
  --filter-pattern 'ERROR' \
  --metric-transformations \
    metricName=ApplicationErrors,metricNamespace=EgyKode/Ops,metricValue=1
awslocal logs describe-metric-filters \
  --log-group-name /egykode/lab/app \
  --query 'metricFilters[].{filter:filterName,pattern:filterPattern,metric:metricTransformations[0].metricName}' \
  --output table
```{{exec}}

`metricValue=1` counts occurrences. It can also extract a number out of the
line — latency, bytes, a queue depth — which is how a log line becomes a
graphable series without the application ever knowing CloudWatch exists.

**Done when:** the ERROR events come back from a query, and a metric filter
turns that pattern into `ApplicationErrors`.
