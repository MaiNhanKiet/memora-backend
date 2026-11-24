> **Repository snapshot, 2026-11-13.** The source of truth is the Google Doc:
> https://docs.google.com/document/d/1YOhWSWpjXaP-XGR-DxVmhNug6MzMc8WW/edit
> If this copy and the Google Doc differ, the Google Doc wins. Update the Google Doc first, then refresh this snapshot.
> Known pending update: section 6, WF-01 "Supporting members" row (line about Phạm Quốc Duy, "source processing, consent-scope and Operations handoff"). The team decided on 2026-11-13 that Mai Nhân Kiệt implements Operations Personalization and Duy implements Commerce (see `docs/plans/active/operations-personalization.md`, section 8).

**SWP490 · CAPSTONE PROJECT · REVIEW 2 · BM04**

# **Review 2 Commitment**

*Form BM04. Completed within 3 working days after Review 2 and confirmed by both reviewers and the supervisor. This document is the sole basis for Defense 1.1 and the Viva. One block per main workflow (section 6) and one block per member (section 7): duplicate or delete blocks to match the team. Export to PDF. File name: SWP490\_\<ProjectCode\>\_R2_Commitment.pdf*

## **1. Project Information**

| **Project code**  | FA26SE196                                                            |
|-------------------|----------------------------------------------------------------------|
| **Project name**  | Memora – 3D Personalized Ring Design System Integrated with LightRAG |
| **Team**          | GFA26SE51 (four members)                                             |
| **Supervisor**    | Nguyễn Minh Sang                                                     |
| **Review 2 date** | October 28, 2026                                                     |
| **Reviewer 1**    | To be confirmed                                                      |
| **Reviewer 2**    | To be confirmed                                                      |
| **Version**       | v1.0                                                                 |
| **Date**          | November 2, 2026                                                     |

## **2. Final Registration Form**

| **Final version**                 | Awaiting confirmation of the approved final version |
|-----------------------------------|-----------------------------------------------------|
| **Approved at Review 2 (Yes/No)** | Pending verification against the Review 2 record    |
| **Attached file name**            | Phieu_FA26SE196_v1.docx                             |

*After this point the project scope does not change.*

## **3. Mandatory Features**

| **ID** | **Feature**                                  | **Actor**                                | **Acceptance criteria**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **Workflow**  | **Owner**         |
|--------|----------------------------------------------|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------------|
| F-01   | Ring Design and Shopping Cart                | Customer / Guest                         | Customers can configure available ring designs, preview valid options and estimated prices, and select one or two saved designs for checkout. After successful Order creation, only the selected Cart Drafts become CONVERTED and leave the active Cart; unselected Drafts remain available.                                                                                                                                                                                                                                                                                                                                                                | WF-01         | Trần Tuấn Kiệt    |
| F-02   | Fingerprint and Soundwave Personalization    | Registered Customer                      | Before the initial deposit (P1), registered customers receive a clear FP/SW data-processing and privacy/Consent notice and must acknowledge that P1 is not refunded solely if they refuse the required Consent after payment (subject to mandatory legal rights). After P1 succeeds, the customer must explicitly accept source- and Ring Item-scoped informed Consent before actual fingerprint capture or audio upload/processing; design approval and submission follow valid source preparation.                                                                                                                                                        | WF-01         | Phạm Vũ Khánh Như |
| F-03   | Order Placement and Optional Services        | Customer / Guest                         | Customers can place an order and choose an optional maintenance plan for each ring. Guest orders are limited to non-personalized rings and require verified email contact. Personalized orders require an account and an initial deposit; non-personalized orders do not require an advance payment.                                                                                                                                                                                                                                                                                                                                                        | WF-01         | Mai Nhân Kiệt     |
| F-04   | Design Review and Final Price Confirmation   | Manager / Customer                       | Personalized designs are reviewed before production. The final quotation includes all selected rings and services, and customers confirm the agreed designs and total price before manufacturing begins.                                                                                                                                                                                                                                                                                                                                                                                                                                                    | WF-02         | Phạm Quốc Duy     |
| F-05   | Ring Production and Quality Assurance        | Manager / Jeweler                        | Production begins only after the required approvals and payments are complete. The work and quality checks for each ring are recorded, and the order can proceed to handover only when every ring meets the agreed quality standards.                                                                                                                                                                                                                                                                                                                                                                                                                       | WF-02         | Phạm Quốc Duy     |
| F-06   | Final Payment and Sales Documents            | Customer / Guest / Store Staff           | Once all rings pass final quality checks, the customer settles the remaining order balance. Non-personalized orders normally pay the full amount at this stage; personalized orders pay the outstanding balance after their initial deposit (P1) and pre-production payment (P2). For All-NONE store pickup, verified PayOS or authorized Store cash is allowed; for FP/SW P3, verified PayOS applies unless an additional cash policy is formally approved. Delivery requires verified PayOS payment before dispatch, with no cash on delivery. Each successful payment has a PDF receipt, and an order-level PDF final invoice is issued before handover. | WF-03         | Mai Nhân Kiệt     |
| F-07   | Customer Collection and Delivery             | Recipient / Store Staff / Delivery Staff | Customers may collect their order at the store or receive delivery within Ho Chi Minh City. For pickup, authorized Store Staff verifies the recipient and records pickup evidence; for delivery, assigned Delivery Staff verifies the recipient and records proof of delivery. The order is completed only after all rings are physically handed over and the required evidence is saved.                                                                                                                                                                                                                                                                   | WF-03         | Phạm Vũ Khánh Như |
| F-08   | After-purchase Benefits and Digital Memories | Customer / Recipient / System            | Warranty and purchased maintenance plans become active for each ring after successful handover. For eligible rings with digital memory selected, owners can manage protected sharing: fingerprint rings offer a private memory page, while soundwave rings offer recorded audio and a supported augmented reality experience. These optional activities do not delay order completion.                                                                                                                                                                                                                                                                      | WF-03         | Phạm Vũ Khánh Như |
| F-09   | Warranty and Maintenance Services            | Customer / Manager / Jeweler             | Customers can request service for a ring they have received. Each request is assessed against the relevant warranty or maintenance terms, additional charges require prior approval, and the ring is inspected before being returned.                                                                                                                                                                                                                                                                                                                                                                                                                       | WF-04         | Phạm Quốc Duy     |
| F-10   | Returns, Refunds and After-sales Resolution  | Customer / Manager / Store Staff         | Eligible returns are assessed for each ring individually. Refunds are processed after the returned ring has been received and checked, and the request is closed only when the agreed resolution and related obligations have been fulfilled.                                                                                                                                                                                                                                                                                                                                                                                                               | WF-04         | Mai Nhân Kiệt     |
| F-11   | LightRAG-Assisted Jewelry Consultation       | Customer / Manager                       | Customers can receive guidance on suitable ring designs, materials, sizes, gemstones and product care based on approved jewelry knowledge. Managers can maintain the information used for consultation, and recommendations do not change a customer's choices or determine the final price.                                                                                                                                                                                                                                                                                                                                                                | WF-01         | Trần Tuấn Kiệt    |
| F-12   | Engraving Design and Production Preparation  | Customer / Manager / Jeweler             | For Fingerprint, the customer can adjust engraving position, scale (within template-defined minimum and maximum limits), and rotation within the permitted engraving surface. For Soundwave, the customer uploads a supported audio file or records audio directly in the app (up to 30 seconds), then selects exactly 3 seconds for engraving; the resulting engraving uses template-defined fixed position, dimensions, and orientation without further adjustment. Production output must match the approved Ring Item Version and may be released only after final confirmation and production authorization.                                           | WF-01 / WF-02 | Trần Tuấn Kiệt    |
| F-13   | Knowledge and Personal Data Protection       | Manager / Administrator                  | Only approved information may be used for jewelry consultation. Fingerprints, sound recordings and private memories are accessible only to authorized people. Consent and eligible requests to remove personal information must be documented and handled through the appropriate supporting procedures.                                                                                                                                                                                                                                                                                                                                                    | WF-01 / WF-03 | Mai Nhân Kiệt     |

## **4. Non-Functional Requirements**

| **ID**       | **Quality attribute**        | **Metric**                                                                                                        | **Threshold**                                                                                           | **Measurement method**                                                                                                                                                                                                | **Owner**         |
|--------------|------------------------------|-------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| **NFR-P-01** | API and LightRAG performance | Response time of standard catalog/configuration/order/tracking APIs and normal jewelry consultation.              | Standard APIs: ≤ 2 s. LightRAG: \< 20 s (expected demonstration load; draft).                           | Timed API and AI requests using documented datasets, environment and load; confirm percentile.                                                                                                                        | Mai Nhân Kiệt     |
| **NFR-R-01** | Transactional reliability    | Duplicate orders, payment postings, Certified Gemstone reservations, locks or handover completions after retries. | 0 duplicate or invalid state advances in approved retry, webhook and concurrency scenarios.             | Integration tests for replay, timeout and concurrent requests; cover All-NONE and FP/SW paths.                                                                                                                        | Phạm Quốc Duy     |
| **NFR-S-01** | Authorization and privacy    | Unauthorized cross-account access or leakage of fingerprint, audio, Memory, PIN and other protected data.         | 0 successful unauthorized access; 0 protected payload exposure in public previews, logs or LightRAG.    | RBAC/resource-ownership negative tests; inspect API outputs, audit logs and AI knowledge corpus.                                                                                                                      | Mai Nhân Kiệt     |
| **NFR-S-02** | Token and PIN security       | Acceptance of expired/replayed recipient QR or invitation; ineffective Memory PIN lockout.                        | 0 accepted expired/reused tokens; PIN locked for 15 min after 5 consecutive failed attempts.            | Automated expiry/replay/revocation tests and Memory PIN attempt-limit tests.                                                                                                                                          | Phạm Quốc Duy     |
| **NFR-I-01** | Production design integrity  | Mismatch between approved/locked Ring Item Version and exported laser package or engraving bounds.                | 0 out-of-zone exports; locked version/package immutable; required design references/checksum match.     | Compare FP position/scale/rotation (including template min/max) and SW selected segment/fixed template geometry against production SVG/DXF/preview; test invalid bounds, unauthorized SW transforms and lock changes. | Trần Tuấn Kiệt    |
| **NFR-U-01** | Usability and error recovery | Correct guidance for invalid configuration, expired Cart/Design Code, payment and recipient access.               | All approved critical task and recovery scenarios pass; numerical usability threshold still to approve. | Scenario-based UI tests across Guest, Customer, Staff and Recipient; log blocked/recovered tasks.                                                                                                                     | Phạm Vũ Khánh Như |
| **NFR-Q-01** | Test evidence and readiness  | Critical-rule unit coverage, major integration-path coverage and unresolved critical defects.                     | ≥ 80% critical-rule unit scope; ≥ 90% integration paths; 0 critical defects (Report 2 plan).            | CI coverage, test-to-MF traceability, defect register and Report 5 evidence.                                                                                                                                          | Mai Nhân Kiệt     |

## **5. Out of Scope**

| **Item**                                                      | **Reason**                                                                                                                                                                                                                                                     |
|---------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Other Jewelry Categories**                                  | MEMORA focuses on personalized rings. Necklaces, bracelets and other jewelry products are not included.                                                                                                                                                        |
| **Creation of Entirely New Ring Models**                      | Customers personalize approved ring designs using supported options. Creating a new ring structure from scratch is not included.                                                                                                                               |
| **Virtual Ring Try-On**                                       | Customers can preview ring designs in 3D, but the system does not simulate a ring on a person's hand through a camera. Digital Memory WebAR remains supported.                                                                                                 |
| **Remote Fingerprint Collection**                             | Fingerprint collection takes place at the store using approved equipment, rather than through a customer's phone. Soundwave supports direct in-app recording (up to 30 seconds) and audio-file upload; only a selected 3-second segment is used for engraving. |
| **Autonomous AI Pricing, Approval and After-sales Decisions** | LightRAG provides advisory recommendations using approved jewelry knowledge. Final pricing, design approval, production authorization and after-sales decisions remain controlled by business rules and authorized personnel.                                  |
| **Direct Laser Machine Control**                              | MEMORA prepares approved engraving designs for production. Direct machine control and calibration remain the responsibility of qualified operators.                                                                                                            |
| **Delivery Outside Ho Chi Minh City and Cash on Delivery**    | Delivery is limited to supported addresses in Ho Chi Minh City and requires payment before dispatch. Eligible in-store collection may still be paid for in cash.                                                                                               |
| **Live GPS Delivery Tracking**                                | Customers can check delivery progress through order updates, but continuous map-based tracking of delivery personnel is not provided.                                                                                                                          |
| **Partial Order Handover**                                    | All rings in an order must meet quality requirements before the order is handed over in full. Individual production records and eligible after-sales services remain supported.                                                                                |
| **Returns Solely Due to Changed Preferences**                 | A change of preference alone does not qualify for a refund. Eligible returns under the stated policy and appropriate paid alterations remain available.                                                                                                        |
| **Standalone Digital Memory Services**                        | Digital Memory is an optional benefit provided at no additional charge for eligible fingerprint or soundwave rings; it is not sold as an independent service.                                                                                                  |

## **6. Workflow Commitments**

### **6.1 Workflow WF-01**

| **Workflow name**                       | Configure & Place Ring Order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner (one member)**                  | Mai Nhân Kiệt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Supporting members**                  | Trần Tuấn Kiệt — Web FE: Catalog, Ring Studio/3D preview, Cart, LightRAG consultation and engraving placement (F-01/F-11/F-12); Phạm Vũ Khánh Như — Mobile FE: Fingerprint/Soundwave source, consent and item approval screens (F-02); Phạm Quốc Duy — BE: source processing, consent-scope and Operations handoff integration. The F-01/F-11/F-12 codes are feature IDs listed in Section 3 (Mandatory Features). The WF-01 owner presents the demo; each feature has its own technical owner in Section 3. |
| **Actors**                              | Customer / Guest; Store Staff; PayOS; Fingerprint IoT device                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Trigger**                             | Customer/Guest browses the active ring catalog and starts configuration; order placement follows valid checkout.                                                                                                                                                                                                                                                                                                                                                                                             |
| **Business outcome**                    | A valid 1–2-ring Order with provisional quote; FP/SW current versions SUBMITTED after consent, source processing and customer approval; NONE versions REVIEW_NOT_REQUIRED.                                                                                                                                                                                                                                                                                                                                   |
| **Main entity state path**              | Cart ACTIVE → Draft IN_CART → Order + Version V1 → FP/SW: P1 SUCCEEDED → READY_FOR_REVIEW → SUBMITTED; All-NONE: REVIEW_NOT_REQUIRED (no P1).                                                                                                                                                                                                                                                                                                                                                                |
| **Activity diagram (Report 4 section)** | MF01 source: MF01.md Sections 4–8. Related Report 4 sections: Section 3.2 (Catalog/Design Draft), Section 3.3 (Ring Configuration), Section 3.4 (Order/Source). A finalized 4-WF Activity Diagram reference is not yet present in Report 4.                                                                                                                                                                                                                                                                  |

**Features in this workflow**

<table>
<colgroup>
<col style="width: 11%" />
<col style="width: 26%" />
<col style="width: 43%" />
<col style="width: 19%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Feature ID</strong></th>
<th><strong>Feature</strong></th>
<th><strong>Acceptance criteria</strong></th>
<th><strong>Test case IDs</strong></th>
</tr>
<tr class="odd">
<th>F-01</th>
<th>Ring Design and Shopping Cart</th>
<th>AC1. Customer/Guest selects an ACTIVE Ring Template, material, size, gemstone layout and one supported package; incompatible combinations and unsupported resize are rejected.<br />
AC2. 3D preview and Estimated Price reflect configuration, gemstone, resize and optional Maintenance Plan; price/availability changes require confirmation at checkout.<br />
AC3. Add to Cart creates an IN_CART Ring Design Draft in ACTIVE Cart; selecting 1–2 Drafts creates an Order, while unselected Drafts remain. The cart holds no stock.<br />
AC4. Checkout revalidates configuration, price and inventory. Only after Create Order succeeds do the selected IN_CART Drafts become CONVERTED and leave the active Cart; other Drafts remain IN_CART. Failed Create Order must not convert any Draft.<br />
AC5. Design Code can be issued only for a valid persisted Ring Design Draft IN_CART in an ACTIVE Cart. Valid redemption on another device clones configuration into a new Draft in the receiving session's ACTIVE Cart after current template/option/price revalidation; the original Draft, Cart ownership and any Order remain unchanged.<br />
AC6. Expired, revoked, invalid or guessed Design Codes are rejected without protected-data disclosure. Codes are difficult to guess, use expiry and abuse controls, and never reveal FP/audio, Memory, Consent, Order, payment or owner data. A sanitized read-only design-share link is not a redeemable Design Code.<br />
AC7. Guest Drafts persist only within a valid Guest Cart/session. After successful Login/Register from that authenticated source session, eligible IN_CART Drafts may be merged into the Customer Cart with conflict handling and no silent overwrite; expired/foreign sessions are rejected. Matching email does not automatically claim an earlier Guest Order.</th>
<th>TC-WF01-F-01-01<br />
TC-WF01-F-01-02<br />
TC-WF01-F-01-03<br />
TC-WF01-F-01-04 — Valid code on second device -&gt; cloned Draft; original unchanged.<br />
TC-WF01-F-01-05 — Expired/revoked/guessed code -&gt; reject; no protected data leaked.<br />
TC-WF01-F-01-06 — Catalog/price changed -&gt; revalidate and request confirmation.<br />
TC-WF01-F-01-07 — Valid Guest session + login -&gt; merge Drafts without overwrite.<br />
TC-WF01-F-01-08 — Expired/foreign Guest session -&gt; reject; conflicts handled safely.<br />
TC-WF01-F-01-09 — Same-email Guest Order -&gt; no automatic account ownership.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="header">
<th>F-02</th>
<th>Fingerprint and Soundwave Personalization</th>
<th>AC1. Before checkout/P1, FP/SW customers can read the mandatory data-processing and privacy/Consent requirements. Formal, versioned, source- and Ring Item-scoped Consent is recorded after verified P1 success but before any actual FP capture or SW upload/processing; reading the notice does not count as Consent. If the customer declines Consent after successful P1, source collection and item submission remain blocked; P1 is not refunded solely for that refusal. This term must be clearly disclosed and acknowledged before P1, subject to mandatory legal exceptions.<br />
AC2. FP is captured in-store with Staff/IoT and ACCEPTED quality (max 3 attempts/session); SW audio may be uploaded in a supported format or recorded in-app (maximum 30 seconds), and the customer selects one exact 3-second segment from the provided audio for engraving. The resulting waveform must comply with the fixed ring-template geometry.<br />
AC3. SHARED/SEPARATE applies only to two FP or two SW items; shared original source does not share design, placement, version or approval.<br />
AC4. Each FP/SW item uses its accepted actual source: FP supports bounded position/scale/rotation, whereas SW permits audio-segment selection only, with fixed template-defined engraving geometry. Optional free Digital Memory remains opt-in; each item requires independent Customer Approval before SUBMITTED.<br />
AC5. SW supports a valid supported audio-file upload or direct in-app recording up to 30 seconds. Only one exact 3-second segment may be selected for engraving; short/invalid input, a selection of another duration, or a recording beyond the limit is rejected. P1 success and valid scoped Consent precede actual audio collection/processing.<br />
AC6. For two SW items under SHARED source plan, only the consent-authorized original audio is reused; each Ring Item independently selects its 3-second segment and maintains its own waveform asset, version, preview and Customer Approval before SUBMITTED.</th>
<th>TC-WF01-F-02-01<br />
TC-WF01-F-02-02<br />
TC-WF01-F-02-03<br />
TC-WF01-F-02-04 — SW upload + exactly 3s -&gt; waveform; invalid duration rejected.<br />
TC-WF01-F-02-05 — SW in-app recording &lt;=30s with P1/Consent -&gt; process; else block.<br />
TC-WF01-F-02-06 — Two SW, SHARED original -&gt; independent segments, versions, approvals.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="odd">
<th>F-03</th>
<th>Order Placement and Optional Services</th>
<th>AC1. Guests may create only All-NONE Order after verified email; any FP/SW requires a registered Customer before Order creation.<br />
AC2. A valid checkout from 1–2 selected Drafts creates Order, Ring Item V1 snapshots and Provisional Quote; Plan is optional per item for NONE/FP/SW.<br />
AC3. All-NONE skips P1 and personalization and yields REVIEW_NOT_REQUIRED; FP/SW P1 equals 30% of active Provisional Order Total (including selected Plan).<br />
AC4. Certified gemstone items atomically HOLD sufficient distinct stones on Create Order; FP/SW reserves after P1 success, while All-NONE reservation is deferred to WF-02.<br />
AC5. A verified-email Guest may create an All-NONE Order of 1–2 NONE Ring Items without account, P1, P2, FP/SW source or Digital Memory. A Guest checkout containing FP/SW is blocked until Login/Register; successful Create Order alone converts selected Drafts, and a failed transaction rolls back without cart loss.<br />
AC6. All-NONE Certified Gemstone HOLD at Create Order is temporary (15 minutes); an expired HOLD must be revalidated and re-HOLD/RESERVED at WF-02 Customer Final Confirmation before Production Lock. All-NONE still requires Final Quote/Confirmation, production authorization and Manager Final QC, followed by the remaining balance at WF-03.</th>
<th>TC-WF01-F-03-01<br />
TC-WF01-F-03-02<br />
TC-WF01-F-03-03<br />
TC-WF01-F-03-04 — Verified Guest, 1-2 NONE -&gt; Order, no P1/P2/Memory; FP blocked.<br />
TC-WF01-F-03-05 — Expired Certified HOLD -&gt; re-HOLD/RESERVE before lock.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="header">
<th>F-11</th>
<th>LightRAG-Assisted Jewelry Consultation</th>
<th>AC1. Customers receive grounded advice on ring design, materials, sizes, gemstones and care from ACTIVE/approved jewelry knowledge.<br />
AC2. Structured catalog filters and backend rules remain authoritative; AI advice cannot mutate selected design, inventory, consent or price.<br />
AC3. Unsupported knowledge or unavailable option is not presented as a valid purchasable configuration; Manager knowledge updates follow the approved supporting procedure.</th>
<th>TC-WF01-F-11-01<br />
TC-WF01-F-11-02<br />
TC-WF01-F-11-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
<tr class="odd">
<th>F-12</th>
<th>Engraving Design and Production Preparation (design part)</th>
<th>AC1. Before actual source collection, FP/SW mockup is view-only and cannot become a production engraving asset.<br />
AC2. For an accepted FP asset, the customer adjusts position, scale (within template-defined minimum/maximum limits), and rotation within ENGRAVE_SURFACE, forbidden-zone and physical constraints. For SW, the customer selects only an exact 3-second segment from uploaded or in-app recorded audio; position, scale and rotation remain fixed by the Ring Template.<br />
AC3. Approval is bound to the exact current item version and valid preview; production-relevant design changes after approval create a controlled new version, not an overwrite.<br />
AC4. For SW engraving, the accepted exact 3-second segment and waveform are bound to the approved Ring Item Version. Template-defined placement, size and orientation remain fixed; client attempts to translate, scale or rotate the SW engraving must be rejected by server-side validation.</th>
<th>TC-WF01-F-12-01<br />
TC-WF01-F-12-02<br />
TC-WF01-F-12-03<br />
TC-WF01-F-12-04 — SW exact 3s -&gt; fixed geometry; transforms blocked.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="header">
<th>F-13</th>
<th>Knowledge and Personal Data Protection (consent part)</th>
<th>AC1. Actual FP/SW collection, processing and cross-item sharing are blocked without valid, purpose-scoped informed consent tied to Ring Item(s).<br />
AC2. Source Plan change after collection revalidates Consent and requires re-consent / collection or relinking where scope changes; no silent source reuse.<br />
AC3. Shared design links are sanitized, read-only and revocable; no raw protected source, ownership transfer or private Order data leaks.</th>
<th>TC-WF01-F-13-01<br />
TC-WF01-F-13-02<br />
TC-WF01-F-13-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Demo scenarios**

<table>
<colgroup>
<col style="width: 9%" />
<col style="width: 10%" />
<col style="width: 20%" />
<col style="width: 24%" />
<col style="width: 21%" />
<col style="width: 12%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Scenario ID</strong></th>
<th><strong>Type</strong></th>
<th><strong>Preconditions and data</strong></th>
<th><strong>Main steps</strong></th>
<th><strong>Expected result</strong></th>
<th><strong>Presenter</strong></th>
</tr>
<tr class="odd">
<th><em>DS-01a</em></th>
<th><em>Main</em></th>
<th>Registered Customer; 2 ACTIVE templates; Item A = FP with optional Maintenance Plan and Memory ON; Item B = NONE; valid stock and PayOS test callback; fingerprint device available.</th>
<th>1. Browse/filter Catalog, view 3D and estimate prices for A/B.<br />
2. Add both valid Drafts to Cart; Checkout selects 2, reviews Plan, the FP privacy/Consent notice and the explicit P1 nonrefund term for post-payment Consent refusal before P1, then creates Order/V1 (only selected Drafts become CONVERTED).<br />
3. Verify P1 = 30% provisional total including Plan; submit trusted success. The prior data notice does not substitute for formal Consent.<br />
4. After verified P1 success, Customer explicitly accepts FP Consent scoped to the actual source/Ring Item; only then may Store capture an ACCEPTED fingerprint and process its asset.<br />
5. Place engraving on A, review optional Memory, Customer approves and SUBMITS A; NONE follows fast path.</th>
<th>After successful Create Order, only the two selected Drafts are CONVERTED and removed from the active Cart; any unselected Draft remains IN_CART. Order has 2 current V1 and a Provisional Quote. FP privacy/Consent requirements and the nonrefundable-P1-on-Consent-refusal term were disclosed and acknowledged before P1; formal FP Consent was recorded only after P1 success and before capture. A = SUBMITTED; B = REVIEW_NOT_REQUIRED. Plan remains PENDING; no Manager approval, Final Quote or Lock.</th>
<th>Mai Nhân Kiệt</th>
</tr>
<tr class="header">
<th><em>DS-01b</em></th>
<th><em>Exception</em></th>
<th>Registered Customer; two FP Ring Items; Source Plan initially SHARED; source A collected under Consent for both items; item designs are not production-locked.</th>
<th>1. Customer requests SHARED → SEPARATE after source collection.<br />
2. Validate current version/consent scope; mark affected approval or source links for revalidation.<br />
3. Ask for updated informed Consent; collect source B at Store if required.<br />
4. Re-link only authorized original/added sources to exact Ring Items.<br />
5. Reprocess/replace affected placement; Customer re-approves and submits current version.</th>
<th>No silent reuse across consent scope; blocked while consent or required source is absent. Each item has independent asset/design/approval and a valid submitted version. Recollection/change fees have no approved pricing policy. This demo verifies new Consent, source scope and relinking only; no additional customer charge is asserted.</th>
<th>Mai Nhân Kiệt</th>
</tr>
<tr class="odd">
<th></th>
<th></th>
<th></th>
<th></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Committed test cases**

| **Test type**                                 | **Count**                                                                                     | **Automated in CI**                                                                             | **Responsible member(s)** |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------------|
| *Feature tests (≥ 3 per feature)*             | ≥30 (18 original + 12 supplemental feature tests)                                             | Planned ≥15 feature cases in CI (not yet evidenced).                                            | Mai Nhân Kiệt             |
| *End-to-end workflow test (≥ 1)*              | ≥1                                                                                            | Planned 1 workflow E2E in CI; execution/evidence pending.                                       | Mai Nhân Kiệt             |
| *State transition tests (≥ 1 per transition)* | ≥1 test per transition documented in approved State Machine; enumerated after its completion. | Planned ≥50% of state-transition tests in CI; count follows approved transitions.               | Mai Nhân Kiệt             |
| *Total for this workflow*                     | ≥31 committed cases (19 original + 12 supplemental) + ≥1 per approved state transition.       | Planned CI ≥16/31 committed cases + ≥50% of state-transition cases; execution not yet verified. | Mai Nhân Kiệt             |

**Pass criteria at Defense 1.1**

| **Criterion**                                 | **Committed**                                                                         |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| *Runs end-to-end on staging with seeded data* | *Yes*                                                                                 |
| *Main scenario passes*                        | *Yes*                                                                                 |
| *Exception scenarios passing*                 | ≥80% of exception scenarios (target; reviewer sign-off pending).                      |
| *Test pass rate for this workflow*            | ≥90% of all workflow tests; 100% of mandatory-feature main-path tests (Viva minimum). |
| *Open Critical / High defects*                | *0*                                                                                   |

**Reviewer note**

<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 70%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Note</strong></th>
<th><p><strong>MEETING FEEDBACK SUMMARY — REFERENCE ONLY (31 Oct 2026)</strong></p>
<p>Consolidate browsing, ring configuration, mockup, Cart and Checkout into the customer goal of placing a customized-ring order; keep the 1–2 Ring Item limit as a business rule. Clarify Ring Template/Blank/Item/Version, allowed size/material/gemstone options, and an example of base price plus option charges. Distinguish the 3D mockup from the actual production input. The lecturer discussed five thematic areas, but did not formally mandate five independent Main Flows; the team should explain its four-flow choice.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **6.2 Workflow WF-02**

| **Workflow name**                       | Produce & Quality Check Ring Order                                                                                                                                                                                                                                                                                                                                                                                        |
|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner (one member)**                  | Trần Tuấn Kiệt                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Supporting members**                  | Phạm Quốc Duy — BE: Manager review, production authorization, Work Orders and independent QC (F-04/F-05); Mai Nhân Kiệt — BE: Final Quote, P2 settlement, payment/stock gates and lock integration; Phạm Vũ Khánh Như — Mobile FE: Jeweler Work Order and production-progress screens. WF-02 owner remains the workflow/demo presenter; implementation ownership is defined separately in Section 3 (Mandatory Features). |
| **Actors**                              | Manager; Customer / verified Guest; Jeweler; PayOS; laser/production services                                                                                                                                                                                                                                                                                                                                             |
| **Trigger**                             | WF-01 exit gate satisfied for all current Ring Item versions.                                                                                                                                                                                                                                                                                                                                                             |
| **Business outcome**                    | One order-level immutable Design Lock and authorized production; all Ring Items have the latest valid Manager Final QC PASS; Order READY_FOR_HANDOVER.                                                                                                                                                                                                                                                                    |
| **Main entity state path**              | FP/SW SUBMITTED → MANAGER_APPROVED (NONE: REVIEW_NOT_REQUIRED) → Final Quote/Confirmation → FP/SW P2 SATISFIED or All-NONE reservation gate → PRODUCTION_AUTHORIZED → IN_PRODUCTION → READY_FOR_HANDOVER.                                                                                                                                                                                                                 |
| **Activity diagram (Report 4 section)** | MF02 source: MF02.md Sections 4–8. Related Report 4 sections: Section 3.5 (Review/Lock), Section 3.7 (Production), Section 3.8 (Execution/QC). A finalized 4-WF Activity Diagram reference is not yet present in Report 4.                                                                                                                                                                                                |

**Features in this workflow**

<table>
<colgroup>
<col style="width: 11%" />
<col style="width: 26%" />
<col style="width: 43%" />
<col style="width: 19%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Feature ID</strong></th>
<th><strong>Feature</strong></th>
<th><strong>Acceptance criteria</strong></th>
<th><strong>Test case IDs</strong></th>
</tr>
<tr class="odd">
<th>F-04</th>
<th>Design Review and Final Price Confirmation</th>
<th>AC1. Manager reviews only current SUBMITTED FP/SW versions, recording APPROVE or REQUEST_CHANGES with reason; NONE is REVIEW_NOT_REQUIRED.<br />
AC2. The Order-level Final Quote is generated only when every current Ring Item Version is MANAGER_APPROVED or REVIEW_NOT_REQUIRED. It lists each ring’s confirmed price (including selected size, gemstone and personalization options), any paid Maintenance Plan for that ring, and applicable pickup or delivery charges.<br />
AC3. Customer/authorized Guest confirms exact current versions, Final Quote and commercial terms; confirmation is distinct from WF-01 personalization approval.<br />
AC4. Pre-lock design/commercial change invalidates impacted quote/confirmation and requires controlled revision, re-review and/or reconfirmation before authorization.</th>
<th>TC-WF02-F-04-01<br />
TC-WF02-F-04-02<br />
TC-WF02-F-04-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
<tr class="header">
<th>F-05</th>
<th>Ring Production and Quality Assurance</th>
<th>AC1. For any Order containing FP/SW, P2 is the top-up needed for total eligible paid credit to reach at least 70% of the Final Order Total (not a maximum limit); All-NONE skips P1/P2 but must satisfy the certified-gemstone reservation gate before Lock.<br />
AC2. Production Authorization follows all Order-level gates and immutable Design Lock; no item starts production or ships on partial authorization.<br />
AC3. Manager allocates materials and assigns skill-authorized Jeweler/Work Orders; execution follows each template Production Route and records attempts/progress.<br />
AC4. Independent Manager Final QC logs PASS/FAIL per current attempt. FAIL requires REWORK/REMAKE/SCRAP disposition and repeat QC; all items PASS before READY_FOR_HANDOVER.<br />
AC5. In All-NONE Orders, no P1 or P2 is created, but Final Quote, Customer Final Confirmation, current Certified Gemstone reservation and Order-level Production Lock remain mandatory before Production Authorization. Every NONE Ring Item still requires independent Manager Final QC PASS; a QC failure blocks Order READY_FOR_HANDOVER.</th>
<th>TC-WF02-F-05-01<br />
TC-WF02-F-05-02<br />
TC-WF02-F-05-03<br />
TC-WF02-F-05-04 — All-NONE quote + confirmation + reservation -&gt; lock, no P1/P2.<br />
TC-WF02-F-05-05 — NONE QC FAIL -&gt; no handover until disposition and repeat PASS.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="odd">
<th>F-12</th>
<th>Engraving Design and Production Preparation (production part)</th>
<th>AC1. Production Package and laser-ready asset come only from the active Order Design Lock, bound to the exact Ring Item Version and source: the approved FP placement/scale/rotation or the approved SW time segment and template-fixed engraving geometry.<br />
AC2. Exports validate FP position/scale/rotation against ENGRAVE_SURFACE and template minimum/maximum limits; SW uses the approved time segment and fixed template geometry. Physical dimensions, mapping/profile versions and checksums must match the locked version; stale or invalid exports are blocked.<br />
AC3. Only authorized Jeweler with LASER_ENGRAVING skill and LASER_OPERATE permission executes the applicable route; the system prepares approved design, not autonomous laser control.<br />
AC4. SW laser-ready exports must reproduce the approved exact 3-second waveform with fixed template geometry and matching locked Ring Item Version, asset references and checksum; a different segment, geometry mutation or stale version blocks export.</th>
<th>TC-WF02-F-12-01<br />
TC-WF02-F-12-02<br />
TC-WF02-F-12-03<br />
TC-WF02-F-12-04 — SW export -&gt; approved segment/geometry/version; stale asset denied.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Demo scenarios**

<table>
<colgroup>
<col style="width: 9%" />
<col style="width: 10%" />
<col style="width: 20%" />
<col style="width: 24%" />
<col style="width: 21%" />
<col style="width: 12%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Scenario ID</strong></th>
<th><strong>Type</strong></th>
<th><strong>Preconditions and data</strong></th>
<th><strong>Main steps</strong></th>
<th><strong>Expected result</strong></th>
<th><strong>Presenter</strong></th>
</tr>
<tr class="odd">
<th><em>DS-02a</em></th>
<th><em>Main</em></th>
<th>WF-01 Mixed Order: 1 FP SUBMITTED + 1 NONE REVIEW_NOT_REQUIRED; verified P1 and complete source/approval; Manager/Jeweler and inventory available; final terms known.</th>
<th>1. Manager reviews submitted FP version and APPROVES; NONE bypasses design review.<br />
2. Check all-version gate; issue Final Quote including per-item Plan line, then Customer Final Confirmation.<br />
3. Collect/reconcile any required P2 so eligible net payment credit reaches at least 70% of the Final Order Total; check reservation/inventory.<br />
4. Create immutable Order-level Design Lock; authorize production; allocate materials, create attempts/Work Orders and assign skilled Jeweler.<br />
5. Execute approved routes, record steps and run independent Manager Final QC on both items.</th>
<th>No production before P2 + active confirmation + Lock. Production packages bind exact versions. Both latest valid QC results PASS; Order READY_FOR_HANDOVER; final payment/handover not performed.</th>
<th>Trần Tuấn Kiệt</th>
</tr>
<tr class="header">
<th><em>DS-02b</em></th>
<th><em>Exception</em></th>
<th>Two-ring Order has active Lock and authorized Work Orders; Item A latest Manager Final QC PASS; Item B physically defective at final QC.</th>
<th>1. Manager records QC FAIL for Item B with checklist, reason and evidence.<br />
2. Verify Order remains IN_PRODUCTION despite Item A PASS.<br />
3. The manager chooses REWORK (same attempt) or REMAKE (new linked attempt/work order); scrap/write-off damaged materials when required.<br />
4. Reallocate materials/assign Jeweler if REMAKE; execute authorized corrective route.<br />
5. Manager performs independent Final QC again; reevaluate all-item gate.</th>
<th>No item-level bypass, no early READY_FOR_HANDOVER and no P3 or partial release. Old attempt/evidence preserved. If B passes, both PASS → READY_FOR_HANDOVER; unresolved SCRAP remains an exception.</th>
<th>Trần Tuấn Kiệt</th>
</tr>
<tr class="odd">
<th></th>
<th></th>
<th></th>
<th></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Committed test cases**

| **Test type**                                 | **Count**                                                                                     | **Automated in CI**                                                                            | **Responsible member(s)** |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|---------------------------|
| *Feature tests (≥ 3 per feature)*             | ≥12 (9 original + 3 supplemental feature tests)                                               | Planned ≥6 feature cases in CI (not yet evidenced).                                            | Trần Tuấn Kiệt            |
| *End-to-end workflow test (≥ 1)*              | ≥1                                                                                            | Planned 1 workflow E2E in CI; execution/evidence pending.                                      | Trần Tuấn Kiệt            |
| *State transition tests (≥ 1 per transition)* | ≥1 test per transition documented in approved State Machine; enumerated after its completion. | Planned ≥50% of state-transition tests in CI; count follows approved transitions.              | Trần Tuấn Kiệt            |
| *Total for this workflow*                     | ≥13 committed cases (10 original + 3 supplemental) + ≥1 per approved state transition.        | Planned CI ≥7/13 committed cases + ≥50% of state-transition cases; execution not yet verified. | Trần Tuấn Kiệt            |

**Pass criteria at Defense 1.1**

| **Criterion**                                 | **Committed**                                                                         |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| *Runs end-to-end on staging with seeded data* | *Yes*                                                                                 |
| *Main scenario passes*                        | *Yes*                                                                                 |
| *Exception scenarios passing*                 | ≥80% of exception scenarios (target; reviewer sign-off pending).                      |
| *Test pass rate for this workflow*            | ≥90% of all workflow tests; 100% of mandatory-feature main-path tests (Viva minimum). |
| *Open Critical / High defects*                | *0*                                                                                   |

**Reviewer note**

<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 70%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Note</strong></th>
<th><p><strong>MEETING FEEDBACK SUMMARY — REFERENCE ONLY (31 Oct 2026)</strong></p>
<p>Present production and QC as one outcome-oriented business flow with actors, entry/exit conditions and major exceptions; put detailed Work Order, laser and QC transitions into Activity/Sequence diagrams. Explain the distinction between the ring template/blank, configured item and immutable version; demonstrate the connection from personalized-source processing and approved preview to the production-ready engraving output. Keep the system architecture overview at component/responsibility level rather than a grid of technology logos.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **6.3 Workflow WF-03**

| **Workflow name**                       | Complete Payment & Handover Order                                                                                                                                                                                                                                                                                                                                                                                                          |
|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner (one member)**                  | Phạm Vũ Khánh Như                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Supporting members**                  | Mai Nhân Kiệt — BE: final payment reconciliation, payment receipts and invoice (F-06); Phạm Quốc Duy — BE: delivery task, recipient verification, custody/handover and entitlement activation services; Trần Tuấn Kiệt — Web FE: Order tracking, pickup status and protected Digital Memory web access. WF-03 owner remains the workflow/demo presenter; implementation ownership is defined separately in Section 3 (Mandatory Features). |
| **Actors**                              | Customer / Guest; Recipient; Store Staff; Delivery Staff; Manager/Operations; PayOS                                                                                                                                                                                                                                                                                                                                                        |
| **Trigger**                             | WF-02 completed; Order READY_FOR_HANDOVER with all Ring Items QC PASS.                                                                                                                                                                                                                                                                                                                                                                     |
| **Business outcome**                    | Final balance collected, invoice and payment proof valid; the complete Order is handed to a verified recipient with immutable proof; Order COMPLETED; eligible entitlements activated/retried.                                                                                                                                                                                                                                             |
| **Main entity state path**              | READY_FOR_HANDOVER → Final Payment SATISFIED → PICKUP / DELIVERY + Recipient VERIFIED + full Handover Proof → COMPLETED → Warranty / selected Plan / eligible Memory activation.                                                                                                                                                                                                                                                           |
| **Activity diagram (Report 4 section)** | MF03 source: MF03.md Sections 4–8. Related Report 4 sections: Section 3.9 (Fulfillment), Section 3.10 (Digital Memory). A finalized 4-WF Activity Diagram reference is not yet present in Report 4.                                                                                                                                                                                                                                        |

**Features in this workflow**

<table>
<colgroup>
<col style="width: 11%" />
<col style="width: 26%" />
<col style="width: 43%" />
<col style="width: 19%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Feature ID</strong></th>
<th><strong>Feature</strong></th>
<th><strong>Acceptance criteria</strong></th>
<th><strong>Test case IDs</strong></th>
</tr>
<tr class="odd">
<th>F-06</th>
<th>Final Payment and Sales Documents</th>
<th>AC1. Entry requires READY_FOR_HANDOVER and all latest Manager Final QC PASS; final balance = max(0, Final Order Total - eligible net payment credit).<br />
AC2. All-NONE pays its outstanding balance (normally 100% if no credit); an FP/SW Order pays the remaining P3, not a fixed 30% after repricing. FP/SW P1 and P2 are PayOS-only upstream payment milestones. No zero-amount charge or receipt.<br />
AC3. For All-NONE final payment: PICKUP accepts backend-verified PayOS or authorized Store CASH with receipt/ledger/audit. For FP/SW P3, verified PayOS is supported; do not extend CASH without a separately approved payment policy. All DELIVERY requires verified PayOS before dispatch. No COD or manual bank-transfer confirmation outside PayOS; Delivery Staff cannot collect or confirm payment.<br />
AC4. Each successful payment has an immutable PDF receipt; one Order-level PDF final invoice is issued after Final Payment SATISFIED and before physical handover.<br />
AC5. Verify All-NONE end-to-end payment variants: after all Ring Items pass QC, the full outstanding balance (normally 100%) is collected by verified PayOS or authorized Store CASH for PICKUP; DELIVERY in HCMC requires verified PayOS before dispatch, never COD. CASH permission here is committed only for All-NONE PICKUP; FP/SW cash use requires separately approved policy. Pending/duplicate payment events must not bypass the gate or generate duplicate receipts.</th>
<th>TC-WF03-F-06-01<br />
TC-WF03-F-06-02<br />
TC-WF03-F-06-03<br />
TC-WF03-F-06-04 — All-NONE PICKUP -&gt; verified PayOS/CASH audit before handover.<br />
TC-WF03-F-06-05 — All-NONE DELIVERY -&gt; verified PayOS; replay/COD blocked.<br />
Targeted supplemental cases are planned; execution evidence pending.</th>
</tr>
<tr class="header">
<th>F-07</th>
<th>Customer Collection and Delivery</th>
<th>AC1. One confirmed Order fulfillment mode PICKUP/DELIVERY; DELIVERY restricted to HCMC with policy-based free shipping and full-package validation.<br />
AC2. Store/Delivery verifies recipient via short-lived single-use QR; verified-email OTP/Magic Link or approved override is auditable fallback.<br />
AC3. DELIVERY records assignment, Staff acceptance, Store RELEASE + courier RECEIVE custody before dispatch; at most two actual delivery attempts.<br />
AC4. Order is COMPLETED only after payment, verified recipient, all 1–2 items physically handed over and immutable full-Order Proof. No partial handover.</th>
<th>TC-WF03-F-07-01<br />
TC-WF03-F-07-02<br />
TC-WF03-F-07-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
<tr class="odd">
<th>F-08</th>
<th>After-purchase Benefits and Digital Memories</th>
<th>AC1. On full-Order successful handover, Warranty and purchased Maintenance Plan are activated per Ring Item; Plan only where selected in confirmed Final Quote.<br />
AC2. Only FP/SW with memory_enabled=true has free eligible Memory Card/Experience Binding; NONE and opted-out items receive none.<br />
AC3. Memory activation failure is retryable without reverting Order COMPLETED; Owner PIN, invitation, recipient access and WebAR are optional supporting steps.<br />
AC4. FP memory uses protected page; SW may use WebAR/approved audio with secure fallback, independently of order completion.<br />
AC5. SW Digital Memory requires an eligible Ring Item with memory_enabled=true and successful full-Order handover. An authorized Owner/Recipient uses separate Memory access controls for approved audio and WebAR, with secure fallback if AR recognition fails; a scan target or delivery QR alone never grants access. Memory activation/setup is optional and must not block Order completion.</th>
<th>TC-WF03-F-08-01<br />
TC-WF03-F-08-02<br />
TC-WF03-F-08-03<br />
TC-WF03-F-08-04 — SW Memory ON + handover -&gt; secure WebAR/audio fallback.<br />
Proposed mapping: TC-WF03-F-08-03 checks SW Memory/WebAR access and approved-audio fallback. Test steps and execution evidence are still pending. Additional TC-WF03-F-08-04 is specified above; execution evidence remains pending.</th>
</tr>
<tr class="header">
<th>F-13</th>
<th>Knowledge and Personal Data Protection (access part)</th>
<th>AC1. Order/Guest tracking requires authorized owner or verified-email session; Order code or scan of handover QR alone does not grant protected Memory access.<br />
AC2. Recipient Memory access requires separate invitation/Access Grant/session and PIN when required; owner can revoke access.<br />
AC3. Delivery Staff only sees fulfillment data necessary for handover and cannot read raw FP/SW sources, private Memory or confirm payment.</th>
<th>TC-WF03-F-13-01<br />
TC-WF03-F-13-02<br />
TC-WF03-F-13-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Demo scenarios**

<table>
<colgroup>
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 21%" />
<col style="width: 24%" />
<col style="width: 21%" />
<col style="width: 12%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Scenario ID</strong></th>
<th><strong>Type</strong></th>
<th><strong>Preconditions and data</strong></th>
<th><strong>Main steps</strong></th>
<th><strong>Expected result</strong></th>
<th><strong>Presenter</strong></th>
</tr>
<tr class="odd">
<th><em>DS-03a</em></th>
<th><em>Main</em></th>
<th>WF-02 READY_FOR_HANDOVER; 2 QC-PASS items (FP with Memory ON and Plan purchased + NONE); DELIVERY in HCMC; FP/SW eligible net payment credit is at least 70% of the Final Order Total; verified recipient.</th>
<th>1. Reconcile Final Quote/credit; collect remaining P3 by verified PayOS and issue a verified PDF payment receipt and the Order-level PDF Final Invoice before handover.<br />
2. Create/assign Delivery Task; Staff ACCEPT, verify both items, Store RELEASE and courier RECEIVE custody.<br />
3. Dispatch full Order; recipient presents single-use QR, backend validates session/order/identity.<br />
4. Physically hand over both rings, record delivery proof and custody to the recipient.<br />
5. Complete Order; activate per-item Warranty, selected Plan and FP Memory entitlement.</th>
<th>Payment receipts and the Order-level Final Invoice must be provided as PDFs; PDF generation and authorized access must be demonstrated on staging and are not claimed as already tested. No dispatch/handover before the payment gate; full Handover Proof is persisted and the Order is COMPLETED. Only the purchased Plan and opted-in FP Memory are activated in this demo; PIN/invitation/WebAR are not required for completion. This main demo intentionally uses FP + NONE. SW Memory/WebAR activation must be checked separately under F-08; DS-03a does not demonstrate or prove that test.</th>
<th>Phạm Vũ Khánh Như</th>
</tr>
<tr class="header">
<th><em>DS-03b</em></th>
<th><em>Exception</em></th>
<th>DELIVERY Order READY_FOR_HANDOVER; fully prepaid and invoiced; courier has full package; Recipient unavailable on first attempt and verification fails on second.</th>
<th>1. Record physical attempt #1 FAILED, reason/proof and custody; authorize one redelivery.<br />
2. Record attempt #2 FAILED with reason/evidence, no fabricated successful proof.<br />
3. Return full package to Store with custody RELEASE/RECEIVE evidence.<br />
4. Set fulfillment awaiting customer collection (not a new completed Order).<br />
5. Later verify recipient QR/email fallback and record full Store pickup proof if collected.</th>
<th>Max two physical attempts enforced, no auto-CANCELLED/COMPLETED, no premature Warranty/Plan/Memory activation. Order remains READY_FOR_HANDOVER until verified full pickup + proof.</th>
<th>Phạm Vũ Khánh Như</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Committed test cases**

| **Test type**                                 | **Count**                                                                                     | **Automated in CI**                                                                            | **Responsible member(s)** |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|---------------------------|
| *Feature tests (≥ 3 per feature)*             | ≥15 (12 original + 3 supplemental feature tests)                                              | Planned ≥7 feature cases in CI (not yet evidenced).                                            | Phạm Vũ Khánh Như         |
| *End-to-end workflow test (≥ 1)*              | ≥1                                                                                            | Planned 1 workflow E2E in CI; execution/evidence pending.                                      | Phạm Vũ Khánh Như         |
| *State transition tests (≥ 1 per transition)* | ≥1 test per transition documented in approved State Machine; enumerated after its completion. | Planned ≥50% of state-transition tests in CI; count follows approved transitions.              | Phạm Vũ Khánh Như         |
| *Total for this workflow*                     | ≥16 committed cases (13 original + 3 supplemental) + ≥1 per approved state transition.        | Planned CI ≥8/16 committed cases + ≥50% of state-transition cases; execution not yet verified. | Phạm Vũ Khánh Như         |

**Pass criteria at Defense 1.1**

| **Criterion**                                 | **Committed**                                                                         |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| *Runs end-to-end on staging with seeded data* | *Yes*                                                                                 |
| *Main scenario passes*                        | *Yes*                                                                                 |
| *Exception scenarios passing*                 | ≥80% of exception scenarios (target; reviewer sign-off pending).                      |
| *Test pass rate for this workflow*            | ≥90% of all workflow tests; 100% of mandatory-feature main-path tests (Viva minimum). |
| *Open Critical / High defects*                | *0*                                                                                   |

**Reviewer note**

<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 70%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Note</strong></th>
<th><p><strong>MEETING FEEDBACK SUMMARY — REFERENCE ONLY (31 Oct 2026)</strong></p>
<p>Keep payment plus whole-order collection/delivery grouped by the business outcome; the Main Flow should show the responsible actors, trigger, result and principal exception paths, while payment callbacks, recipient verification and handover-proof details belong in Activity/Sequence diagrams. Use clear boundaries against the Order/Production flows. Payment/QR and no-partial-handover rules in MF03 are the team’s current design baseline, not specific decisions evidenced in this meeting summary.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **6.4 Workflow WF-04**

| **Workflow name**                       | Manage After-sales Services                                                                                                                                                                                                                                                                                                                                                                                                  |
|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Owner (one member)**                  | Phạm Quốc Duy                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Supporting members**                  | Mai Nhân Kiệt — BE: identity checks, payment-credit allocation and refund execution (F-10/F-13); Trần Tuấn Kiệt — Web FE: Manager/Store claim triage, review and service decision screens; Phạm Vũ Khánh Như — Mobile FE: Customer claim submission, evidence and service-status screens. WF-04 owner remains the workflow/demo presenter; implementation ownership is defined separately in Section 3 (Mandatory Features). |
| **Actors**                              | Customer / authorized Guest; Store Staff / Support; Manager; Jeweler; Delivery Staff; Finance                                                                                                                                                                                                                                                                                                                                |
| **Trigger**                             | A valid post-handover issue is submitted for exactly one Ring Item from a completed Order.                                                                                                                                                                                                                                                                                                                                   |
| **Business outcome**                    | Warranty, plan-covered/paid maintenance or eligible return resolved; independent claim CLOSED with custody, QC/refund and proof; original Order remains COMPLETED.                                                                                                                                                                                                                                                           |
| **Main entity state path**              | Claim DRAFT → SUBMITTED → TRIAGE_PENDING → DECISION_PENDING → RESOLUTION_IN_PROGRESS → READY_FOR_RETURN (if service) → CLOSED; REJECTED/RETURN routes per policy.                                                                                                                                                                                                                                                            |
| **Activity diagram (Report 4 section)** | MF04 source: MF04.md Sections 4–8. Related Report 4 sections: Section 3.11 (After-sales Claims), Section 3.12 (Administration/Data Rights supporting UC). A finalized 4-WF Activity Diagram reference is not yet present in Report 4.                                                                                                                                                                                        |

**Features in this workflow**

<table>
<colgroup>
<col style="width: 11%" />
<col style="width: 26%" />
<col style="width: 43%" />
<col style="width: 19%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Feature ID</strong></th>
<th><strong>Feature</strong></th>
<th><strong>Acceptance criteria</strong></th>
<th><strong>Test case IDs</strong></th>
</tr>
<tr class="odd">
<th>F-09</th>
<th>Warranty and Maintenance Services</th>
<th>AC1. A claim starts only after successful original handover and targets exactly one Ring Item; identity/authorization and policy evidence are checked.<br />
AC2. Eligible workmanship/manufacturing defects within 12 months use Warranty Repair/Remake at customer charge 0; original locked design is preserved.<br />
AC3. Maintenance uses ACTIVE Plan plus covered scope/remaining usage (max 2 completed standard polishings per 12 months), otherwise versioned Service Quote accepted and 100% paid before Work Order.<br />
AC4. After-sales intake/custody, claim-linked Work Order, independent Manager QC PASS and new verified handback proof are required before service claim CLOSED.</th>
<th>TC-WF04-F-09-01<br />
TC-WF04-F-09-02<br />
TC-WF04-F-09-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
<tr class="header">
<th>F-10</th>
<th>Returns, Refunds and After-sales Resolution</th>
<th>AC1. Manager decides eligible direct Return within 7 days for major mismatch/defect or approved Warranty-to-Return resolution; change of preference alone is excluded.<br />
AC2. Approved Return of one Ring Item requires actual RETURN_RECEIVED plus condition/custody evidence before refund authorization.<br />
AC3. Refund is independent and no greater than attributable actual paid credit calculated from locked quote/payment allocations; original invoice/Order COMPLETED remains intact.<br />
AC4. Claim closes only after refund/disposition/evidence are complete; Ring Item B of a two-ring Order and its entitlements are not silently changed.</th>
<th>TC-WF04-F-10-01<br />
TC-WF04-F-10-02<br />
TC-WF04-F-10-03<br />
BM04 draft TC IDs; acceptance-criteria mapping planned; execution not claimed.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Demo scenarios**

<table>
<colgroup>
<col style="width: 9%" />
<col style="width: 9%" />
<col style="width: 21%" />
<col style="width: 24%" />
<col style="width: 21%" />
<col style="width: 12%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Scenario ID</strong></th>
<th><strong>Type</strong></th>
<th><strong>Preconditions and data</strong></th>
<th><strong>Main steps</strong></th>
<th><strong>Expected result</strong></th>
<th><strong>Presenter</strong></th>
</tr>
<tr class="odd">
<th><em>DS-04a</em></th>
<th><em>Main</em></th>
<th>Original 2-ring Order COMPLETED with valid full handover proof; Item A shows confirmed manufacturing defect within 12-month Warranty; authorized claimant and original locked spec available.</th>
<th>1. Customer submits Claim for Item A with description/evidence; verify owner, Ring Item and handover.<br />
2. Store triages, Manager inspects/root-causes and authorizes covered WARRANTY (0 customer charge).<br />
3. Intake Item A with condition/custody record; create claim-linked repair Work Order and production attempt.<br />
4. Jeweler repairs to original locked spec; independent Manager Final QC PASS.<br />
5. Verify recipient at handback, save new after-sales proof and close Claim after all obligations.</th>
<th>Item A Warranty resolved at 0 customer charge, audit/custody and QC preserved; new handback proof linked to Claim. Original Order stays COMPLETED; unaffected Item B stays unchanged.</th>
<th>Phạm Quốc Duy</th>
</tr>
<tr class="header">
<th><em>DS-04b</em></th>
<th><em>Exception</em></th>
<th>Original 2-ring Order COMPLETED; Customer claims Item A has major mismatch 4 days after full handover; Manager can evaluate Return Policy; Item B is acceptable.</th>
<th>1. Submit per-item Return Claim; verify identity, 7-day window and locked specification.<br />
2. Manager checks evidence and approves eligible RETURN for Item A only.<br />
3. Attempt refund before physical return: system must block authorization.<br />
4. Receive and inspect actual Item A; log condition, custody and entitlement disposition.<br />
5. Compute attributable net paid amount; settle independent refund, inventory disposition and close Claim.</th>
<th>No refund before RETURN_RECEIVED; amount never exceeds Item A attributable credit. Original payments/invoice and Order COMPLETED unchanged; Item B and its benefits remain intact.</th>
<th>Phạm Quốc Duy</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Committed test cases**

| **Test type**                                 | **Count**                                                                                     | **Automated in CI**                                                                            | **Responsible member(s)** |
|-----------------------------------------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|---------------------------|
| *Feature tests (≥ 3 per feature)*             | ≥6 (minimum, 3 per listed feature)                                                            | Planned ≥3 feature cases in CI (not yet evidenced).                                            | Phạm Quốc Duy             |
| *End-to-end workflow test (≥ 1)*              | ≥1                                                                                            | Planned 1 workflow E2E in CI; execution/evidence pending.                                      | Phạm Quốc Duy             |
| *State transition tests (≥ 1 per transition)* | ≥1 test per transition documented in approved State Machine; enumerated after its completion. | Planned ≥50% of state-transition tests in CI; count follows approved transitions.              | Phạm Quốc Duy             |
| *Total for this workflow*                     | ≥7 baseline test cases + ≥1 per approved state transition.                                    | Planned CI ≥4 of 7 baseline cases + ≥50% of state-transition cases; not yet executed/verified. | Phạm Quốc Duy             |

**Pass criteria at Defense 1.1**

| **Criterion**                                 | **Committed**                                                                         |
|-----------------------------------------------|---------------------------------------------------------------------------------------|
| *Runs end-to-end on staging with seeded data* | *Yes*                                                                                 |
| *Main scenario passes*                        | *Yes*                                                                                 |
| *Exception scenarios passing*                 | ≥80% of exception scenarios (target; reviewer sign-off pending).                      |
| *Test pass rate for this workflow*            | ≥90% of all workflow tests; 100% of mandatory-feature main-path tests (Viva minimum). |
| *Open Critical / High defects*                | *0*                                                                                   |

**Reviewer note**

<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 70%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Note</strong></th>
<th><p><strong>MEETING FEEDBACK SUMMARY — REFERENCE ONLY (31 Oct 2026)</strong></p>
<p>Explain WARRANTY versus MAINTENANCE distinctly, including eligibility, service steps, duration and customer charges; represent after-sales as a customer-goal business flow rather than a list of UI actions. Detail inspection, repair, return, custody and financial branches in lower-level diagrams, and give a concrete claim example. The detailed RETURN/refund policy and DATA_RIGHTS separation in MF04 derive from the team’s new baseline, not an explicit reviewer decision in this meeting summary.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## **7. Individual Commitments**

*One block per member. Every member owns at least one main workflow and 2–3 parts. Each test case and each fix is counted for one member only.*

### **7.1 Member 1**

| **Full name**    | Mai Nhân Kiệt                                                                                                |
|------------------|--------------------------------------------------------------------------------------------------------------|
| **Student ID**   | SE184258                                                                                                     |
| **Role in team** | Leader (Registration v1); WF-01 workflow/demo presenter only — implementation ownership assigned separately. |

**Ownership**

| **Type**                         | **Items (IDs / names)**                                                                                                       | **Notes**                                                                                                                               |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| *Main workflow(s) owned*         | WF-01 — Configure & Place Ring Order                                                                                          | Supporting technical roles are specified in Section 6. The workflow owner is accountable for the demo, not every implementation module. |
| *Mandatory features owned*       | F-03, F-06, F-10, F-13                                                                                                        | Primary technical feature ownership as assigned in Section 3; separate from workflow/demo coverage in Section 6 and Section 8.          |
| *Modules / entities owned*       | WF-01 demo coverage: Catalog/3D, Cart/Draft and Design Code, Checkout/P1, Consent/FP-SW Source and Personalization, LightRAG. | Modules in presentation scope; not a commitment to implement all listed backend, web and mobile modules.                                |
| *Design decisions owned (D-IDs)* | BM01 D1 (service architecture), D5 (payment); current 4-MF decisions C4-01–C4-04 (scope reference, not code ownership).       | BM01 Section 3 design decisions; current 4-MF Decision Tracker. Reviewer acceptance of final decision crosswalk not recorded.           |
| *NFRs responsible*               | NFR-P-01, NFR-S-01, NFR-Q-01                                                                                                  | BE owner for API/LightRAG performance, access/privacy and test-evidence coordination. Other members provide endpoint-level evidence.    |

**Delivery commitments to Defense 1.1**

| **Commitment**                              | **Committed (count / IDs)**                                                                                                                           | **Due**                                                     |
|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| *Functional test cases written*             | ≥18 feature cases + ≥1 WF E2E + 1 test per approved state transition (enumeration pending).                                                           | Before Defense 1.1.                                         |
| *Of which automated in CI*                  | Planned WF-level CI target ≥16 committed tests + ≥50% of state-transition tests; personally authored count not yet evidenced.                         | Before Defense 1.1; CI run evidence required.               |
| *Demo scenarios presented*                  | DS-01a (Main); DS-01b (Exception)                                                                                                                     | At Defense 1.1.                                             |
| *Required fixes owned (section 9)*          | SR-05 (Commerce, BM02 proposed responsibility); SR-01 payment alignment is cross-functional, not automatically assigned to the presenter.             | Before Defense 1.1; fix deadlines to be agreed by the team. |
| *Documentation sections (Report / section)* | MF01.md Sections 4–8; Report 3 Sections 3.2–3.5 (reconcile); Report 4 Sections 3.2–3.4 (design and source); activity diagram remains to be baselined. | Before document submission.                                 |

**Ownership verification at Review 2 (completed by reviewers)**

<table>
<colgroup>
<col style="width: 30%" />
<col style="width: 39%" />
<col style="width: 30%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Result</strong></th>
<th><strong>Weak points observed</strong></th>
<th><strong>Follow-up (by whom, by when)</strong></th>
</tr>
<tr class="odd">
<th><p><em>☐ Verified</em></p>
<p><em>☐ Partly verified</em></p>
<p><em>☐ Not verified</em></p></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Member confirmation**

| **Signature / date** |     |
|----------------------|-----|

### **7.2 Member 2**

| **Full name**    | Trần Tuấn Kiệt                                                                                               |
|------------------|--------------------------------------------------------------------------------------------------------------|
| **Student ID**   | SE194431                                                                                                     |
| **Role in team** | Member (Registration v1); WF-02 workflow/demo presenter only — implementation ownership assigned separately. |

**Ownership**

| **Type**                         | **Items (IDs / names)**                                                                                                    | **Notes**                                                                                                                               |
|----------------------------------|----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| *Main workflow(s) owned*         | WF-02 — Produce & Quality Check Ring Order                                                                                 | Supporting technical roles are specified in Section 6. The workflow owner is accountable for the demo, not every implementation module. |
| *Mandatory features owned*       | F-01, F-11, F-12                                                                                                           | Primary technical feature ownership as assigned in Section 3; separate from workflow/demo coverage in Section 6 and Section 8.          |
| *Modules / entities owned*       | WF-02 demo coverage: Manager Review, Final Quote/Confirmation, P2/Lock, production package, Work Orders, Manager Final QC. | Modules in presentation scope; not a commitment to implement all listed backend, web and mobile modules.                                |
| *Design decisions owned (D-IDs)* | BM01 D2 (bounded 3D/laser geometry); current 4-MF decisions C4-05–C4-11 (workflow scope).                                  | BM01 Section 3 links D2 to Trần Tuấn Kiệt; technical ownership of the entire WF-02 is not implied.                                      |
| *NFRs responsible*               | NFR-I-01                                                                                                                   | Web FE owner for engraving placement/production-design integrity. BE independently validates the locked export and bounds.              |

**Delivery commitments to Defense 1.1**

| **Commitment**                              | **Committed (count / IDs)**                                                                                                                        | **Due**                                                     |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| *Functional test cases written*             | ≥9 feature cases + ≥1 WF E2E + 1 test per approved state transition (enumeration pending).                                                         | Before Defense 1.1.                                         |
| *Of which automated in CI*                  | Planned WF-level CI target ≥5 baseline tests + ≥50% of state-transition tests; personally authored count not yet evidenced.                        | Before Defense 1.1; CI run evidence required.               |
| *Demo scenarios presented*                  | DS-02a (Main); DS-02b (Exception)                                                                                                                  | At Defense 1.1.                                             |
| *Required fixes owned (section 9)*          | SR-03 and SR-04 (Web implementation/security; BM02 proposed technical owner), subject to team approval.                                            | Before Defense 1.1; fix deadlines to be agreed by the team. |
| *Documentation sections (Report / section)* | MF02.md Sections 4–8; Report 3 Sections 3.6–3.9 (reconcile); Report 4 Sections 3.5, 3.7–3.8 (design/QC); activity diagram remains to be baselined. | Before document submission.                                 |

**Ownership verification at Review 2 (completed by reviewers)**

<table>
<colgroup>
<col style="width: 30%" />
<col style="width: 39%" />
<col style="width: 30%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Result</strong></th>
<th><strong>Weak points observed</strong></th>
<th><strong>Follow-up (by whom, by when)</strong></th>
</tr>
<tr class="odd">
<th><p><em>☐ Verified</em></p>
<p><em>☐ Partly verified</em></p>
<p><em>☐ Not verified</em></p></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Member confirmation**

| **Signature / date** |     |
|----------------------|-----|

### **7.3 Member 3**

| **Full name**    | Phạm Vũ Khánh Như                                                                                            |
|------------------|--------------------------------------------------------------------------------------------------------------|
| **Student ID**   | SE194657                                                                                                     |
| **Role in team** | Member (Registration v1); WF-03 workflow/demo presenter only — implementation ownership assigned separately. |

**Ownership**

| **Type**                         | **Items (IDs / names)**                                                                                                       | **Notes**                                                                                                                               |
|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| *Main workflow(s) owned*         | WF-03 — Complete Payment & Handover Order                                                                                     | Supporting technical roles are specified in Section 6. The workflow owner is accountable for the demo, not every implementation module. |
| *Mandatory features owned*       | F-02, F-07, F-08                                                                                                              | Primary technical feature ownership as assigned in Section 3; separate from workflow/demo coverage in Section 6 and Section 8.          |
| *Modules / entities owned*       | WF-03 demo coverage: final payment/invoice, pickup/delivery custody, Recipient QR and proof, Warranty/Plan/Memory activation. | Modules in presentation scope; not a commitment to implement all listed backend, web and mobile modules.                                |
| *Design decisions owned (D-IDs)* | BM01 D4 (optional Digital Memory); current 4-MF decisions C4-12–C4-17 (workflow scope).                                       | BM01 Section 3 assigns D4 to Phạm Vũ Khánh Như. WF-03 demo ownership is not the ownership of Commerce or fulfillment backend.           |
| *NFRs responsible*               | NFR-U-01                                                                                                                      | Mobile FE owner for usability and recovery across critical mobile tasks. BE retains token/PIN security enforcement.                     |

**Delivery commitments to Defense 1.1**

| **Commitment**                              | **Committed (count / IDs)**                                                                                                                              | **Due**                                                               |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| *Functional test cases written*             | ≥12 feature cases + ≥1 WF E2E + 1 test per approved state transition (enumeration pending).                                                              | Before Defense 1.1.                                                   |
| *Of which automated in CI*                  | Planned WF-level CI target ≥7 baseline tests + ≥50% of state-transition tests; personally authored count not yet evidenced.                              | Before Defense 1.1; CI run evidence required.                         |
| *Demo scenarios presented*                  | DS-03a (Main); DS-03b (Exception)                                                                                                                        | At Defense 1.1.                                                       |
| *Required fixes owned (section 9)*          | No Section 9 fix formally assigned to Phạm Vũ Khánh Như. WF-03 supplies payment/fulfillment demonstration evidence for SR-01/SR-02.                      | No assigned fix deadline; supporting evidence due before Defense 1.1. |
| *Documentation sections (Report / section)* | MF03.md Sections 4–8; Report 3 Sections 3.9–3.11 (reconcile); Report 4 Sections 3.9–3.10 (fulfillment/Memory); activity diagram remains to be baselined. | Before document submission.                                           |

**Ownership verification at Review 2 (completed by reviewers)**

<table>
<colgroup>
<col style="width: 30%" />
<col style="width: 39%" />
<col style="width: 30%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Result</strong></th>
<th><strong>Weak points observed</strong></th>
<th><strong>Follow-up (by whom, by when)</strong></th>
</tr>
<tr class="odd">
<th><p><em>☐ Verified</em></p>
<p><em>☐ Partly verified</em></p>
<p><em>☐ Not verified</em></p></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Member confirmation**

| **Signature / date** |     |
|----------------------|-----|

### **7.4 Member 4**

| **Full name**    | Phạm Quốc Duy                                                                                                |
|------------------|--------------------------------------------------------------------------------------------------------------|
| **Student ID**   | SE193914                                                                                                     |
| **Role in team** | Member (Registration v1); WF-04 workflow/demo presenter only — implementation ownership assigned separately. |

**Ownership**

| **Type**                         | **Items (IDs / names)**                                                                                                                  | **Notes**                                                                                                                               |
|----------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| *Main workflow(s) owned*         | WF-04 — Manage After-sales Services                                                                                                      | Supporting technical roles are specified in Section 6. The workflow owner is accountable for the demo, not every implementation module. |
| *Mandatory features owned*       | F-04, F-05, F-09                                                                                                                         | Primary technical feature ownership as assigned in Section 3; separate from workflow/demo coverage in Section 6 and Section 8.          |
| *Modules / entities owned*       | WF-04 demo coverage: Claim intake/triage, Warranty, plan-covered/paid Maintenance, repair/remake QC, return/refund and chain of custody. | Modules in presentation scope; not a commitment to implement all listed backend, web and mobile modules.                                |
| *Design decisions owned (D-IDs)* | BM01 D3 (gated Production Lock); current 4-MF decisions C4-18–C4-24 (after-sales scope).                                                 | BM01 Section 3 links D3 to Phạm Quốc Duy; presenting WF-04 does not make him the sole implementer of every service.                     |
| *NFRs responsible*               | NFR-R-01, NFR-S-02                                                                                                                       | BE owner for transactional reliability and token/PIN security. Commerce BE, Web FE and Mobile FE contribute integration/UX tests.       |

**Delivery commitments to Defense 1.1**

| **Commitment**                              | **Committed (count / IDs)**                                                                                                                                                        | **Due**                                                     |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------|
| *Functional test cases written*             | ≥6 feature cases + ≥1 WF E2E + 1 test per approved state transition (enumeration pending).                                                                                         | Before Defense 1.1.                                         |
| *Of which automated in CI*                  | Planned WF-level CI target ≥4 baseline tests + ≥50% of state-transition tests; personally authored count not yet evidenced.                                                        | Before Defense 1.1; CI run evidence required.               |
| *Demo scenarios presented*                  | DS-04a (Main); DS-04b (Exception)                                                                                                                                                  | At Defense 1.1.                                             |
| *Required fixes owned (section 9)*          | SR-01, SR-02, SR-06 (BM02 proposed technical owner); not a signed reviewer allocation.                                                                                             | Before Defense 1.1; fix deadlines to be agreed by the team. |
| *Documentation sections (Report / section)* | MF04.md Sections 4–8; Report 3 Sections 3.12–3.13 (reconcile); Report 4 Section 3.11 (Claims) and Section 3.12 (DATA_RIGHTS supporting); activity diagram remains to be baselined. | Before document submission.                                 |

**Ownership verification at Review 2 (completed by reviewers)**

<table>
<colgroup>
<col style="width: 30%" />
<col style="width: 39%" />
<col style="width: 30%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Result</strong></th>
<th><strong>Weak points observed</strong></th>
<th><strong>Follow-up (by whom, by when)</strong></th>
</tr>
<tr class="odd">
<th><p><em>☐ Verified</em></p>
<p><em>☐ Partly verified</em></p>
<p><em>☐ Not verified</em></p></th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

**Member confirmation**

| **Signature / date** |     |
|----------------------|-----|

## **8. Summary and Cross-check**

### **8.1 By workflow**

| **Workflow** | **Owner**              | **Features**                                  | **Demo scenarios (main / exception)**  | **Test cases**                                                                                                   | **Automated**                                                                    |
|--------------|------------------------|-----------------------------------------------|----------------------------------------|------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
| *WF-01*      | Mai Nhân Kiệt          | F-01, F-02, F-03, F-11, F-12, F-13            | DS-01a / DS-01b (1 main / 1 exception) | ≥31 (19 original + 12 supplemental) + state-transition tests                                                     | Planned ≥16 committed cases in CI + ≥50% state cases; proof pending.             |
| *WF-02*      | Trần Tuấn Kiệt         | F-04, F-05, F-12                              | DS-02a / DS-02b (1 main / 1 exception) | ≥13 (10 original + 3 supplemental) + state-transition tests                                                      | Planned ≥7 committed cases in CI + ≥50% state cases; proof pending.              |
| *WF-03*      | Phạm Vũ Khánh Như      | F-06, F-07, F-08, F-13                        | DS-03a / DS-03b (1 main / 1 exception) | ≥16 (13 original + 3 supplemental) + state-transition tests                                                      | Planned ≥8 committed cases in CI + ≥50% state cases; proof pending.              |
| *WF-04*      | Phạm Quốc Duy          | F-09, F-10                                    | DS-04a / DS-04b (1 main / 1 exception) | ≥7 + state-transition tests                                                                                      | Planned ≥4 baseline cases + ≥50% state cases; CI proof pending.                  |
| *Total*      | 4 workflow/demo owners | 13 unique features; 15 WF-feature assignments | 8 scenarios (4 main / 4 exception)     | ≥67 committed cases (45 original feature + 18 supplemental feature + 4 E2E) + ≥1 per finalized state transition. | Planned ≥35/67 committed cases in CI + ≥50% state cases; execution not verified. |

### **8.2 By member**

| **Member** | **Workflows owned**                    | **Features**                                                | **Test cases**                                                                                              | **Automated**                                                                      | **Demo scenarios**       | **Review 2 verification**                                                               |
|------------|----------------------------------------|-------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|--------------------------|-----------------------------------------------------------------------------------------|
| *Member 1* | WF-01 — Mai Nhân Kiệt (demo owner)     | F-01, F-02, F-03, F-11, F-12, F-13 (workflow coverage only) | ≥31 (19 original + 12 supplemental) + state-transition tests                                                | Workflow CI plan ≥16 committed cases; no member-authored CI attribution verified.  | DS-01a / DS-01b          | Reviewer verification not recorded; this row does not claim a Review 2 pass.            |
| *Member 2* | WF-02 — Trần Tuấn Kiệt (demo owner)    | F-04, F-05, F-12 (workflow coverage only)                   | ≥13 (10 original + 3 supplemental) + state-transition tests                                                 | Workflow CI plan ≥7 committed cases; no member-authored CI attribution verified.   | DS-02a / DS-02b          | Reviewer verification not recorded; this row does not claim a Review 2 pass.            |
| *Member 3* | WF-03 — Phạm Vũ Khánh Như (demo owner) | F-06, F-07, F-08, F-13 (workflow coverage only)             | ≥16 (13 original + 3 supplemental) + state-transition tests                                                 | Workflow CI plan ≥8 committed cases; no member-authored CI attribution verified.   | DS-03a / DS-03b          | Reviewer verification not recorded; this row does not claim a Review 2 pass.            |
| *Member 4* | WF-04 — Phạm Quốc Duy (demo owner)     | F-09, F-10 (workflow coverage only)                         | ≥7 + state-transition tests                                                                                 | Workflow CI plan ≥4 baseline cases; no member-authored CI attribution verified.    | DS-04a / DS-04b          | Reviewer verification not recorded; this row does not claim a Review 2 pass.            |
| *Total*    | 4 owned workflows                      | 13 unique features; 15 workflow coverages                   | ≥67 committed cases (49 original baseline + 18 supplemental) + state-transition tests (no duplicate count). | Planned ≥35 committed automated + ≥50% state cases; verified CI total unavailable. | 8 (4 main / 4 exception) | 0 of 4 reviewer verifications documented in BM04; not a reviewer failure determination. |

*The totals in 8.1 and 8.2 must both equal the committed numbers in 8.3.*

### **8.3 Committed Numbers**

| **Number of main workflows**                    | 4 (WF-01–WF-04)                                                                                                                                |
|-------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| **Number of demo scenarios (main / exception)** | 8 (4 main / 4 exception)                                                                                                                       |
| **Committed functional test cases**             | ≥67 committed cases (45 original feature + 18 supplemental feature + 4 E2E) + ≥1 test per approved state transition; final edge count pending. |
| **Of which automated in CI**                    | Proposed CI commitment: ≥35/67 committed cases + ≥50% of state tests; completed runs not verified.                                             |

### **8.4 Eligibility Thresholds for the Viva**

| **Criterion**     | **Minimum threshold**                                                          | **Agreed threshold**                                                                                                        |
|-------------------|--------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| *Main workflows*  | *100% run end-to-end*                                                          | Proposed: 4/4 workflows (100%) run E2E on staging; reviewer acceptance not recorded.                                        |
| *Demo scenarios*  | *100% main; ≥ 80% exception*                                                   | Proposed: 4/4 main scenarios PASS and ≥80% exceptions PASS (with 4 exceptions, at least 4 PASS).                            |
| *Test case count* | *≥ committed number*                                                           | Proposed: ≥67 committed cases (49 original + 18 supplemental) plus ≥1 per approved state transition; none claimed executed. |
| *Test pass rate*  | *≥ 90% overall; 100% main-path tests of mandatory features*                    | Proposed: ≥90% overall and 100% mandatory-feature main-path pass rate; evidence pending.                                    |
| *Automation*      | *≥ 50% run in CI*                                                              | Proposed: ≥50% of final committed tests in CI (plan ≥35/67), plus ≥50% state-transition cases.                              |
| *Defects*         | *No open Critical or High defects*                                             | Proposed: zero unresolved Critical/High defects at Viva; current defect count unverified.                                   |
| *Individual*      | *Each member demos the workflow they own and meets their delivery commitments* | Proposed: each of 4 presenters demos assigned WF and supports individual commitments; reviewer sign-off pending.            |

## **9. Required Fixes**

*Items from the Review 2 minutes and Planned items from Form BM02.*

| **ID**        | **Item**                                                                                                                                                                                                                                                                                                                                                                               | **Related workflow**  | **Owner**                                                                                                              | **Due**                                                       |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| SR-01         | PROPOSED — Align Registration/SRS/flow payment gates with internally selected 4-MF policy: All-NONE skips P1/P2; FP/SW P1/P2 use PayOS; eligible PICKUP balance uses PayOS or authorized Store Cash; DELIVERY prepaid via PayOS. No COD or standalone manual bank transfer. Internal C04 policy recorded 03 Nov 2026; reviewer acceptance of this as a required fix is not documented. | WF-01 / WF-02 / WF-03 | Proposed in BM02: Phạm Quốc Duy (SR-01); technical fix assignment not reviewer-confirmed.                              | BM02 suggested 04 Nov 2026; not an agreed due date.           |
| SR-02         | PROPOSED — Reconcile old All-NONE Manager-QC exemption in BM01/SRS with the current requirement: ALL Ring Items must pass independent Manager Final QC before READY_FOR_HANDOVER. Team policy confirmed by user; reviewer fix acceptance not documented.                                                                                                                               | WF-02 / WF-03         | Proposed in BM02: Phạm Quốc Duy (SR-02); not a signed allocation.                                                      | BM02 suggested 04 Nov 2026; not an agreed due date.           |
| SR-03         | PROPOSED — Implement/verify public Guest/Customer Web Catalog, 3D Studio, Cart and All-NONE Checkout, including staging E2E evidence. BM02 finding SR-03 is unclosed in supplied review evidence; reviewer fix acceptance not documented.                                                                                                                                              | WF-01                 | Proposed in BM02: Trần Tuấn Kiệt (SR-03), aligned with Web/3D role; verify actual assignment.                          | BM02 suggested 06 Nov 2026; not an agreed due date.           |
| SR-04         | PROPOSED — Correct Web /manager route authorization: enforce verified token/role and backend resource authorization rather than relying on decoded JWT for the UI gate. BM02 SR-04 was a review finding; reviewer fix acceptance not documented.                                                                                                                                       | WF-02 / WF-04         | Proposed in BM02: Trần Tuấn Kiệt (SR-04); verify actual fix ownership.                                                 | BM02 suggested 02 Nov 2026 (elapsed); rebaseline is required. |
| SR-05 / SR-06 | PROPOSED — Verify/complete Commerce and Operations business modules covering catalog/order/payment/source consent, Production Lock, independent QC and fulfillment; attach commits, tests and staging evidence for SR-05/SR-06. Reviewer fix acceptance not documented.                                                                                                                | WF-01 / WF-02 / WF-03 | BM02 proposes Mai Nhân Kiệt for SR-05 (Commerce) and Phạm Quốc Duy for SR-06 (Operations); team confirmation required. | BM02 suggested 06 Nov 2026 for both; not an agreed due date.  |

## **10. Review 2 Conclusion (completed by reviewers)**

☐ Pass ☐ Conditional pass ☐ Re-review

## **11. Confirmation**

| **Role**      | **Full name**    | **Signature** | **Date** |
|---------------|------------------|---------------|----------|
| *Reviewer 1*  |                  |               |          |
| *Reviewer 2*  |                  |               |          |
| *Supervisor*  | Nguyễn Minh Sang |               |          |
| *Team leader* | Mai Nhân Kiệt    |               |          |
