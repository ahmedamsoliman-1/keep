"use client";

import {
  EmailAuthProvider,
  multiFactor,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  TotpMultiFactorGenerator,
  type TotpSecret,
  type User,
} from "firebase/auth";
import {
  CheckCircle2,
  Copy,
  MailCheck,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getClientAuth } from "@/lib/firebase-client";

export function SecuritySettings() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);

  async function resendVerification() {
    if (!user) return;
    setPending(true);
    setMessage(null);
    try {
      await sendEmailVerification(user);
      setMessage("A fresh verification email has been sent.");
    } catch (error) {
      setMessage(getAuthErrorMessage(error, "email-verification"));
    } finally {
      setPending(false);
    }
  }

  async function beginMfaEnrollment() {
    if (!user?.email) return;
    setPending(true);
    setMessage(null);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, password),
      );
      const session = await multiFactor(user).getSession();
      const generatedSecret =
        await TotpMultiFactorGenerator.generateSecret(session);
      const uri = generatedSecret.generateQrCodeUrl(user.email, "Envault");
      setQrCode(
        await QRCode.toDataURL(uri, {
          width: 224,
          margin: 1,
          color: { dark: "#111318", light: "#ffffff" },
        }),
      );
      setSecret(generatedSecret);
      setPassword("");
    } catch (error) {
      setMessage(getAuthErrorMessage(error, "mfa"));
    } finally {
      setPending(false);
    }
  }

  async function completeMfaEnrollment() {
    if (!user || !secret) return;
    setPending(true);
    setMessage(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        secret,
        verificationCode,
      );
      await multiFactor(user).enroll(assertion, "Authenticator app");
      await user.reload();
      setUser(getClientAuth().currentUser);
      setSecret(null);
      setQrCode(null);
      setVerificationCode("");
      setMessage("Authenticator-app verification is now enabled.");
    } catch (error) {
      setMessage(getAuthErrorMessage(error, "mfa"));
    } finally {
      setPending(false);
    }
  }

  async function removeMfa(enrollmentId: string) {
    if (!user) return;
    setPending(true);
    setMessage(null);
    try {
      await multiFactor(user).unenroll(enrollmentId);
      await user.reload();
      setUser(getClientAuth().currentUser);
      setMessage("Authenticator-app verification has been removed.");
    } catch (error) {
      setMessage(getAuthErrorMessage(error, "mfa"));
    } finally {
      setPending(false);
    }
  }

  const enrolledFactors = user ? multiFactor(user).enrolledFactors : [];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <MailCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Email verification</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Confirm ownership of {user?.email ?? "your email address"}.
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              user?.emailVerified
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-amber-500/10 text-amber-700"
            }`}
          >
            {user?.emailVerified ? "Verified" : "Not verified"}
          </span>
        </div>
        {!user?.emailVerified ? (
          <button
            className="mt-6 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-hover)] disabled:opacity-50"
            disabled={pending || !user}
            onClick={() => void resendVerification()}
            type="button"
          >
            Send verification email
          </button>
        ) : null}
      </section>

      <section className="rounded-2xl border bg-[var(--surface)] p-6">
        <div className="flex gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">Authenticator app</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Add a time-based one-time password from Microsoft Authenticator,
              Google Authenticator, Authy, or another compatible application.
            </p>
          </div>
        </div>

        {enrolledFactors.length > 0 ? (
          <div className="mt-6 space-y-3">
            {enrolledFactors.map((factor) => (
              <div
                className="flex items-center justify-between rounded-xl border p-4"
                key={factor.uid}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {factor.displayName ?? "Authenticator app"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      TOTP enabled
                    </p>
                  </div>
                </div>
                <button
                  className="text-sm font-medium text-red-600 hover:underline"
                  disabled={pending}
                  onClick={() => void removeMfa(factor.uid)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : secret && qrCode ? (
          <div className="mt-7 grid gap-6 md:grid-cols-[224px_1fr]">
            {/* QR is generated locally from the Firebase TOTP enrollment URI. */}
            <img
              alt="Authenticator app enrollment QR code"
              className="size-56 rounded-xl border bg-white p-2"
              height={224}
              src={qrCode}
              width={224}
            />
            <div>
              <p className="text-sm font-medium">Scan the QR code</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                If scanning is unavailable, enter this setup key manually:
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border p-3">
                <code className="min-w-0 flex-1 break-all text-xs">
                  {secret.secretKey}
                </code>
                <button
                  aria-label="Copy setup key"
                  onClick={() =>
                    void navigator.clipboard.writeText(secret.secretKey)
                  }
                  type="button"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <label className="mt-5 block text-sm font-medium">
                Six-digit verification code
                <input
                  autoComplete="one-time-code"
                  className="focus:ring-3 mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 font-mono text-sm tracking-[0.25em] outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/gu, ""))
                  }
                  value={verificationCode}
                />
              </label>
              <button
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={pending || verificationCode.length !== 6}
                onClick={() => void completeMfaEnrollment()}
                type="button"
              >
                Confirm and enable MFA
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 max-w-md">
            <label className="block text-sm font-medium">
              Confirm your account password
              <input
                autoComplete="current-password"
                className="focus:ring-3 mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-indigo-500/10"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              disabled={pending || !password || !user}
              onClick={() => void beginMfaEnrollment()}
              type="button"
            >
              <ShieldCheck className="size-4" />
              Set up authenticator app
            </button>
          </div>
        )}

        {message ? (
          <p className="mt-5 text-sm text-[var(--muted)]">{message}</p>
        ) : null}
      </section>
    </div>
  );
}
