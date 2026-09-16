import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useProjectContext, formatAmount } from "Utils/Context";

export default function ResourceCard({ resource, category, preview = false }) {
  const { user, currency, priceOf } = useProjectContext();
  const navigate = useNavigate();
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (user)
      setIsPaid(user.paidItems.some((item) => item?.id === resource.id));
  }, [user, resource.id]);

  // On the home-page preview strip, cards send visitors to the full catalogue;
  // on the catalogue itself they open the resource's own page.
  const handleSeeMore = () => {
    if (preview) navigate(`/resources`);
    else navigate(`/resources/${resource.id}`);
  };

  if (category === "My-Learning" && !isPaid) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <img
        src={resource?.image?.asset?.url}
        alt={resource.title}
        onClick={handleSeeMore}
        className="aspect-video object-cover border-b border-gray-200 cursor-pointer"
      />

      <div className="p-4 flex flex-col flex-grow">
        <h2 className="text-lg font-bold text-[#f97544] line-clamp-1">
          {resource.title}
        </h2>
        <p className="text-sm text-emerald-600">
          {resource.category} — {resource.type}
        </p>
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">
          {resource.description}
        </p>
        {/* Price */}
        <p className="text-lg font-bold text-[#f97544] mt-auto">
          {formatAmount(priceOf(resource), currency)} ONLY
        </p>
        {/* Buttons */}
        <Button
          onClick={handleSeeMore}
          fullWidth
          sx={{
            mt: 1.5,
            py: 1,
            backgroundColor: "#265c7e",
            color: "white",
            fontWeight: 700,
            borderRadius: 2,
            "&:hover": { backgroundColor: "#1e4e6a" },
          }}
        >
          See More
        </Button>
      </div>
    </div>
  );
}
