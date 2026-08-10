/**
 * The CDN. This is what a visitor actually talks to.
 */

# ── Edge routing ────────────────────────────────────────────────────────────
# The static export has no server, so the two rules middleware used to apply
# run here instead — at the edge, on every request, for a fraction of a
# millisecond and no compute bill worth measuring.
resource "aws_cloudfront_function" "router" {
  name    = "egykode-router"
  runtime = "cloudfront-js-2.0"
  comment = "Locale redirect and directory-index rewriting for the static export"
  publish = true

  code = <<-JS
    function handler(event) {
      var request = event.request;
      var uri = request.uri;

      // A bare path has no locale. Send it to the published one.
      // This replaces apps/web/middleware.ts, which cannot run in an export.
      if (uri === '/' || uri === '') {
        return {
          statusCode: 308,
          statusDescription: 'Permanent Redirect',
          headers: { location: { value: '/en/' } },
        };
      }

      // /build was renamed to /projects. URLs are permanent, so the old ones
      // keep working — this mirrors the redirects() block in next.config.mjs,
      // which `output: export` cannot apply.
      var renamed = uri.match(/^\/(en|ar)\/build(\/.*)?$/);
      if (renamed) {
        return {
          statusCode: 308,
          statusDescription: 'Permanent Redirect',
          headers: { location: { value: '/' + renamed[1] + '/projects' + (renamed[2] || '/') } },
        };
      }

      // The export writes every route as a directory containing index.html.
      // S3 resolves no directory index of its own when accessed through OAC,
      // so map "/en/learn/" to "/en/learn/index.html" here.
      if (uri.endsWith('/')) {
        request.uri = uri + 'index.html';
      } else if (!uri.includes('.')) {
        // A path with no extension is a page; keep the canonical trailing
        // slash rather than serving the same content on two URLs.
        return {
          statusCode: 308,
          statusDescription: 'Permanent Redirect',
          headers: { location: { value: uri + '/' } },
        };
      }

      return request;
    }
  JS
}

# ── Caching ─────────────────────────────────────────────────────────────────
# Two policies, because the two kinds of file have opposite requirements.

# Hashed build assets never change under their filename, so they are cached
# for a year and never revalidated. This is where most of the bytes are.
resource "aws_cloudfront_cache_policy" "immutable" {
  name        = "egykode-immutable"
  comment     = "Fingerprinted assets under /_next/static"
  default_ttl = 31536000
  max_ttl     = 31536000
  min_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# HTML changes on every deploy. Cached at the edge, but revalidated often
# enough that a deploy is visible quickly even before the invalidation lands.
resource "aws_cloudfront_cache_policy" "html" {
  name        = "egykode-html"
  comment     = "Pages — short edge TTL, revalidated on deploy"
  default_ttl = 300
  max_ttl     = 3600
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

# ── Security headers ────────────────────────────────────────────────────────
resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "egykode-security-headers"
  comment = "HSTS, framing, referrer and MIME-sniffing protection"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }
}

# ── Distribution ────────────────────────────────────────────────────────────
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "EgyKode production"
  default_root_object = "index.html"
  aliases             = local.aliases

  # PriceClass_200 includes Middle East and Africa edge locations. All is
  # roughly 15% dearer for South America and Oceania, which is not where this
  # platform's readers are; 100 would exclude the primary audience entirely.
  price_class = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true # brotli and gzip at the edge

    cache_policy_id            = aws_cloudfront_cache_policy.html.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.router.arn
    }
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id            = aws_cloudfront_cache_policy.immutable.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # The export writes 404.html; without this an unknown path returns S3's XML
  # access-denied document, which is both ugly and leaks that it is a bucket.
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # The CloudFront certificate serves the site until the custom domain's
    # certificate has actually been issued — see `attach_domain`.
    cloudfront_default_certificate = var.attach_domain ? false : true
    acm_certificate_arn            = var.attach_domain ? aws_acm_certificate.site[0].arn : null
    ssl_support_method             = var.attach_domain ? "sni-only" : null
    minimum_protocol_version       = var.attach_domain ? "TLSv1.2_2021" : null
  }
}
