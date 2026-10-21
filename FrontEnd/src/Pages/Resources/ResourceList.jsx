import ResourceCard from "./ResourceCard";

export default function ResourceList({ resources, category, type }) {
  const filtered = resources.filter(
    (r) =>
      (category === "All" ||
        category === "My-Learning" ||
        r.category === category) &&
      (type === "All" || type === "My-Learning" || r.type === type)
  );
  return (
    <div className="grid grid-cols-1 ml:grid-cols-2 t:grid-cols-3 gap-6">
      {filtered.map((res) => (
        <ResourceCard key={res.id} resource={res} category={category} />
      ))}
    </div>
  );
}
