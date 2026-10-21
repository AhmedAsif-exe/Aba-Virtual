// Sanity returns documents ordered by their random _id, which put the
// trainings out of sequence (#1, #3, #2). Sort by title instead, comparing
// numbers as numbers so "Training #2" comes before "Training #10".
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function sortResources(resources) {
  return [...resources].sort((a, b) => collator.compare(a.title || "", b.title || ""));
}
