import PageTemplate from "Utils/PageTemplate";
import resourcesImg from "Assets/Images/resources.jpg";
import { useState } from "react";
import ResourceList from "./ResourceList";
import Filter from "Utils/Filter";

import { useQuery } from "@apollo/client";
import { ALL_RESOURCES } from "Utils/Queries/Blog";
import { STATIC_RESOURCES } from "Utils/staticResources";
import { sortResources } from "Utils/sortResources";

const Resources = () => {
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");

  const { loading, error, data } = useQuery(ALL_RESOURCES);

  const handleClick = (tag) => {
    setCategory(tag);
  };

  // Bundles first, then the Sanity items in title order (#1, #2, #3…).
  const resources = [
    ...STATIC_RESOURCES,
    ...sortResources(
      (data?.allResource || []).map(({ _id, ...rest }) => ({
        id: _id,
        ...rest,
      }))
    ),
  ];
  console.log(error);
  return (
    <PageTemplate
      title="Trainings & Resources"
      subtitle="Trainings, FFC guide books and workbooks, and bundles to support growth and learning."
      src={resourcesImg}
    >
      <div className="ml:px-6">
        <Filter
          handleClick={handleClick}
          tags={["My-Learning", "Training", "Downloadable"]}
        />
        {!loading && (
          <ResourceList resources={resources} category={category} type={type} />
        )}
      </div>
    </PageTemplate>
  );
};

export default Resources;
