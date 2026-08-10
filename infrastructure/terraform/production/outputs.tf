output "cloudfront_domain" {
  description = "Live immediately, with or without a custom domain"
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "distribution_id" {
  description = "Used by the deploy workflow to invalidate changed pages"
  value       = aws_cloudfront_distribution.site.id
}

output "bucket_name" {
  value = aws_s3_bucket.site.id
}

output "deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE secret (or variable) in GitHub"
  value       = aws_iam_role.deploy.arn
}

/**
 * The records to create in Cloudflare.
 *
 * `certificate_validation` proves domain ownership to ACM. `site` points the
 * domain at CloudFront and must be **DNS-only (grey cloud)** — proxying would
 * put a second CDN in front of the first.
 */
output "cloudflare_dns_records" {
  description = "Records to add in the Cloudflare dashboard"
  value = var.domain == "" ? {} : {
    certificate_validation = [
      for option in aws_acm_certificate.site[0].domain_validation_options : {
        type  = option.resource_record_type
        name  = option.resource_record_name
        value = option.resource_record_value
        proxy = "DNS only"
      }
    ]
    site = [
      {
        type  = "CNAME"
        name  = var.domain
        value = aws_cloudfront_distribution.site.domain_name
        proxy = "DNS only (grey cloud)"
        note  = "Cloudflare flattens a CNAME at the apex automatically"
      },
      {
        type  = "CNAME"
        name  = "www.${var.domain}"
        value = aws_cloudfront_distribution.site.domain_name
        proxy = "DNS only (grey cloud)"
      },
    ]
  }
}
