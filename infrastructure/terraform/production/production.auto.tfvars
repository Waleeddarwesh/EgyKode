# Values for the production workspace, loaded automatically.
#
# These were previously passed as `-var` on the command line and recorded
# nowhere, which made a bare `terraform apply` actively dangerous: with
# `domain` defaulting to "", the certificate's count evaluates to 0 and the
# plan reads
#
#     aws_acm_certificate.site[0] will be destroyed
#       (because index [0] is out of range for count)
#
# alongside an in-place update to the distribution that drops both aliases —
# which is the domain being taken off the site. Terraform loads any
# `*.auto.tfvars` file in the working directory, so recording them here makes
# the safe plan the one you get by default.
#
# Nothing secret lives here. The domain is public, and this file says only
# which domain to attach and that the certificate has been validated.

domain = "egykode.com"

# Attaching the domain and requesting the certificate are separate steps, in
# that order: CloudFront rejects an alias whose certificate is not yet issued.
# Both are done, so this stays true.
attach_domain = true
