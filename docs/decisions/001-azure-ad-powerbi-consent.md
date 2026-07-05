# 001 — Azure AD PowerBI Admin Consent

**Date:** March 2026  
**Status:** Deferred  

## Decision
Admin consent for Power BI Service API permissions could not be granted 
because the Azure student account does not have a Power BI Service subscription.

## Impact
PowerBI embedding will use user consent flow instead of admin consent.
Each user will be prompted to approve permissions on first login.

## Action Required
When the project moves to a production Azure subscription, grant admin 
consent for these permissions:
- Power BI Service: Dataset.Read.All, Report.Read.All, Dashboard.Read.All, Workspace.Read.All
- Microsoft Graph: Files.Read.All, Sites.Read.All, User.Read