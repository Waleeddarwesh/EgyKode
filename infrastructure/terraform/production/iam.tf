/**
 * Deploy identity for GitHub Actions — via OIDC, not an access key.
 *
 * The Jenkins chapter states that no long-lived AWS key exists anywhere in
 * this platform, and this is where that has to be true rather than aspirational.
 * GitHub presents a short-lived OIDC token, AWS exchanges it for credentials
 * that expire in an hour, and there is no secret in the repository to leak,
 * rotate, or forget about.
 */

data "aws_caller_identity" "current" {}

# GitHub's OIDC provider. `create_oidc_provider = false` reuses an existing one
# — an account may only have a single provider per issuer URL.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "assume_from_github" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Restricted to branch pushes in this repository.
    #
    # GitHub sends the subject in its **immutable identifier** form, which
    # CloudTrail showed after two exact-match attempts failed:
    #
    #   repo:Waleeddarwesh@138933390/EgyKode@1328730125:ref:refs/heads/master
    #
    # Owner and repository carry their numeric ids, so no pattern written
    # against `Waleeddarwesh/EgyKode` can ever match. The ids are permanent —
    # that is the point of the feature: renaming the repo or the account does
    # not silently grant or revoke access, whereas a name-based policy would
    # follow whoever takes the old name.
    #
    # Both forms are allowed because GitHub is rolling this out, and a
    # repository can emit either. Ending each pattern at `:ref:refs/heads/*`
    # keeps forks and pull requests out — a pull request's subject ends
    # `:pull_request`, not `:ref:refs/heads/...`.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repository}:ref:refs/heads/*",
        "repo:${var.github_owner_id}/${var.github_repo_id}:ref:refs/heads/*",
      ]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "egykode-github-deploy"
  description        = "Publishes the static site from GitHub Actions"
  assume_role_policy = data.aws_iam_policy_document.assume_from_github.json
  max_session_duration = 3600
}

# Exactly the permissions a deploy needs: write the bucket, invalidate the
# distribution. Nothing else in the account is reachable from CI.
data "aws_iam_policy_document" "deploy" {
  statement {
    sid     = "SyncSiteObjects"
    actions = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]
  }

  statement {
    sid       = "ListBucketForSyncDiff"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.site.arn]
  }

  statement {
    sid       = "InvalidateChangedPages"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "egykode-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
