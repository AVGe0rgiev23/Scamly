// Our one import of Zod (the library that checks input data). Every file imports
// `z` from here, never from "zod" directly, so this setting is always applied first.
//
// jitless: Zod normally tests whether the browser allows eval() (by creating a
// function from text) to build faster checkers. Our security policy forbids eval()
// (docs/security.md), so that test is blocked and the browser reports a security
// violation. With jitless Zod does not try at all; the checks work the same, only a
// tiny bit slower, which nobody notices on our small forms.

import { z } from "zod";

z.config({ jitless: true });

export { z };
