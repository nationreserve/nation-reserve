import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("trust verification migration", () => {
  it("separates identity, business, representative, and payout verification", async () => {
    const sql = await readFile(
      resolve(
        "migrations",
        "0042_trust_verification_and_employer_downpayment_rule.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("CREATE TABLE individual_identity_verifications");
    expect(sql).toContain("CREATE TABLE organization_verification_profiles");
    expect(sql).toContain("CREATE TABLE organization_verification_documents");
    expect(sql).toContain("CREATE TABLE employer_contract_downpayments");
    expect(sql).toContain("CREATE TABLE contract_payment_integrity_states");
    expect(sql).toContain("CREATE TABLE contract_payment_integrity_history");
    expect(sql).toContain("business_verification_status");
    expect(sql).toContain("representative_authorization_status");
    expect(sql).toContain("contracts.employer_downpayment_basis_points");
    expect(sql).toContain("'1000'::jsonb");
    expect(sql).toContain("work_authorization_suspended");
    expect(sql).toContain("estimated_contract_value_cents");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).not.toMatch(/raw_identity|document_url|ssn|date_of_birth/i);
  });
});
