// Temporary pre-launch access gate configuration.
//
// This is the single toggle for the public passcode gate. It is separate
// from the Nation Reserve user login/signup system.
//
// TO REMOVE THE GATE:
//   Set ENABLED to `false` (or set VITE_SITE_PASSCODE to an empty string in
//   the build environment), then redeploy the web app. When disabled the
//   PasscodeGate component renders the site immediately with no behaviour
//   change to any existing feature.
//
// NOTE: this passcode is a deliberately-shared, temporary access gate, not a
// security boundary. It ships in the client bundle and is obvious to anyone
// inspecting the site; do not rely on it for anything sensitive.

export const SITE_PASSCODE: {enabled: boolean; passcode: string} = {
  enabled: import.meta.env["VITE_SITE_PASSCODE_ENABLED"]
    ? import.meta.env["VITE_SITE_PASSCODE_ENABLED"] !== "false"
    : true,
  passcode: import.meta.env["VITE_SITE_PASSCODE"] || "vault",
};