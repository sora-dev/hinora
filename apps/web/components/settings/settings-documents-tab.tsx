"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  CircleHelp,
  Cloud,
  FileText,
  Info,
  Layers,
  Lock,
  Pencil,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { DropdownSelect } from "../ui/dropdown-select";

type FileType = "PDF" | "DOC" | "DOCX" | "XLSX" | "PPTX" | "TXT" | "JPG" | "PNG";

type DocumentSettings = {
  maxFileSize: string;
  allowedTypes: FileType[];
  versionRetention: string;
  retentionPeriod: string;
  autoProcessing: boolean;
  storageLocation: string;
  encryptDocuments: boolean;
  scanMalware: boolean;
  restrictDownload: boolean;
  watermarkDocuments: boolean;
  auditAccess: boolean;
};

const allFileTypes: FileType[] = ["PDF", "DOC", "DOCX", "XLSX", "PPTX", "TXT", "JPG", "PNG"];

const defaultDocumentSettings: DocumentSettings = {
  maxFileSize: "100",
  allowedTypes: [...allFileTypes],
  versionRetention: "10",
  retentionPeriod: "7y",
  autoProcessing: true,
  storageLocation: "supabase",
  encryptDocuments: true,
  scanMalware: true,
  restrictDownload: true,
  watermarkDocuments: false,
  auditAccess: true,
};

const fileSizeOptions = [
  { value: "25", label: "25 MB" },
  { value: "50", label: "50 MB" },
  { value: "100", label: "100 MB" },
  { value: "250", label: "250 MB" },
];

const versionOptions = [
  { value: "5", label: "Keep last 5 versions" },
  { value: "10", label: "Keep last 10 versions" },
  { value: "25", label: "Keep last 25 versions" },
  { value: "all", label: "Keep all versions" },
];

const retentionOptions = [
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
  { value: "7y", label: "7 years" },
  { value: "10y", label: "10 years" },
];

const storageOptions = [
  { value: "supabase", label: "Supabase Storage" },
  { value: "s3", label: "AWS S3" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="inline-flex" title={text}>
      <CircleHelp className="h-3.5 w-3.5 text-slate-400" />
    </span>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <HelpTip text={hint} />
    </div>
  );
}

function CardHeading({
  icon,
  title,
  description,
  editing,
  onToggleEdit,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  editing: boolean;
  onToggleEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleEdit}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        {editing ? "Done" : "Edit"}
      </button>
    </div>
  );
}

function SettingToggle({
  label,
  hint,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-800">{label}</span>
            <HelpTip text={hint} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cx(
            "relative h-6 w-11 shrink-0 rounded-full transition",
            checked ? "bg-[var(--color-active-menu)]" : "bg-slate-300",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <span
            className={cx(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
              checked ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default function SettingsDocumentsTab() {
  const [settings, setSettings] = useState<DocumentSettings>(defaultDocumentSettings);
  const [savedSettings, setSavedSettings] = useState<DocumentSettings>(defaultDocumentSettings);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingUpload, setEditingUpload] = useState(false);
  const [editingRetention, setEditingRetention] = useState(false);
  const [editingProcessing, setEditingProcessing] = useState(false);
  const [editingStorage, setEditingStorage] = useState(false);
  const [editingSecurity, setEditingSecurity] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );

  const unusedTypes = allFileTypes.filter((type) => !settings.allowedTypes.includes(type));

  function update<K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setBanner(null);
  }

  function removeType(type: FileType) {
    if (settings.allowedTypes.length <= 1) {
      setBanner({ type: "error", text: "Keep at least one allowed file type." });
      return;
    }
    update(
      "allowedTypes",
      settings.allowedTypes.filter((item) => item !== type),
    );
  }

  function addType(type: string) {
    if (!type || settings.allowedTypes.includes(type as FileType)) return;
    update("allowedTypes", [...settings.allowedTypes, type as FileType]);
  }

  function saveChanges() {
    if (settings.allowedTypes.length === 0) {
      setBanner({ type: "error", text: "Select at least one allowed file type." });
      return;
    }
    setSavedSettings(settings);
    setEditingUpload(false);
    setEditingRetention(false);
    setEditingProcessing(false);
    setEditingStorage(false);
    setEditingSecurity(false);
    setBanner({ type: "success", text: "Document settings saved successfully." });
  }

  function resetToDefault() {
    setSettings(defaultDocumentSettings);
    setSavedSettings(defaultDocumentSettings);
    setEditingUpload(false);
    setEditingRetention(false);
    setEditingProcessing(false);
    setEditingStorage(false);
    setEditingSecurity(false);
    setBanner(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Documents Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Configure document management and storage settings.</p>
      </div>

      {banner ? (
        <div
          className={cx(
            "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-[var(--color-success)]"
              : "border-red-200 bg-red-50 text-[var(--color-error)]",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            {banner.text}
          </span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded-md p-0.5 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
        <CardHeading
          icon={<FileText className="h-5 w-5" />}
          title="File Upload & Type Settings"
          description="Define file size limits and allowed file types."
          editing={editingUpload}
          onToggleEdit={() => setEditingUpload((current) => !current)}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <FieldLabel
              label="Maximum File Size"
              hint="Largest file size allowed for policy uploads."
            />
            <DropdownSelect
              value={settings.maxFileSize}
              onChange={(value) => update("maxFileSize", value || "100")}
              options={fileSizeOptions}
              disabled={!editingUpload}
              aria-label="Maximum File Size"
            />
          </div>
          <div>
            <FieldLabel
              label="Allowed File Types"
              hint="File formats that can be uploaded to the policy library."
            />
            <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              {settings.allowedTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"
                >
                  {type}
                  {editingUpload ? (
                    <button
                      type="button"
                      onClick={() => removeType(type)}
                      className="rounded-sm text-slate-400 hover:text-slate-700"
                      aria-label={`Remove ${type}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </span>
              ))}
              {editingUpload && unusedTypes.length > 0 ? (
                <div className="w-[140px]">
                  <DropdownSelect
                    value=""
                    onChange={(value) => addType(value)}
                    options={unusedTypes.map((type) => ({ value: type, label: type }))}
                    placeholder="Add type"
                    aria-label="Add file type"
                    size="sm"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeading
            icon={<Layers className="h-5 w-5" />}
            title="Version & Retention Settings"
            description="Control how long document versions are kept."
            editing={editingRetention}
            onToggleEdit={() => setEditingRetention((current) => !current)}
          />
          <div className="mt-5 space-y-4">
            <div>
              <FieldLabel
                label="Document Version Retention"
                hint="How many historical versions to keep for each document."
              />
              <DropdownSelect
                value={settings.versionRetention}
                onChange={(value) => update("versionRetention", value || "10")}
                options={versionOptions}
                disabled={!editingRetention}
                aria-label="Document Version Retention"
              />
            </div>
            <div>
              <FieldLabel
                label="Document Retention Period"
                hint="How long published documents stay in the system."
              />
              <DropdownSelect
                value={settings.retentionPeriod}
                onChange={(value) => update("retentionPeriod", value || "7y")}
                options={retentionOptions}
                disabled={!editingRetention}
                aria-label="Document Retention Period"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeading
            icon={<Sparkles className="h-5 w-5" />}
            title="Document Processing"
            description="AI processing for uploaded policy files."
            editing={editingProcessing}
            onToggleEdit={() => setEditingProcessing((current) => !current)}
          />
          <div className="mt-5">
            <SettingToggle
              label="Automatic Document Processing"
              hint="Generate summaries and keywords after upload."
              description="AI processing for summaries and keywords."
              checked={settings.autoProcessing}
              disabled={!editingProcessing}
              onChange={(checked) => update("autoProcessing", checked)}
            />
          </div>
        </section>

        <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <CardHeading
            icon={<Cloud className="h-5 w-5" />}
            title="Storage Settings"
            description="Choose where uploaded documents are stored."
            editing={editingStorage}
            onToggleEdit={() => setEditingStorage((current) => !current)}
          />
          <div className="mt-5 space-y-4">
            <div>
              <FieldLabel
                label="Default Storage Location"
                hint="Primary destination for newly uploaded files."
              />
              <DropdownSelect
                value={settings.storageLocation}
                onChange={(value) => update("storageLocation", value || "supabase")}
                options={storageOptions}
                disabled={!editingStorage}
                aria-label="Default Storage Location"
              />
            </div>
            <div>
              <FieldLabel label="Storage Provider" hint="Connection status of the selected storage provider." />
              <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3">
                <span className="text-sm font-semibold text-slate-800">
                  {settings.storageLocation === "s3" ? "AWS S3" : "Supabase"}
                </span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-6">
        <CardHeading
          icon={<Lock className="h-5 w-5" />}
          title="Document Security & Access"
          description="Configure document security and access defaults."
          editing={editingSecurity}
          onToggleEdit={() => setEditingSecurity((current) => !current)}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SettingToggle
            label="Encrypt Documents"
            hint="Encrypt files stored in the document repository."
            description="Encrypt documents at rest."
            checked={settings.encryptDocuments}
            disabled={!editingSecurity}
            onChange={(checked) => update("encryptDocuments", checked)}
          />
          <SettingToggle
            label="Scan for Malware"
            hint="Scan each upload before it is stored."
            description="Scan uploaded files for threats."
            checked={settings.scanMalware}
            disabled={!editingSecurity}
            onChange={(checked) => update("scanMalware", checked)}
          />
          <SettingToggle
            label="Restrict Download"
            hint="Limit downloads to users with permission."
            description="Prevent unauthorized downloads."
            checked={settings.restrictDownload}
            disabled={!editingSecurity}
            onChange={(checked) => update("restrictDownload", checked)}
          />
          <SettingToggle
            label="Watermark Documents"
            hint="Stamp downloaded files with a watermark."
            description="Add watermark to downloaded files."
            checked={settings.watermarkDocuments}
            disabled={!editingSecurity}
            onChange={(checked) => update("watermarkDocuments", checked)}
          />
          <SettingToggle
            label="Audit Document Access"
            hint="Keep an activity log for document views and downloads."
            description="Log document access and activity."
            checked={settings.auditAccess}
            disabled={!editingSecurity}
            onChange={(checked) => update("auditAccess", checked)}
          />
        </div>
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-[var(--color-active-menu)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>These settings apply to all documents uploaded and managed in the system.</p>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetToDefault}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Default
        </button>
        <button
          type="button"
          onClick={saveChanges}
          disabled={!isDirty}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-active-menu)] px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
