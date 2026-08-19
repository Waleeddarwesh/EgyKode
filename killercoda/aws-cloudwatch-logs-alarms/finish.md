# Done

You shipped logs off a machine, queried them, turned a pattern into a metric,
and put an alarm on a symptom.

**What you can now do**

- Explain why memory and disk are absent from EC2's default metrics — the
  hypervisor sees the resources it handed out, not what the guest kernel did
  with them — and publish them yourself into a namespace of your own
- Query a log group with CloudWatch's filter syntax, knowing it is term
  matching and not regex, and that a malformed pattern returns silence rather
  than an error
- Build a metric filter so logs drive an alarm instead of waiting to be read
- Justify every argument of a `put-metric-alarm`: the metric, the statistic,
  the evaluation periods, and what missing data means

**Two things this environment could not show you**

**Running a command with no SSH key**, the lab's first criterion, needs SSM Run
Command against an agent registered from a real instance. LocalStack accepts
`send-command` and reports `Success` with an empty output, and the API that
would reveal no agent ever registered is not implemented — so it is left to the
cloud version of this lab rather than faked here.

**The reserved-namespace rule is not enforced.** Real CloudWatch refuses a
`PutMetricData` into `AWS/EC2`; this environment accepts it. That gap is worth
carrying with you generally: an emulator agreeing with your code is weaker
evidence than it feels, and the things it does not enforce are exactly the
things you will meet for the first time in production.

**Next**

The alarm has no action. On a real account that is an SNS topic, and the part
worth testing is the delivery rather than the alarm — a topic with no
subscriber is the usual way a monitoring system turns out to be decorative, and
it is discovered during the incident.
