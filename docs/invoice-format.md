# Invoice format (from the shop's current paper bill)

The printed/PDF invoice built in Phase 5 must follow this layout.

## Header
- Top-left: `GSTIN :- <gstNumber>`
- Top-right: `Mo- <phone>` with `<alternatePhone>` on the next line
- Centre: shop name in Hindi, large (e.g. **देवेश खादी भण्डार**), with the logo, if uploaded, as the stylised middle word
- Boxed address line in Hindi (e.g. *बी. एल. जॉगिड़ मार्केट पावटा, जयपुर (राज.)*)
- `क्रमांक :- <invoiceNumber>` (plain serial, no prefix) and `दिनांक :- <DD-Mon-YY>` (e.g. 28-Mar-26)

## Customer
- One line with the customer name; walk-in sales print **Cash**

## Item table
| Column (Hindi) | Meaning | Field |
| -------------- | ------- | ----- |
| विवरण | Description | `productName` |
| नग | Pieces | `pieces` |
| मीटर/Ft. | Metres or feet (blank for non-fabric items) | `quantity` when unit is MTR/FT |
| दर | Rate | `rate` |
| रकम | Amount = quantity × rate | `taxableValue` / `lineTotal` |

Example: Khadi kurta C S · 1 नग · 2.75 m · ₹360 → ₹990.00

## Totals
- Subtotal (e.g. 2190.00)
- Whole-bill discount shown large on the left: **"50% Less"** (`billDiscountPercent`), with the net amount on the right (1095.00)
- Shaded row: **Total Net Pay** → grand total

## Footer
- Bulleted conditions (`termsAndConditions`, one per line):
  - बिका हुआ माल वापिस नहीं लिया जायेगा
  - भूल चुक लेनी देनी
- Bottom-right: हस्ताक्षर (signature)

## Decisions (confirmed by shop owner, 2026-09-28)
- **GST breakdown:** not printed. The bill stays like the paper bill (prices include tax, no HSN/CGST/SGST lines).
  GST is still calculated and stored per item for the GST report.
- **Paper size:** A4
- **Logo:** no image file; render the shop name as bold Devanagari text (देवेश खादी भण्डार)

- **Header:** the black-and-white header artwork from the shop's Excel file (`frontend/public/bill-header.png`)
- **Numbering:** the Excel book ends at 2768, so the app starts at **2769**. Typing a higher number on a bill moves the counter on.
- **Discount:** every Excel bill uses 50% Less, so new bills default to 50% (`settings.defaultDiscountPercent`).
- **Items:** typed freely as in Excel; picking a saved product also reduces its stock.
