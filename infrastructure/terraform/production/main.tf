/**
 * EgyKode production: a static site on S3, served by CloudFront.
 *
 * Deliberately four services and nothing else — S3, CloudFront, ACM, IAM.
 * There is no NAT Gateway, no load balancer and no cluster, because a static
 * site needs none of them and those three are what turn a "free tier" account
 * into a bill (§9.2, and the NAT Gateway section of the VPC chapter).
 *
 * This stack is part of the curriculum: the Terraform, S3, CloudFront and IAM
 * chapters can point at it as the infrastructure actually serving the page the
 * reader is on.
 *
 * Cost at rest: S3 storage for ~32 MB, plus CloudFront requests and egress —
 * inside the perpetual free tier (1 TB out, 10 M requests/month) this is
 * effectively zero, and a budget alarm below makes a surprise impossible.
 */
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }

  backend "s3" {
    bucket         = "egykode-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "egykode-terraform-locks"
    encrypt        = true
  }
}

# CloudFront certificates must live in us-east-1, whatever the bucket's region.
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "egykode"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

locals {
  # An alias may only be added once a matching, issued certificate is attached.
  aliases = var.attach_domain ? [var.domain, "www.${var.domain}"] : []
}

# ── Origin ──────────────────────────────────────────────────────────────────
# Private. The only thing that may read it is this distribution, via OAC —
# there is no public bucket policy and no website endpoint.
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# One deploy is a full `aws s3 sync --delete`. Versioning means a bad deploy is
# recoverable, and the lifecycle rule stops old versions accumulating cost.
resource "aws_s3_bucket_versioning" "site" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket     = aws_s3_bucket.site.id
  depends_on = [aws_s3_bucket_versioning.site]

  rule {
    id     = "expire-old-versions"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "site" {
  statement {
    sid       = "AllowCloudFrontRead"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    # Scoped to this distribution: another account's CloudFront cannot read it.
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json
}
