# AWS Budgets — billing alerts for haslife.org infra.
#
# Two independent monthly budgets (cost type, USD):
#   1. Warning  — fires when actual spend crosses $5/month.
#   2. Critical — fires when actual spend crosses $20/month.
#
# AWS Budgets sends notification email natively (no SNS topic needed),
# but the email recipient must confirm the subscription the first time.
#
# Cost filter: account-wide. If you want to scope only to haslife resources,
# add a cost_filter on tag `Project=haslife` (requires user-defined cost
# allocation tags to be activated in Billing preferences first — manual step).

resource "aws_budgets_budget" "warning" {
  name         = "haslife-warning-${var.billing_alert_warning_usd}usd"
  budget_type  = "COST"
  limit_amount = tostring(var.billing_alert_warning_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.billing_alert_email]
  }

  # Forecasted spend nudge — heads-up before the threshold is actually crossed.
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.billing_alert_email]
  }
}

resource "aws_budgets_budget" "critical" {
  name         = "haslife-critical-${var.billing_alert_critical_usd}usd"
  budget_type  = "COST"
  limit_amount = tostring(var.billing_alert_critical_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.billing_alert_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.billing_alert_email]
  }
}
