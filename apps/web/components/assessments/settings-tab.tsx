"use client";

import { RotateCcw } from "lucide-react";
import { DashboardPanel } from "../dashboard/primitives";
import { DropdownSelect } from "../ui/dropdown-select";
import { createDefaultSettings, type AssessmentSettings } from "./types";
import { cx, fieldInputClassName, fieldTextareaClassName, Toggle } from "./ui";

type SettingsTabProps = {
  settings: AssessmentSettings;
  onSettingsChange: (settings: AssessmentSettings) => void;
  policyTitle: string;
};

export default function SettingsTab({
  settings,
  onSettingsChange,
  policyTitle,
}: SettingsTabProps) {
  function update<Key extends keyof AssessmentSettings>(key: Key, value: AssessmentSettings[Key]) {
    onSettingsChange({ ...settings, [key]: value });
  }

  return (
    <div className="space-y-4">
      <DashboardPanel title="Assessment Details">
        <div className="space-y-3.5">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Assessment Title</span>
            <input
              value={settings.title}
              onChange={(event) => update("title", event.target.value)}
              className={cx("mt-2", fieldInputClassName)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Description</span>
            <textarea
              value={settings.description}
              onChange={(event) => update("description", event.target.value)}
              rows={2}
              className={cx("mt-2", fieldTextareaClassName)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Instructions for Employees</span>
            <textarea
              value={settings.instructions}
              onChange={(event) => update("instructions", event.target.value)}
              rows={3}
              className={cx("mt-2", fieldTextareaClassName)}
            />
            <span className="mt-1.5 block text-xs text-slate-400">
              Shown on the start screen before the employee begins.
            </span>
          </label>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Scoring & Attempts">
        <div className="grid gap-3.5 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-500">Passing Score (%)</span>
            <div className="relative mt-2">
              <input
                type="number"
                min={0}
                max={100}
                value={settings.passingScore}
                onChange={(event) =>
                  update("passingScore", Math.min(100, Math.max(0, Number(event.target.value) || 0)))
                }
                className={cx(fieldInputClassName, "pr-9")}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                %
              </span>
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Maximum Attempts</span>
            <DropdownSelect
              value={String(settings.maximumAttempts)}
              onChange={(value) => {
                if (value) update("maximumAttempts", Number(value));
              }}
              options={[
                { value: "0", label: "Unlimited" },
                ...[1, 2, 3, 5].map((attempts) => ({
                  value: String(attempts),
                  label: `${attempts} ${attempts === 1 ? "attempt" : "attempts"}`,
                })),
              ]}
              allowClear={false}
              className="mt-2"
              aria-label="Maximum Attempts"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-500">Wait Between Retakes</span>
            <DropdownSelect
              value={String(settings.retakeWaitHours)}
              onChange={(value) => {
                if (value) update("retakeWaitHours", Number(value));
              }}
              options={[
                { value: "0", label: "No waiting period" },
                ...[1, 4, 24, 48].map((hours) => ({
                  value: String(hours),
                  label: `${hours} ${hours === 1 ? "hour" : "hours"}`,
                })),
              ]}
              allowClear={false}
              className="mt-2"
              aria-label="Wait Between Retakes"
            />
          </label>
        </div>

        <label className="mt-3.5 block sm:max-w-[240px]">
          <span className="text-xs font-bold text-slate-500">Time Limit</span>
          <DropdownSelect
            value={String(settings.timeLimitMinutes)}
            onChange={(value) => {
              if (value) update("timeLimitMinutes", Number(value));
            }}
            options={[
              { value: "0", label: "No time limit" },
              ...[10, 15, 20, 30, 45, 60].map((minutes) => ({
                value: String(minutes),
                label: `${minutes} Minutes`,
              })),
            ]}
            allowClear={false}
            className="mt-2"
            aria-label="Time Limit"
          />
        </label>
      </DashboardPanel>

      <DashboardPanel title="Question Behaviour">
        <div className="space-y-4">
          <Toggle
            label="Randomize Questions"
            description="Each employee sees the questions in a different order."
            checked={settings.randomizeQuestions}
            onChange={(checked) => update("randomizeQuestions", checked)}
          />
          <Toggle
            label="Shuffle Answer Choices"
            description="Reorders the answer choices within each question."
            checked={settings.shuffleAnswerChoices}
            onChange={(checked) => update("shuffleAnswerChoices", checked)}
          />
          <Toggle
            label="Show Explanation After Answer"
            description="Reveals the explanation once the employee answers a question."
            checked={settings.showExplanationAfterAnswer}
            onChange={(checked) => update("showExplanationAfterAnswer", checked)}
          />
          <Toggle
            label="Allow Review After Submission"
            description="Lets the employee revisit their answers after submitting."
            checked={settings.allowReviewAfterSubmission}
            onChange={(checked) => update("allowReviewAfterSubmission", checked)}
          />
          <Toggle
            label="Show Score Immediately"
            description="Displays the result as soon as the assessment is submitted."
            checked={settings.showScoreImmediately}
            onChange={(checked) => update("showScoreImmediately", checked)}
          />
        </div>
      </DashboardPanel>

      <DashboardPanel title="Acknowledgement Rules">
        <div className="space-y-4">
          <Toggle
            label="Require a Passing Score to Acknowledge"
            description="The policy acknowledgement is only recorded once the employee passes."
            checked={settings.requirePassToAcknowledge}
            onChange={(checked) => update("requirePassToAcknowledge", checked)}
          />
          <Toggle
            label="Issue a Certificate on Pass"
            description="Generates a downloadable certificate for the employee's record."
            checked={settings.issueCertificateOnPass}
            onChange={(checked) => update("issueCertificateOnPass", checked)}
          />
          <Toggle
            label="Notify Compliance on Repeated Failure"
            description="Alerts the compliance team when an employee fails every allowed attempt."
            checked={settings.notifyOnFailure}
            onChange={(checked) => update("notifyOnFailure", checked)}
          />
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() =>
              onSettingsChange({ ...createDefaultSettings(policyTitle), status: settings.status })
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to defaults
          </button>
        </div>
      </DashboardPanel>
    </div>
  );
}
