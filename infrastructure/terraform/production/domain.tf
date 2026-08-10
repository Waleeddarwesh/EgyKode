/**
 * Certificate and cost guardrail.
 *
 * DNS stays at Cloudflare — this stack never manages the zone. Terraform
 * requests the certificate and outputs the validation record; you add it in
 * the Cloudflare dashboard, and ACM completes on its own.
 *
 * The production record itself must be **DNS-only** (grey cloud), not proxied.
 * Cloudflare proxying in front of CloudFront means two CDNs, two TLS
 * terminations and two caches on the same request, for no benefit — CloudFront
 * is already the edge. Cloudflare's job here is the registrar and the zone.
 */

resource "aws_acm_certificate" "site" {
  count = var.domain == "" ? 0 : 1

  domain_name               = var.domain
  subject_alternative_names = ["www.${var.domain}"]
  validation_method         = "DNS"

  # A certificate in use cannot be deleted, so a replacement is created first.
  lifecycle {
    create_before_destroy = true
  }
}

# Terraform waits here until the DNS records below exist and ACM has seen them.
resource "aws_acm_certificate_validation" "site" {
  count = var.domain == "" || !var.wait_for_certificate ? 0 : 1

  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for o in aws_acm_certificate.site[0].domain_validation_options : o.resource_record_name]

  timeouts {
    create = "30m"
  }
}

# ── Cost guardrail ──────────────────────────────────────────────────────────
# The free tier is a discount, not a guarantee. This is the cheapest possible
# insurance against a surprise: an email at 50% and 90% of a small monthly
# budget, long before anything becomes expensive.
resource "aws_budgets_budget" "monthly" {
  name         = "egykode-monthly"
  budget_type  = "COST"
  limit_amount = var.monthly_budget_usd
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 90
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.alert_email]
  }
}
