# Firebase free-tier constraints

Keep currently runs against the Firebase free tier. The following limitations
must remain visible in planning and deployment decisions.

## Firestore quota exhaustion

Firestore can return:

```text
8 RESOURCE_EXHAUSTED: Quota exceeded.
```

The no-cost Firestore quota includes daily limits for document reads, writes and
deletes. These quotas reset around midnight Pacific time. Usage can be reviewed
in Firebase Console under **Firestore Database → Usage**.

When quota is exhausted:

- Keep API routes should return a professional `503` response.
- Users should be told that the data service is temporarily unavailable.
- The application must not repeatedly retry requests in a tight loop.
- Development must wait for the daily reset when billing cannot be enabled.

Keep deduplicates vault-metadata requests in the browser so the desktop
navigation, mobile navigation, dashboard and vault page share one request. This
reduces unnecessary reads but cannot bypass an already exhausted Firebase quota.

Official reference:
[Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas).

## TOTP multi-factor authentication

Keep now manages standard TOTP enrollment and verification itself. Firebase
Identity Platform MFA is not required. Firebase Authentication remains the
email/password first factor, while Keep verifies the authenticator code
before issuing its application session.

This still requires Firestore access to read the encrypted MFA configuration.
When Firestore quota is exhausted, MFA verification fails closed until quota is
available again.

See [Keep-managed authenticator MFA](custom-totp-mfa.md).

## Future options

When operationally possible, evaluate:

1. Enabling billing with strict Google Cloud budgets and alerts.
2. Enabling TOTP in Identity Platform while keeping enrollment optional.
3. Using Firebase Emulator Suite for development and automated testing to avoid
   consuming production quota.
4. Adding usage monitoring and application-level rate limits before wider
   production use.
