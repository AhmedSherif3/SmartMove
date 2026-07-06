import sib_api_v3_sdk
from django.conf import settings


def send_otp_email(user, otp_code, purpose, recipient_email=None):

    templates = {
        'verify_email': {
            'subject': 'SmartMove — Verify your email',
            'body': f"""
Hello {user.first_name or user.email},

Your SmartMove email verification code is:

{otp_code}

This code expires in 10 minutes.
If you did not create a SmartMove account, ignore this email.

— SmartMove Team
            """
        },
        'reset_password': {
            'subject': 'SmartMove — Reset your password',
            'body': f"""
Hello {user.first_name or user.email},

Your SmartMove password reset code is:

{otp_code}

This code expires in 10 minutes.
If you did not request a password reset, ignore this email.

— SmartMove Team
            """
        },
        'change_password': {
            'subject': 'SmartMove — Confirm password change',
            'body': f"""
Hello {user.first_name or user.email},

Your SmartMove password change verification code is:

{otp_code}

This code expires in 10 minutes.
If you did not request this, please secure your account immediately.

— SmartMove Team
            """
        },
        'change_email': {
            'subject': 'SmartMove — Confirm email change',
            'body': f"""
Hello {user.first_name or user.email},

Your SmartMove email change verification code is:

{otp_code}

This code expires in 10 minutes.
If you did not request this change, please secure your account immediately.

— SmartMove Team
            """
        },
    }

    template = templates.get(purpose)
    if not template:
        return

    print(f"--- OTP FOR {user.email}: {otp_code} ---")
    
    def _send():
        api_key = getattr(settings, 'BREVO_API_KEY', '')
        if not api_key:
            print(f"SMTP Error: BREVO_API_KEY not configured. OTP was: {otp_code}", flush=True)
            return
            
        try:
            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = api_key
            api = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))
            
            sender_email = getattr(settings, 'BREVO_SENDER_EMAIL', 'noreply@smartmove.app')
            sender_name = getattr(settings, 'BREVO_SENDER_NAME', 'SmartMove')
            
            html_body = template['body'].replace('\n', '<br>')
            
            email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": recipient_email or user.email}],
                sender={"email": sender_email, "name": sender_name},
                subject=template['subject'],
                html_content=f"<p>{html_body}</p>"
            )
            api.send_transac_email(email)
            print(f"Successfully sent email to {user.email}", flush=True)
        except Exception as e:
            print(f"Brevo API Error: {e}", flush=True)
            
    import threading
    threading.Thread(target=_send).start()