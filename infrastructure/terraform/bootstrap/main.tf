/**
 * Bootstrap: the Terraform state backend itself.
 *
 * A chicken-and-egg problem — the main stack keeps its state in S3 with a
 * DynamoDB lock, but something has to create that bucket first. This tiny
 * stack does, and is the only thing here that uses local state.
 *
 * It exists as a separate stack rather than a step in a runbook because the
 * Terraform chapter tells readers their state belongs in an encrypted,
 * versioned, locked backend — and this platform should be able to point at its
 * own infrastructure as the worked example.
 *
 *   cd infrastructure/terraform/bootstrap && terraform init && terraform apply
 */
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "egykode"
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}

variable "region" {
  description = "Region for the state backend"
  type        = string
  default     = "us-east-1"
}

variable "state_bucket" {
  description = "Bucket holding Terraform state for every EgyKode stack"
  type        = string
  default     = "egykode-terraform-state"
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket

  # State is the one thing that must never be casually destroyed: losing it
  # orphans every resource it tracks.
  lifecycle {
    prevent_destroy = true
  }
}

# Recovers an accidental overwrite or delete. On a state bucket this is not
# optional — a corrupted state file with no previous version is one of the few
# genuinely unrecoverable situations in this stack.
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# State frequently contains secrets in plain text. Nothing about it is public.
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Stops two applies writing concurrently and corrupting the file.
resource "aws_dynamodb_table" "locks" {
  name         = "egykode-terraform-locks"
  billing_mode = "PAY_PER_REQUEST" # a few writes a week costs nothing
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

output "state_bucket" {
  value = aws_s3_bucket.state.id
}

output "lock_table" {
  value = aws_dynamodb_table.locks.name
}
