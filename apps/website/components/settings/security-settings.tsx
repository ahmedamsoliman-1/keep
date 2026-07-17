"use client";

import { KeepClient } from "@keephq/api-client";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
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
import { toast } from "sonner";

import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getClientAuth } from "@/lib/firebase-client";
import { getUserFacingError } from "@/lib/user-errors";

import { PasskeySettings } from "./passkey-settings";

const client = new KeepClient({ baseUrl: "" });

export function SecuritySettings() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => onAuthStateChanged(getClientAuth(), setUser), []);
  useEffect(() => {
    void client.mfa
      .status()
      .then((status) => setMfaEnabled(status.enabled))
      .catch(() => undefined);
  }, []);

  async function resendVerification() {
    if (!user) return;
    setPending(true);
    try {
      await sendEmailVerification(user);
      toast.success("A fresh verification email has been sent.");
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "email-verification"));
    } finally {
      setPending(false);
    }
  }

  async function beginMfaEnrollment() {
    if (!user?.email) return;
    setPending(true);
    try {
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, password),
      );
      const enrollment = await client.mfa.begin();
      setSecret(enrollment.secret);
      setQrCode(
        await QRCode.toDataURL(enrollment.uri, {
          width: 224,
          margin: 1,
          color: { dark: "#111318", light: "#ffffff" },
        }),
      );
      setPassword("");
    } catch (error) {
      toast.error(getUserFacingError(error, getAuthErrorMessage(error, "mfa")));
    } finally {
      setPending(false);
    }
  }

  async function completeMfaEnrollment() {
    setPending(true);
    try {
      await client.mfa.confirm(verificationCode);
      setMfaEnabled(true);
      setSecret(null);
      setQrCode(null);
      setVerificationCode("");
      toast.success("Authenticator-app verification is now enabled.");
    } catch (error) {
      toast.error(
        getUserFacingError(error, "The verification code is invalid."),
      );
    } finally {
      setPending(false);
    }
  }

  async function removeMfa() {
    setPending(true);
    try {
      await client.mfa.remove(verificationCode);
      setMfaEnabled(false);
      setVerificationCode("");
      toast.success("Authenticator-app verification has been removed.");
    } catch (error) {
      toast.error(
        getUserFacingError(error, "The verification code is invalid."),
      );
    } finally {
      setPending(false);
    }
  }

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
            className="mt-6 rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
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
              Keep verifies standard TOTP codes independently of Firebase MFA.
              Microsoft Authenticator, Google Authenticator and compatible apps
              are supported.
            </p>
          </div>
        </div>

        {mfaEnabled ? (
          <div className="mt-6 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">
                    Authenticator app enabled
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Your authenticator has been verified.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                Verified
              </span>
            </div>
            <div className="mt-5 border-t pt-5">
              <label className="block text-sm font-medium">
                Remove authenticator verification
                <span className="mt-1 block text-xs font-normal text-[var(--muted)]">
                  Enter a current six-digit code before removing this security
                  method.
                </span>
                <input
                  className="mt-3 w-full rounded-xl border bg-transparent px-3.5 py-3 font-mono tracking-[0.25em]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/gu, ""))
                  }
                  placeholder="000000"
                  value={verificationCode}
                />
              </label>
              <button
                className="mt-3 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || verificationCode.length !== 6}
                onClick={() => void removeMfa()}
                type="button"
              >
                {pending
                  ? "Verifying code…"
                  : "Remove authenticator verification"}
              </button>
            </div>
          </div>
        ) : secret && qrCode ? (
          <div className="mt-7 grid gap-6 md:grid-cols-[224px_1fr]">
            <img
              alt="Authenticator app enrollment QR code"
              className="size-56 rounded-xl border bg-white p-2"
              height={224}
              src={qrCode}
              width={224}
            />
            <div>
              <p className="text-sm font-medium">Scan the QR code</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Or enter this setup key manually:
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border p-3">
                <code className="min-w-0 flex-1 break-all text-xs">
                  {secret}
                </code>
                <button
                  aria-label="Copy setup key"
                  onClick={() => void navigator.clipboard.writeText(secret)}
                  type="button"
                >
                  <Copy className="size-4" />
                </button>
              </div>
              <input
                className="mt-5 w-full rounded-xl border bg-transparent px-3.5 py-3 font-mono tracking-[0.25em]"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) =>
                  setVerificationCode(event.target.value.replace(/\D/gu, ""))
                }
                placeholder="Six-digit code"
                value={verificationCode}
              />
              <button
                className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
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
                className="mt-2 w-full rounded-xl border bg-transparent px-3.5 py-3"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              disabled={pending || !password || !user}
              onClick={() => void beginMfaEnrollment()}
              type="button"
            >
              <ShieldCheck className="size-4" />
              Set up authenticator app
            </button>
          </div>
        )}
      </section>

      <PasskeySettings />
    </div>
  );
}
