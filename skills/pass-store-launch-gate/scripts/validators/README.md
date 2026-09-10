# Bundled launch validators

Copyright Zid. Distributed under the public maharat-skills repository license.

These five deterministic validators are bundled so installing `pass-store-launch-gate` does not require sibling skills. They are maintained by Zid; no runtime download, package install, or network access is needed.

| Validator | Origin skill | Origin file SHA-256 |
| --- | --- | --- |
| `validate-compliance-audit.mjs` | `audit-commerce-compliance` | `234126e34679ed523e09cc5060a69f0ca427c6b3fb93a11563e8835caeaf5ddd` |
| `validate-trust-center.mjs` | `build-trust-center` | `a2c0b5cf98216b024b4bc4ed7872004d0862aab4689c25f7456a78544b0ed256` |
| `validate-order-journey-test.mjs` | `test-order-payment-shipping` | `41551d1994b3d1008ae87a881db61f1d16a05582608d67df7c7d0a8f1a3cabe4` |
| `validate-launch-campaign.mjs` | `plan-store-launch-campaign` | `61728c6f169838c0e4af46745b41676e81e60608ed8422e183fe7cc3dde8064f` |
| `validate-launch-measurement.mjs` | `define-launch-measurement` | `9d54ce45f5b993e0df0f5b8c15445d06eae0b13ef4b2a4266125a18b07a3cb6f` |

The first four validators retain their source bytes. The measurement validator only changes evidence-root resolution: its optional second argument selects the evidence bundle, defaulting to its input file directory. The launch gate passes its own evidence root explicitly. All validation rules are preserved.

When updating a bundled validator, run the launch gate regression suite and the originating validator tests before releasing. Fixture references are package-portable and their SHA-256 report and approval bindings were regenerated after relocation. These fixtures and approvals are synthetic test data, not merchant records or legal approval.
