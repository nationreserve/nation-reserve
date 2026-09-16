import {useState, type FormEvent, type ReactNode} from "react";
import {SITE_PASSCODE} from "./site-access.js";

// Temporary pre-launch access gate for the public site.
//
// It shows a simple passcode screen in front of the whole app (homepage,
// login/signup, and every other route) until the correct passcode is
// entered. It is completely separate from the Nation Reserve auth/login
// system and from the existing routing in RootApp.
//
// Once the correct passcode is entered, the app is unlocked for the rest of
// the current tab session (forgotten when the tab is closed).
//
// TO REMOVE: open src/site-access.ts and set ENABLED to false (or delete this
// wrapper from main.tsx). While disabled this component renders its children
// immediately with no gate and no behaviour change.

const UNLOCK_FLAG = "rwp-site-unlocked";

export function PasscodeGate({children}: {children: ReactNode}) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(UNLOCK_FLAG) === "1";
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  if (!SITE_PASSCODE.enabled) return <>{children}</>;

  if (isUnlocked) return <>{children}</>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value === SITE_PASSCODE.passcode) {
      try {
        sessionStorage.setItem(UNLOCK_FLAG, "1");
      } catch {
        /* sessionStorage unavailable: still unlock for this page load */
      }
      setError(false);
      setIsUnlocked(true);
    } else {
      setError(true);
    }
  }

  return (
    <div className="passcode-gate" role="presentation">
      <form className="passcode-gate__card" onSubmit={submit}>
        <p className="passcode-gate__eyebrow">Nation Reserve</p>
        <h1 className="passcode-gate__title">Access code required</h1>
        <p className="passcode-gate__hint">
          This site is currently in a limited access phase. Enter the access
          code to continue.
        </p>
        <input
          className="passcode-gate__input"
          type="password"
          name="passcode"
          autoFocus
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(false);
          }}
          aria-invalid={error}
          aria-label="Access code"
          placeholder="Access code"
          autoComplete="off"
        />
        {error && (
          <p className="passcode-gate__error" role="alert">
            That access code is incorrect.
          </p>
        )}
        <button className="passcode-gate__button" type="submit">
          Enter
        </button>
      </form>
    </div>
  );
}