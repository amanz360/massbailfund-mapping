# Cloudflare DNS + CDN Setup Guide

## Prerequisites

- Access to the Squarespace account managing massbailfund.org
- Custom domain enabled in Terraform (see Step 0)
- The S3 website endpoint (from `terraform output s3_website_endpoint`)
- The API Gateway custom domain target (from `terraform output api_custom_domain_target`)
- ACM certificate validation records (from `terraform output acm_validation_records`)

## 0. Enable Custom Domain in Terraform

The API Gateway custom domain is disabled by default. To enable it, add `domain_name` to the `api_gateway` module in `infrastructure/environments/production/main.tf`:

```hcl
module "api_gateway" {
  # ...existing config...
  domain_name = "api.massbailfund.org"
}
```

Run `terraform apply`. This creates the ACM certificate and (once validated) the API Gateway custom domain. The apply will pause at the certificate validation step — continue with Step 4 below to add the DNS record, then the apply will complete.

## 1. Create Free Cloudflare Account

- Go to cloudflare.com and sign up
- Add site: massbailfund.org
- Select Free plan

## 2. Document Existing DNS Records

Before making any changes, log into Squarespace and record ALL existing DNS records:
- A/CNAME records for the main website
- MX records for email
- TXT records (SPF, DKIM, domain verification)
- Any other records

Cloudflare will auto-scan and import most records, but always verify against your manual list.

## 3. Verify Cloudflare Auto-Imported Records

After adding the site, Cloudflare scans existing DNS. Compare its results against your manual list from Step 2. Add any missing records.

## 4. Validate the ACM Certificate

Before the API custom domain will work, AWS needs to verify you own the domain.

Run `terraform output acm_validation_records` to get the DNS validation records. For each record, add it in Cloudflare:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | `<record name from output>` | `<record value from output>` | DNS only (grey cloud) |

**Important:** ACM validation records MUST be set to "DNS only" (grey cloud), not proxied. Cloudflare proxying will interfere with AWS validation.

Wait for the ACM certificate status to show "Issued" in the AWS console (usually takes a few minutes).

## 5. Add Application DNS Records

In the Cloudflare DNS dashboard, add:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| CNAME | app | `<S3 website endpoint>` | Proxied (orange cloud) |
| CNAME | api | `<API Gateway custom domain target>` | Proxied (orange cloud) |

Note: Use the `api_custom_domain_target` terraform output for the api CNAME (this is the API Gateway custom domain endpoint, NOT the default API Gateway URL).

## 6. Update Nameservers on Squarespace

- Cloudflare will provide 2 nameservers (e.g., ada.ns.cloudflare.com, bob.ns.cloudflare.com)
- In Squarespace: Settings > Domains > massbailfund.org > Nameservers
- Change from Squarespace nameservers to Cloudflare nameservers
- Propagation takes up to 24-48 hours

**Important:** Do NOT change nameservers until Steps 2-5 are complete.

## 7. SSL/TLS Settings

After nameserver propagation:
- SSL/TLS > Overview: Set to **Full (Strict)**
  - "Full (Strict)" means Cloudflare encrypts traffic to the origin AND validates the certificate
  - This works because API Gateway has a valid ACM certificate for api.massbailfund.org
- Edge Certificates > Always Use HTTPS: **ON**
- Edge Certificates > Minimum TLS Version: **TLS 1.2**

**Note on S3:** The `app` subdomain uses S3 website hosting which only serves HTTP. Cloudflare will use Full (Strict) for `api` (which has a valid cert) and will fall back gracefully for `app` since S3 website endpoints don't support HTTPS. If you encounter issues with the `app` subdomain, create a Configuration Rule in Cloudflare to set SSL mode to "Flexible" specifically for `app.massbailfund.org`.

## 8. Caching Configuration

- Caching > Configuration > Caching Level: **Standard**
- The `app` subdomain will cache static assets automatically

Add a Page Rule to bypass cache for the API:
- Rules > Page Rules > Create Page Rule
- URL: `api.massbailfund.org/*`
- Setting: Cache Level = **Bypass**

## 9. Verification Checklist

After DNS propagation (24-48 hours):

- [ ] https://massbailfund.org loads the Squarespace site
- [ ] https://www.massbailfund.org loads the Squarespace site
- [ ] https://app.massbailfund.org loads the frontend SPA
- [ ] https://api.massbailfund.org/health returns 200
- [ ] https://api.massbailfund.org/admin loads the Django admin login
- [ ] Email delivery still works (send a test email)
- [ ] Any other services using the domain still work

## Troubleshooting

**Site not loading after nameserver change:**
- DNS propagation can take up to 48 hours
- Check propagation status: https://dnschecker.org

**SSL errors on api subdomain:**
- Verify ACM certificate status is "Issued" in AWS console
- Verify SSL mode is set to "Full (Strict)"
- Check that the CNAME points to the custom domain target, not the default API Gateway URL

**SSL errors on app subdomain:**
- S3 website endpoints don't support HTTPS origin connections
- Add a Cloudflare Configuration Rule for `app.massbailfund.org` with SSL set to "Flexible"

**CSRF errors on Django admin login:**
- Verify `SECURE_PROXY_SSL_HEADER` and `CSRF_TRUSTED_ORIGINS` are set in production settings
- Verify `ENV_CONFIG=production` is set in the ECS task environment

**Email not working:**
- Verify MX records were copied correctly from Squarespace
- Check TXT records for SPF/DKIM

**API returning errors:**
- Verify the CNAME target matches the `api_custom_domain_target` terraform output
- Check that the Page Rule is bypassing cache for api.*
- Verify the API Gateway is deployed and the ECS service is running
