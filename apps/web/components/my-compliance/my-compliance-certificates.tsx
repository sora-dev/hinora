"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck,
  Filter,
  Hash,
  Lock,
  Mail,
  Monitor,
  Search,
  Share2,
  Shield,
  X,
  type LucideIcon,
} from "lucide-react";
import { getSessionProfileDisplay } from "../dashboard/session";
import { DropdownSelect } from "../ui/dropdown-select";
import { EmptyState } from "../ui/empty-state";
import {
  defaultOrganizationSettings,
  fetchOrganizationSettings,
  type OrganizationSettings,
} from "../../lib/organization-settings";
import {
  formatComplianceDate,
  type MyCertificateStatus,
  type MyCertificateType,
  type MyComplianceCertificate,
} from "./my-compliance-data";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type StatusChip = "all" | "ACTIVE" | "EXPIRED" | "REVOKED";
type TypeFilter = "" | MyCertificateType;
type SortBy = "earned-desc" | "earned-asc" | "title" | "status";

function certificateStatus(certificate: MyComplianceCertificate): MyCertificateStatus {
  if (certificate.status === "REVOKED") return "REVOKED";
  if (certificate.expiresAt) {
    const expires = new Date(certificate.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
      return "EXPIRED";
    }
  }
  if (certificate.status === "EXPIRED") return "EXPIRED";
  return "ACTIVE";
}

function certificateType(certificate: MyComplianceCertificate): MyCertificateType {
  return certificate.type ?? "Assessment";
}

function policyLine(certificate: MyComplianceCertificate) {
  const title = certificate.policyTitle?.trim() || certificate.title;
  const version = certificate.policyVersion?.trim();
  return version ? `${title} ${version}` : title;
}

function recipientName(certificate: MyComplianceCertificate) {
  return certificate.recipientName?.trim() || getSessionProfileDisplay().name;
}

function statusLabel(status: MyCertificateStatus) {
  if (status === "EXPIRED") return "Expired";
  if (status === "REVOKED") return "Revoked";
  return "Active";
}

function statusBadgeClass(status: MyCertificateStatus) {
  if (status === "EXPIRED") return "bg-red-50 text-[var(--color-error)]";
  if (status === "REVOKED") return "bg-slate-100 text-slate-600";
  return "bg-emerald-50 text-[var(--color-success)]";
}

function relativeUntil(expiresAt: string) {
  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return "";
  const days = Math.round((expires.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days < 45) return `in ${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  if (months < 18) return `in ${months} month${months === 1 ? "" : "s"}`;
  const years = Math.round(days / 365);
  return `in ${years} year${years === 1 ? "" : "s"}`;
}

function validUntilLabel(certificate: MyComplianceCertificate) {
  if (!certificate.expiresAt) return "No Expiration";
  const formatted = formatComplianceDate(certificate.expiresAt);
  const relative = relativeUntil(certificate.expiresAt);
  return relative ? `${formatted} (${relative})` : formatted;
}

function earnedExpiresLine(certificate: MyComplianceCertificate) {
  const earned = `Earned on ${formatComplianceDate(certificate.issuedAt)}`;
  if (!certificate.expiresAt) return `${earned} • No Expiration`;
  return `${earned} • Expires on ${formatComplianceDate(certificate.expiresAt)}`;
}

function certificateVisual(
  certificate: MyComplianceCertificate,
  index: number,
): { Icon: LucideIcon; tone: string } {
  const type = certificateType(certificate);
  if (type === "Training") {
    return { Icon: Mail, tone: "bg-orange-50 text-orange-500" };
  }
  if (type === "Acknowledgement") {
    return { Icon: ClipboardCheck, tone: "bg-red-50 text-[var(--color-error)]" };
  }
  const variants = [
    { Icon: Shield, tone: "bg-blue-50 text-[var(--color-active-menu)]" },
    { Icon: Lock, tone: "bg-emerald-50 text-[var(--color-success)]" },
    { Icon: Monitor, tone: "bg-violet-50 text-violet-500" },
  ] as const;
  return variants[index % variants.length];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveAssetUrl(value: string | null) {
  if (!value) return "";
  if (
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
}

function useIsXl() {
  const [isXl, setIsXl] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const apply = () => setIsXl(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return isXl;
}

export default function MyComplianceCertificates({
  certificates,
  selectedCertificateId,
  onSelectCertificate,
}: {
  certificates: MyComplianceCertificate[];
  selectedCertificateId: string | null;
  onSelectCertificate: (certificateId: string | null) => void;
}) {
  const isXl = useIsXl();
  const [chip, setChip] = useState<StatusChip>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [sortBy, setSortBy] = useState<SortBy>("earned-desc");
  const [organization, setOrganization] = useState<OrganizationSettings>(defaultOrganizationSettings);
  const didAutoSelect = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationSettings()
      .then((settings) => {
        if (!cancelled) setOrganization(settings);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: certificates.length,
      ACTIVE: certificates.filter((item) => certificateStatus(item) === "ACTIVE").length,
      EXPIRED: certificates.filter((item) => certificateStatus(item) === "EXPIRED").length,
      REVOKED: certificates.filter((item) => certificateStatus(item) === "REVOKED").length,
    }),
    [certificates],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return certificates
      .filter((item) => {
        if (chip !== "all" && certificateStatus(item) !== chip) return false;
        if (typeFilter && certificateType(item) !== typeFilter) return false;
        if (
          query &&
          !item.title.toLowerCase().includes(query) &&
          !policyLine(item).toLowerCase().includes(query) &&
          !item.certificateNumber.toLowerCase().includes(query)
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        if (sortBy === "title") return left.title.localeCompare(right.title);
        if (sortBy === "status") {
          return certificateStatus(left).localeCompare(certificateStatus(right));
        }
        const leftTime = new Date(left.issuedAt).getTime();
        const rightTime = new Date(right.issuedAt).getTime();
        return sortBy === "earned-asc" ? leftTime - rightTime : rightTime - leftTime;
      });
  }, [certificates, chip, search, sortBy, typeFilter]);

  const selected = useMemo(
    () => certificates.find((item) => item.id === selectedCertificateId) ?? null,
    [certificates, selectedCertificateId],
  );

  useEffect(() => {
    if (!isXl || didAutoSelect.current) return;
    if (selectedCertificateId && certificates.some((item) => item.id === selectedCertificateId)) {
      didAutoSelect.current = true;
      return;
    }
    if (filtered[0]) {
      didAutoSelect.current = true;
      onSelectCertificate(filtered[0].id);
    }
  }, [certificates, filtered, isXl, onSelectCertificate, selectedCertificateId]);

  const showList = isXl || !selected;
  const showDetail = Boolean(selected) && (isXl || Boolean(selectedCertificateId));

  return (
    <div className="flex min-w-0 flex-wrap gap-4">
      {showList ? (
        <section className="min-w-0 flex-[1.15] basis-[min(100%,28rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] xl:p-5">
          <h2 className="text-lg font-extrabold text-slate-900">Certificates</h2>
          <p className="mt-1 text-sm text-slate-500">
            View your earned certificates and download or share them as needed.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { id: "all", label: `All Certificates (${counts.all})` },
                { id: "ACTIVE", label: `Active (${counts.ACTIVE})` },
                { id: "EXPIRED", label: `Expired (${counts.EXPIRED})` },
                { id: "REVOKED", label: `Revoked (${counts.REVOKED})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setChip(item.id)}
                className={cx(
                  "inline-flex h-8 items-center rounded-lg border px-3 text-xs font-semibold",
                  chip === item.id
                    ? "border-[var(--color-active-menu)] bg-[var(--color-active-menu)] text-white"
                    : "border-[var(--color-active-menu)] bg-white text-slate-800 hover:bg-blue-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search certificates..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownSelect
                value={typeFilter}
                onChange={(value) => setTypeFilter(value as TypeFilter)}
                options={[
                  { value: "Assessment", label: "Assessment" },
                  { value: "Training", label: "Training" },
                  { value: "Acknowledgement", label: "Acknowledgement" },
                ]}
                placeholder="All Types"
                allowClear
                size="sm"
                className="min-w-0 flex-1"
              />
              <DropdownSelect
                value={sortBy}
                onChange={(value) => setSortBy((value as SortBy) || "earned-desc")}
                options={[
                  { value: "earned-desc", label: "Sort by: Earned Date (Newest)" },
                  { value: "earned-asc", label: "Sort by: Earned Date (Oldest)" },
                  { value: "title", label: "Sort by: Title" },
                  { value: "status", label: "Sort by: Status" },
                ]}
                allowClear={false}
                size="sm"
                className="min-w-0 flex-1"
              />
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                <Filter className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No certificates here"
                description="Certificates appear here after you pass an assigned policy assessment."
                className="py-10"
              />
            ) : (
              filtered.map((certificate, index) => {
                const active = certificate.id === selected?.id;
                const status = certificateStatus(certificate);
                const visual = certificateVisual(certificate, index);
                const Icon = visual.Icon;
                return (
                  <button
                    key={certificate.id}
                    type="button"
                    onClick={() => onSelectCertificate(certificate.id)}
                    className={cx(
                      "flex w-full min-w-0 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                      active
                        ? "border-[var(--color-active-menu)] bg-blue-50/70 shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <span
                      className={cx(
                        "mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        visual.tone,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{certificate.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{policyLine(certificate)}</span>
                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[0.68rem] font-bold text-[var(--color-active-menu)]">
                        {certificateType(certificate)}
                      </span>
                      <span className="mt-2 block text-[0.7rem] text-slate-500">
                        {earnedExpiresLine(certificate)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={cx(
                          "inline-flex rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold",
                          statusBadgeClass(status),
                        )}
                      >
                        {statusLabel(status)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} certificates
          </div>
        </section>
      ) : null}

      {showDetail && selected ? (
        <CertificateDetail
          certificate={selected}
          organization={organization}
          onClose={() => onSelectCertificate(null)}
        />
      ) : isXl ? (
        <section className="flex min-w-0 flex-1 basis-[min(100%,22rem)] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6">
          <EmptyState
            icon={Award}
            title="Select a certificate"
            description="Choose a certificate from the list to preview, download, or share it."
          />
        </section>
      ) : null}
    </div>
  );
}

function CertificateDetail({
  certificate,
  organization,
  onClose,
}: {
  certificate: MyComplianceCertificate;
  organization: OrganizationSettings;
  onClose: () => void;
}) {
  const status = certificateStatus(certificate);
  const type = certificateType(certificate);
  const name = recipientName(certificate);
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    setShareNote("");
  }, [certificate.id]);

  async function handleShare() {
    const text = [
      `${certificate.title} — Certificate of Completion`,
      `Awarded to ${name}`,
      `Certificate ID: ${certificate.certificateNumber}`,
      `Issued ${formatComplianceDate(certificate.issuedAt)}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: certificate.title, text });
        setShareNote("Certificate details shared.");
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote("Certificate details copied to clipboard.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareNote("Unable to share this certificate right now.");
    }
  }

  function handleDownload() {
    downloadCertificate(certificate, organization, name);
  }

  return (
    <section className="min-w-0 flex-1 basis-[min(100%,22rem)] rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <CertificatePreview
        certificate={certificate}
        organization={organization}
        recipient={name}
        onClose={onClose}
      />

      <dl className="mt-5 space-y-3 text-sm">
        {[
          { label: "Certificate Name", value: certificate.title, Icon: Award },
          { label: "Related Policy", value: policyLine(certificate), Icon: FileCheck },
          { label: "Type", value: type, Icon: Shield },
          {
            label: "Earned On",
            value: formatComplianceDate(certificate.issuedAt),
            Icon: CalendarClock,
          },
          { label: "Valid Until", value: validUntilLabel(certificate), Icon: CalendarClock },
          {
            label: "Status",
            value: (
              <span className={cx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold", statusBadgeClass(status))}>
                {statusLabel(status)}
              </span>
            ),
            Icon: CheckCircle2,
          },
          { label: "Certificate ID", value: certificate.certificateNumber, Icon: Hash },
        ].map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className="inline-flex items-center gap-2 font-medium text-slate-500">
              <row.Icon className="h-4 w-4 text-slate-400" />
              {row.label}
            </dt>
            <dd className="text-right font-semibold text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-bold text-slate-900">Description</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {certificate.description?.trim() ||
            `This certificate is awarded upon successful completion of the ${certificate.title}.`}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
        >
          <Download className="h-4 w-4" />
          Download Certificate
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-active-menu)] bg-white text-sm font-bold text-[var(--color-active-menu)] hover:bg-blue-50"
        >
          <Share2 className="h-4 w-4" />
          Share Certificate
        </button>
        {shareNote ? <p className="text-xs font-medium text-slate-500">{shareNote}</p> : null}
        <Link
          href={`/employee/policy-library/${certificate.policyId}`}
          className="inline-flex h-11 w-full items-center justify-center text-sm font-bold text-[var(--color-active-menu)] underline underline-offset-4"
        >
          View Related Policy
        </Link>
      </div>
    </section>
  );
}

function CertificatePreview({
  certificate,
  organization,
  recipient,
  onClose,
}: {
  certificate: MyComplianceCertificate;
  organization: OrganizationSettings;
  recipient: string;
  onClose: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-5 py-7 text-center shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
      <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-blue-100/80" />
      <div className="pointer-events-none absolute -right-12 -top-8 h-24 w-24 rounded-full bg-blue-50" />
      <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-amber-50" />
      <div className="pointer-events-none absolute -bottom-12 -right-10 h-28 w-28 rounded-full bg-blue-100/70" />
      <div className="pointer-events-none absolute inset-3 rounded-xl border border-blue-100" />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"
        aria-label="Close certificate details"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        {organization.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={organization.organizationName}
            className="mx-auto h-12 w-12 object-contain"
          />
        ) : (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-extrabold text-[var(--color-active-menu)]">
            {organization.organizationCode || "ORG"}
          </div>
        )}
        <div className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-400">
          {organization.organizationName}
        </div>
        <h3 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-slate-900">
          Certificate of Completion
        </h3>
        <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          This certifies that
        </p>
        <div className="mt-1 font-serif text-[1.65rem] font-semibold leading-tight text-slate-900">
          {recipient}
        </div>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
          has successfully completed the <span className="font-semibold text-slate-800">{certificate.title}</span>{" "}
          {certificateType(certificate).toLowerCase()} in accordance with the{" "}
          <span className="font-semibold text-slate-800">{policyLine(certificate)}</span>.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <span>
            Issued on <span className="font-semibold text-slate-700">{formatComplianceDate(certificate.issuedAt)}</span>
          </span>
          <span>
            {certificate.expiresAt ? (
              <>
                Valid until{" "}
                <span className="font-semibold text-slate-700">{formatComplianceDate(certificate.expiresAt)}</span>
              </>
            ) : (
              <span className="font-semibold text-slate-700">No Expiration</span>
            )}
          </span>
        </div>
        <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-amber-300 bg-gradient-to-b from-amber-200 to-amber-400 text-amber-800 shadow-[0_6px_14px_rgba(217,119,6,0.25)]">
          <Award className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function downloadCertificate(
  certificate: MyComplianceCertificate,
  organization: OrganizationSettings,
  recipient: string,
) {
  const logoSrc = resolveAssetUrl(organization.logoUrl);
  const logoHtml = logoSrc
    ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(organization.organizationName)}" />`
    : `<div class="mark">${escapeHtml(organization.organizationCode || "ORG")}</div>`;
  const expiresHtml = certificate.expiresAt
    ? `<span>Valid until <strong>${escapeHtml(formatComplianceDate(certificate.expiresAt))}</strong></span>`
    : `<span><strong>No Expiration</strong></span>`;

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(certificate.title)} Certificate</title>
    <style>
      @page { size: landscape letter; margin: 0.45in; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: Georgia, "Times New Roman", serif;
        color: #0f172a;
        background: #fff;
      }
      .sheet {
        min-height: 7.2in;
        border: 14px solid #dbeafe;
        padding: 36px 48px;
        text-align: center;
        position: relative;
      }
      .sheet::before {
        content: "";
        position: absolute;
        inset: 10px;
        border: 1px solid #93c5fd;
      }
      .logo, .mark {
        width: 72px;
        height: 72px;
        object-fit: contain;
        margin: 0 auto 8px;
      }
      .mark {
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #eff6ff;
        color: #2563eb;
        font-family: Inter, system-ui, sans-serif;
        font-weight: 800;
      }
      .org {
        font-family: Inter, system-ui, sans-serif;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        font-size: 11px;
        color: #64748b;
        font-weight: 700;
      }
      h1 {
        margin: 18px 0 10px;
        font-size: 36px;
        font-weight: 600;
      }
      .kicker {
        font-family: Inter, system-ui, sans-serif;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        font-size: 11px;
        color: #94a3b8;
      }
      .name {
        margin: 8px 0 16px;
        font-size: 42px;
        font-weight: 600;
      }
      .body {
        max-width: 640px;
        margin: 0 auto;
        font-size: 16px;
        line-height: 1.7;
        color: #475569;
      }
      .dates {
        margin-top: 28px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 13px;
        color: #64748b;
        display: flex;
        justify-content: center;
        gap: 28px;
      }
      .id {
        margin-top: 18px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 12px;
        color: #94a3b8;
      }
      .seal {
        width: 72px;
        height: 72px;
        margin: 22px auto 0;
        border-radius: 999px;
        border: 4px solid #fcd34d;
        background: linear-gradient(#fde68a, #f59e0b);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #92400e;
        font-family: Inter, system-ui, sans-serif;
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0.08em;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${logoHtml}
      <div class="org">${escapeHtml(organization.organizationName)}</div>
      <h1>Certificate of Completion</h1>
      <div class="kicker">This certifies that</div>
      <div class="name">${escapeHtml(recipient)}</div>
      <p class="body">
        has successfully completed the <strong>${escapeHtml(certificate.title)}</strong>
        ${escapeHtml(certificateType(certificate).toLowerCase())} in accordance with the
        <strong>${escapeHtml(policyLine(certificate))}</strong>.
      </p>
      <div class="dates">
        <span>Issued on <strong>${escapeHtml(formatComplianceDate(certificate.issuedAt))}</strong></span>
        ${expiresHtml}
      </div>
      <div class="id">Certificate ID: ${escapeHtml(certificate.certificateNumber)}</div>
      <div class="seal">SEAL</div>
    </div>
  </body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!popup) return;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  const images = Array.from(popup.document.images);
  Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
          window.setTimeout(() => resolve(), 1200);
        }),
    ),
  ).then(() => {
    popup.print();
  });
}
