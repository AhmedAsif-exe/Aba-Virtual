import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Divider,
  Collapse,
  Button,
  Chip,
} from "@mui/material";
import { useProjectContext, formatAmount } from "Utils/Context";
import Comments from "Utils/Comments";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import src from "Assets/Images/logo-removebg-preview.png";
import { Facebook, Twitter, Instagram, LinkedIn } from "@mui/icons-material";
import { useQuery } from "@apollo/client";
import { RESOURCE } from "Utils/Queries/Blog";
import { downloadResource } from "Pages/Resources/downloadResource";

const COLORS = {
  orange: "#f97544",
  navy: "#265c7e",
  teal: "#16b981",
};

function AuthorIntro({ authors }) {
  const author = authors?.[0];

  if (!author) return null;

  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* LEFT — TEXT */}
        <div className="flex-1 text-center md:text-left">
          <h1
            className="text-4xl font-bold"
            style={{ color: "#265c7e" }} // Navy
          >
            About the Trainer
          </h1>

          {author.description?.map((d, i) => (
            <p
              key={i}
              className="mt-5 text-lg leading-relaxed"
              style={{ color: "#374151" }}
            >
              {d}
            </p>
          ))}
        </div>

        {/* RIGHT — AUTHOR CARD */}
        <div
          className="flex flex-col items-center p-6 rounded-2xl shadow-xl w-full md:w-80"
          style={{
            background: "white",
            borderTop: "6px solid #f97544", // Orange highlight
          }}
        >
          <img
            src={author.image.asset.url}
            alt={author.name}
            className="w-48 h-48 rounded-full object-cover shadow-md"
          />

          <h3
            className="mt-4 text-2xl font-semibold"
            style={{ color: "#265c7e" }} // Navy
          >
            {author.name}
          </h3>
        </div>
      </div>
    </section>
  );
}
export default function VideoPlayer() {
  const videoRef = useRef(null);
  const { id } = useParams();
  const { user, currency, priceOf } = useProjectContext();

  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => setExpanded((p) => !p);
  const { loading, data } = useQuery(RESOURCE, { variables: { id } });
  const onClickHandler = async () =>
    downloadResource({
      url: data.Resource.transcripturl,
      title: `${data.Resource.title} - Transcript`,
    });
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const videoUrl = `${process.env.REACT_APP_BACKEND_URI}paypal/videos/stream/${data.Resource.url}`;
    video.src = videoUrl;
  }, [loading, data]);
  useEffect(() => {
    if (!user || !data?.Resource || !Array.isArray(user.paidItems)) return;

    const hasAccess = user.paidItems.some(
      (item) => item.id === data.Resource._id
    );

    if (!hasAccess) {
      window.location.href = "/login";
    }
  }, [user, data]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "100%",
          filter: "blur(2px)",
          opacity: 0.12,
          zIndex: -1,
          pointerEvents: "none",
        }}
      ></div>
      {data && (
        <Box
          sx={{
            position: "relative",
            minHeight: "100vh",
            paddingTop: "100px",
            paddingBottom: "40px",
          }}
        >
          <Box
            sx={{
              position: "relative",
              zIndex: 2,
              maxWidth: "1200px",
              margin: "auto",
              px: 2,
            }}
          >
            <Box
              sx={{
                borderRadius: "14px",
                overflow: "hidden",
                background: COLORS.navy,
                boxShadow: "0px 4px 18px rgba(0,0,0,0.25)",
              }}
              onContextMenu={(e) => e.preventDefault()} // ⛔ Disable right-click here
            >
              <video
                controlsList="nodownload" // ⛔ removes download button
                ref={videoRef}
                controls
                style={{
                  width: "100%",
                  height: "70vh",
                  background: "black",
                }}
              />
            </Box>

            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{
                mt: 3,
                color: COLORS.navy,
              }}
            >
              {data.Resource.title}
            </Typography>

            <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
              <Chip
                label={data.Resource.category}
                sx={{ background: COLORS.orange, color: "#fff" }}
              />
              <Chip
                label={data.Resource.type}
                sx={{ background: COLORS.teal, color: "#fff" }}
              />
              <Chip
                label={formatAmount(
                  priceOf({ id, price: data.Resource.price }),
                  currency,
                )}
                sx={{
                  background: COLORS.navy,
                  color: "#fff",
                  fontWeight: "bold",
                }}
              />
            </Box>
            {/* 📄 Transcript Download Section */}
            {
              <Box
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: "14px",
                  background: "#ffffff",
                  boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                  borderLeft: `6px solid ${COLORS.teal}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant="h6"
                    fontWeight="600"
                    sx={{ color: COLORS.navy, mb: 0.5, textAlign: "left" }}
                  >
                    📄 Transcript Included
                  </Typography>

                  <Typography sx={{ color: "#555", fontSize: "0.95rem" }}>
                    Download the transcript for offline reading or note-taking.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  sx={{
                    background: COLORS.teal,
                    color: "white",
                    px: 3,
                    py: 1.2,
                    fontWeight: 600,
                    borderRadius: "10px",
                    "&:hover": { background: COLORS.orange },
                  }}
                  onClick={onClickHandler}
                  download
                >
                  Download Transcript
                </Button>
              </Box>
            }

            <Collapse
              in={expanded}
              collapsedSize={20}
              sx={{
                mt: 2,
                fontSize: "1rem",
                color: "#444",
                lineHeight: 1.6,
              }}
            >
              {data.Resource.description}
            </Collapse>

            <Button
              onClick={handleToggle}
              sx={{
                mt: 1,
                color: COLORS.navy,
                textTransform: "none",
                fontWeight: "600",
                "&:hover": {
                  color: COLORS.orange,
                },
              }}
              endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {expanded ? "Show less" : "Show more"}
            </Button>

            <Divider sx={{ my: 4 }} />
            <AuthorIntro authors={data.Resource.authors} />

            <Typography
              variant="h6"
              fontWeight="600"
              sx={{ color: COLORS.navy, mb: 1, mt: 4 }}
            >
              Community Discussion
            </Typography>

            <Comments blogId={data.Resource._id} />
          </Box>
        </Box>
      )}
    </>
  );
}
