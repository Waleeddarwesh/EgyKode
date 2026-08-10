variable "bucket_name" {
  description = "S3 bucket holding the exported site. Must be globally unique."
  type        = string
  default     = "egykode-site-production"
}

variable "domain" {
  description = <<-EOT
    Apex domain, e.g. "egykode.com". Leave empty to publish on the
    CloudFront domain only — useful for the first apply, before DNS and the
    certificate are ready.
  EOT
  type        = string
  default     = ""
}

variable "wait_for_certificate" {
  description = <<-EOT
    Block the apply until ACM validation completes. Set false on the first
    apply so Terraform can output the DNS records you need to create; set true
    once they exist in Cloudflare.
  EOT
  type        = bool
  default     = false
}

variable "attach_domain" {
  description = <<-EOT
    Put the domain on the distribution.

    Kept separate from `domain` because CloudFront rejects a certificate that
    ACM has not yet issued, and ACM cannot issue until the validation record
    exists in Cloudflare — which needs the record Terraform only knows after
    requesting the certificate. So it is two applies:

      1. domain="egykode.com"                    -> requests the certificate,
                                                    outputs the DNS records
      2. domain="egykode.com" attach_domain=true -> attaches it, once validated
  EOT
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "owner/repo permitted to assume the deploy role"
  type        = string
  default     = "Waleeddarwesh/EgyKode"
}

variable "production_branch" {
  description = "Only deploys from this branch may assume the deploy role"
  type        = string
  default     = "master"
}

variable "create_oidc_provider" {
  description = <<-EOT
    Create the GitHub OIDC provider. An AWS account may only have one per
    issuer, so set false if another stack already created it.
  EOT
  type        = bool
  default     = true
}

variable "monthly_budget_usd" {
  description = "Budget that triggers an email alert. This site should cost near zero."
  type        = string
  default     = "5"
}

variable "alert_email" {
  description = "Where budget alerts are sent"
  type        = string
  default     = "Waleeddarweshsaad1@gmail.com"
}
