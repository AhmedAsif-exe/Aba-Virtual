import React from "react";
import { BLOGS } from "Utils/Queries/Blog";
import PortableBlockRenderer from "./PortableBlockRenderer";
import { Container, Typography, Box, Chip, Divider } from "@mui/material";

import Comments from "Utils/Comments";
import { useQuery } from "@apollo/client";
import { useParams } from "react-router-dom";
import Seo from "Utils/Seo";

export default function BlogPage() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(BLOGS, { variables: { id } });
  console.log(data?.Blog?.section);
  return (
    <Container maxWidth={"100%"} sx={{ py: 4, p: 0 }}>
      {!loading && data?.Blog && (
        <Seo
          title={data.Blog.title}
          description={data.Blog.description}
          image={data.Blog.mainImage?.asset?.url}
        />
      )}
      {!loading && (
        <Box key={data.Blog._id} my={2} width={"100%"}>
          {data.Blog.mainImage?.asset && (
            <Box mb={3} sx={{ width: "100%" }} p={0}>
              <div
                className="mx-auto"
                style={{
                  backgroundImage: `url(${data.Blog.mainImage?.asset.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  borderRadius: "10px",
                  width: "100%", // or fixed width like '500px'
                  height: "450px", // adjust as needed
                }}
              ></div>
            </Box>
          )}
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            fontSize={"50px"}
          >
            {data.Blog.title}
          </Typography>

          <Box sx={{ mb: "50px" }}>
            <Chip label={data.Blog.categories} sx={{ mr: 1 }} />
          </Box>

          {data.Blog.sections.map((section, idx) => (
            <Box key={idx} mb={4} className="t:px-[100px] px-[40px]">
              {section.subheading && (
                <Typography
                  variant="h6"
                  textAlign={"left"}
                  sx={{ marginBottom: "2rem" }}
                  fontWeight={600}
                  gutterBottom
                >
                  {section.subheading}
                </Typography>
              )}
              <PortableBlockRenderer value={section.contentRaw} />
              {data.Blog._id === "7ae86701-6bec-402b-a89a-b84106983a1a" && (
                <Typography
                  paragraph
                  sx={{ textAlign: "left" }}
                  fontSize={"20px"}
                >
                  Head on to our
                  <a
                    href="/68df8bcb-8cd8-8322-ab79-1f42281f485e"
                    style={{ color: "#f97544" }}
                  >
                    {" page"}
                  </a>{" "}
                  to explore our products!
                </Typography>
              )}
            </Box>
          ))}

          <Divider sx={{ my: 4 }} />
          <Comments blogId={data.Blog._id} />
        </Box>
      )}
    </Container>
  );
}
