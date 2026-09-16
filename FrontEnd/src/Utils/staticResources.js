// Resources that aren't Sanity documents — same idea as the Games catalogue,
// which is mirrored in the backend (Services/pricing.js) instead of living in
// the CMS. Real prices come from the backend's fixed PKR list; `price` here
// (EUR) is only the fallback, like a Sanity resource's `price`.
import ffcBundleImg from "Assets/Images/ffc-bundle.png";
import trainingBundleImg from "Assets/Images/training-bundle.png";

export const FFC_BUNDLE_ID = "ffc-bundle";
export const TRAINING_BUNDLE_ID = "training-bundle";

const GUIDE_BOOK_EUR = 8.5;
const WORKBOOK_EUR = 8.5;
const GAME_EUR = 3.5;
const TRAINING_EUR = 9.5;

// The paid items a bundle replaces, priced the same way as the items
// themselves, so "compare at" and "save" always match the real catalogue.
const FFC_COMPARE_AT_ITEMS = [
  { id: "0063aeaf-3355-42f2-9533-31482f8aa7f9", price: GUIDE_BOOK_EUR },
  { id: "66a24624-06f8-4b54-9357-1f6a8f267545", price: GUIDE_BOOK_EUR },
  { id: "c10906d4-bc72-482e-b5c1-d11e097f7bd6", price: GUIDE_BOOK_EUR },
  { id: "8f66126b-11a1-44b7-8f5c-5692c70d5caf", price: WORKBOOK_EUR },
  { id: "ffb1b868-2dc1-433e-af32-a4347ce8901c", price: WORKBOOK_EUR },
  ...[3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({
    id: `domain1-game-${n}`,
    price: GAME_EUR,
  })),
];

const TRAINING_COMPARE_AT_ITEMS = [
  "3bab9f72-b36a-4b22-a25f-92143533cc3b",
  "5a057717-3f83-4f04-96e4-a149fd3db9d8",
  "556722fa-61b3-40e0-a7ec-3e246e50c238",
  "bf63f6fb-c3ff-4787-aba7-fb3ed74d9a1a",
].map((id) => ({ id, price: TRAINING_EUR }));

/** Sum of buying a bundle's contents one by one, in display currency. */
export function compareAtPrice(resource, priceOf) {
  if (!resource.compareAtItems) return 0;
  return resource.compareAtItems.reduce((sum, i) => sum + priceOf(i), 0);
}

export const STATIC_RESOURCES = [
  {
    id: FFC_BUNDLE_ID,
    title: "FFC Bundle",
    category: "Downloadable",
    type: "PDF",
    price: 56.0,
    compareAtItems: FFC_COMPARE_AT_ITEMS,
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
    price: 22.8,
    compareAtItems: TRAINING_COMPARE_AT_ITEMS,
    description:
      "All four measurement trainings in one bundle — Frequency, Duration & Latency, Rate, and Whole Interval — for less than buying them one by one.",
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
