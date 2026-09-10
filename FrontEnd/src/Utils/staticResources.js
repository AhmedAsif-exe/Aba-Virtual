// Resources that aren't Sanity documents — same idea as the Games catalogue,
// which is mirrored in the backend (Services/pricing.js) instead of living in
// the CMS. Keep the `id` and `price` here in sync with FFC_BUNDLE_ID /
// FFC_BUNDLE_PRICE_EUR over there.
import ffcBundleImg from "Assets/Images/ffc-bundle.png";
import trainingBundleImg from "Assets/Images/training-bundle.png";

export const FFC_BUNDLE_ID = "ffc-bundle";
export const TRAINING_BUNDLE_ID = "training-bundle";

export const STATIC_RESOURCES = [
  {
    id: FFC_BUNDLE_ID,
    title: "FFC Bundle",
    category: "Downloadable",
    type: "PDF",
    price: 56.0,
    // Sum of buying every included item on its own: 5 guide/workbooks @ 8.5
    // + 8 paid games @ 3.5 (games 1-2 are free). Drives the "compare at" /
    // savings badge on the resource page — keep in step with the real
    // catalogue prices if any of them change.
    compareAtPrice: 70.5,
    url: "FFC-Bundle.zip",
    description:
      "Everything in the FFC series in one bundle — every guide book, every workbook, and every Domain 1 game, for less than buying them one by one. Built for parents and caretakers who want the whole teaching system at once.",
    perks: ["One-time purchase, a year of access to everything included"],
    bundleContents: [
      {
        label: "Guide Books",
        items: ["Class Guide Book", "Feature Guide Book", "Function Guide Book"],
      },
      {
        label: "Workbooks",
        items: ["Features Workbook", "Function Workbook"],
      },
      {
        label: "Games",
        items: [
          "Pick the Purpose",
          "Function Hunt",
          "Find the Feature",
          "Feature Quest",
          "Class Match",
          "Class Catch",
          "Sort It Out",
          "Category Guess",
          "Odd One Out",
          "Random Rotation",
        ],
      },
    ],
    image: { asset: { url: ffcBundleImg } },
  },
  {
    id: TRAINING_BUNDLE_ID,
    title: "Training Bundle",
    category: "Training",
    type: "Video",
    // 4 trainings @ 9.5 EUR = 38 EUR bought separately; bundle is exactly
    // 40% off that. Keep in step with BackEnd/Services/pricing.js and with
    // the real per-training prices in Sanity if either changes.
    price: 22.8,
    compareAtPrice: 38.0,
    description:
      "All four measurement trainings in one bundle — Frequency, Duration & Latency, Rate, and Whole Interval — at 40% off buying them one by one.",
    perks: ["One-time purchase, a year of access to every training included"],
    bundleContents: [
      {
        label: "Trainings",
        items: [
          "Training #1: Measurement - Frequency",
          "Training #2: Duration and Latency",
          "Training #3: Rate Measurement",
          "Training #4: Whole Interval",
        ],
      },
    ],
    image: { asset: { url: trainingBundleImg } },
  },
];

export function findStaticResource(id) {
  return STATIC_RESOURCES.find((r) => r.id === id) || null;
}
