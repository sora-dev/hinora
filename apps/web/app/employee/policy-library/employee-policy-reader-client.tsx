"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import PolicyReaderExperience from "../../../components/policy-library/policy-reader-experience";

export default function EmployeePolicyReaderClient() {
  const params = useParams<{ policyId: string }>();
  const policyId = useMemo(() => {
    const value = params?.policyId;
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }, [params]);

  return (
    <PolicyReaderExperience
      mode="employee"
      policyId={policyId}
      profileName="John Dela Cruz"
      profileRole="IT Department"
      avatarText="J"
    />
  );
}
