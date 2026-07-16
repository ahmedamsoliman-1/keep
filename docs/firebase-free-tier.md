# Firebase free-tier constraints

Envault currently runs against the Firebase free tier. The following limitations
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

- Envault API routes should return a professional `503` response.
- Users should be told that the data service is temporarily unavailable.
- The application must not repeatedly retry requests in a tight loop.
- Development must wait for the daily reset when billing cannot be enabled.

Envault deduplicates vault-metadata requests in the browser so the desktop
navigation, mobile navigation, dashboard and vault page share one request. This
reduces unnecessary reads but cannot bypass an already exhausted Firebase quota.

Official reference:
[Firestore usage and limits](https://firebase.google.com/docs/firestore/quotas).

## TOTP multi-factor authentication

The Envault interface and Firebase client integration support authenticator-app
TOTP enrollment and sign-in challenges. However, TOTP must also be enabled in
the Firebase project's Identity Platform configuration.

Until project-level TOTP is available:

- Authenticator-app enrollment will return `auth/operation-not-allowed`.
- Envault should explain that MFA is unavailable for the current Firebase
  project rather than showing the raw Firebase error.
- MFA remains an optional feature and must not block normal account usage.
- The security settings page can remain implemented for future enablement.

When project configuration becomes available, enable TOTP through the Firebase
Admin SDK or Identity Platform REST API and ensure email/password authentication
and email verification are enabled.

Official reference:
[Enable TOTP MFA for Identity Platform](https://docs.cloud.google.com/identity-platform/docs/admin/enabling-totp-mfa).

## Future options

When operationally possible, evaluate:

1. Enabling billing with strict Google Cloud budgets and alerts.
2. Enabling TOTP in Identity Platform while keeping enrollment optional.
3. Using Firebase Emulator Suite for development and automated testing to avoid
   consuming production quota.
4. Adding usage monitoring and application-level rate limits before wider
   production use.
