# Operating an instance you cannot log into

An instance with no inbound ports is the goal. Once you have one, three
questions follow immediately: where do the logs go, what do you measure, and
what is worth waking someone up for.

You will ship application logs into a CloudWatch log group and query them,
publish a memory metric — which EC2 does not give you by default, for a reason
worth understanding — and put an alarm on a symptom rather than on CPU.

## What this scenario does not cover

The lab's first criterion is running a command on the instance with no SSH key
and no inbound rule, through **SSM Run Command**. That needs the SSM agent
running on a real machine and registering itself, and this environment runs
against LocalStack, where an instance is an API record with no operating
system behind it.

It is worth being precise about why that matters here rather than glossing it.
LocalStack *accepts* `ssm send-command` and reports:

```
"Status": "Success",  "ResponseCode": 0,  "StandardOutputContent": ""
```

Success, exit code zero, and no output — because nothing ran. The API that
would reveal the instance was never SSM-managed,
`ssm describe-instance-information`, is not implemented at all. A scenario
built on that would teach you that you had administered a machine you had not
touched.

**So criterion 1 is left to the cloud version of this lab**, on a real account
with a real instance. Everything else here is real: the log group holds events
you shipped, the query returns them, and the alarm exists with the threshold
you chose.

Setup runs in the background and takes about a minute.
