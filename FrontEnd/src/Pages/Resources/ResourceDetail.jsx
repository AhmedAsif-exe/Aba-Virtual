import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { toast } from "react-toastify";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { ArrowBack, CheckCircle, Lock } from "@mui/icons-material";
import { RESOURCE } from "Utils/Queries/Blog";
import { useProjectContext, formatAmount } from "Utils/Context";
import { downloadResource } from "./downloadResource";
import {
  findStaticResource,
  compareAtPrice,
  FFC_BUNDLE_ID,
  TRAINING_BUNDLE_ID,
} from "Utils/staticResources";
import { getResourcePreview } from "Utils/resourcePreviews";
import BundleLanding from "./BundleLanding";
import TrainingBundleLanding from "./TrainingBundleLanding";

function AuthorIntro({ authors }) {
  const author = authors?.[0];

  if (!author) return null;

  return (
    <section className="bg-[#f7fafc] py-14 px-6 rounded-xl mt-10 shadow-inner">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left: Text */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#265c7e]">
            About the Trainer
          </h1>

          <div className="mt-5 space-y-4 text-gray-700 leading-relaxed">
            {author.description?.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </div>
        </div>

        {/* Right: Profile */}
        <div className="flex flex-col items-center">
          <img
            src={author.image.asset.url}
            alt={author.name}
            className="w-56 h-56 rounded-full object-cover shadow-lg border-4 border-[#45B4B3]/20"
          />
          <h3 className="mt-4 text-xl font-bold text-[#265c7e]">
            {author.name}
          </h3>
        </div>
      </div>
    </section>
  );
}

function HeroPreview({ preview, title }) {
  const [expanded, setExpanded] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    if (expanded) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expanded]);

  return (
    <div ref={previewRef} className="w-full t:w-1/2">
      <Typography variant="h6" sx={{ color: "#265c7e", fontWeight: 800, mb: 1.5 }}>
        Preview
      </Typography>
      <div
        onClick={() => setExpanded((v) => !v)}
        className={`relative rounded-lg shadow-lg overflow-hidden border border-gray-200 ${
          expanded ? "cursor-zoom-out" : "cursor-zoom-in hover:opacity-95 transition-opacity"
        }`}
      >
        <img
          src={preview.unlockedImage}
          alt={`${title} preview page`}
          className={expanded ? "w-full h-auto" : "w-full aspect-[3/4] object-cover object-top"}
        />

        {!expanded && (
          <>
            {/* Only a peek of the real page stays clear; the rest fades under a locked layer. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(4,37,57,0) 0%, rgba(4,37,57,0.25) 18%, rgba(4,37,57,0.85) 42%, rgba(4,37,57,0.95) 100%)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pt-[18%]">
              <Lock sx={{ color: "#ffffff", fontSize: 34 }} />
              <span className="text-white font-bold text-center px-4">
                {preview.totalPages} pages total
              </span>
              <span className="text-white/80 text-sm text-center px-4">
                Unlocked after purchase
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const actionButtonStyle = {
  gap: 12,
  padding: "10px 26px",
  borderRadius: 26,
  border: "none",
  background: "#45B4B3",
  color: "white",
  fontSize: 20,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(4,37,57,0.12), 0 1px 3px rgba(4,37,57,0.15)",
  transition: "all 150ms ease",
};

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dispatch, user, cart, currency, priceOf, setCartOpen } =
    useProjectContext();
  const [isPaid, setIsPaid] = useState(false);

  const staticResource = findStaticResource(id);
  const { loading, error, data } = useQuery(RESOURCE, {
    variables: { id },
    skip: !!staticResource,
  });
  const resource = staticResource || data?.Resource;
  const preview = getResourcePreview(id);

  const inCart = cart.some((item) => item.id === id);

  useEffect(() => {
    if (user) setIsPaid(user.paidItems.some((item) => item?.id === id));
  }, [user, id]);

  const handleAddToCart = () => {
    if (!inCart) {
      dispatch({
        type: "ADD",
        item: { id, title: resource.title, price: resource.price },
      });
      toast.success(`${resource.title} added to cart`);
      setCartOpen(true);
    }
  };

  const handleOpen = () => {
    if (resource.category === "Downloadable") {
      downloadResource(resource);
      return;
    }
    // A video bundle isn't a single Sanity document, so there's no one
    // video for /watch to play — that page is only correct for an
    // individual training. (FFC Bundle also has bundleContents but is
    // category "Downloadable", so it never reaches this branch.)
    if (resource.bundleContents?.length) {
      toast.info("Open each training below to watch it.");
      return;
    }
    navigate(`/resources/${id}/watch`);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: "#45B4B3" }} />
      </Box>
    );
  }

  if (error || !resource) {
    return (
      <Container maxWidth="md" sx={{ pt: { xs: "110px", sm: "130px" }, pb: 8 }}>
        <Alert severity="error">
          We couldn't load this resource. It may have been removed.
        </Alert>
        <button
          onClick={() => navigate("/resources")}
          style={{ ...actionButtonStyle, marginTop: 24 }}
        >
          Back to Resources
        </button>
      </Container>
    );
  }

  const price = priceOf({ id, price: resource.price });
  const compareAt = compareAtPrice(resource, priceOf);

  if (resource.id === FFC_BUNDLE_ID) {
    return (
      <BundleLanding
        resource={resource}
        isPaid={isPaid}
        inCart={inCart}
        onBuy={handleAddToCart}
        onOpen={handleOpen}
      />
    );
  }

  if (resource.id === TRAINING_BUNDLE_ID) {
    return (
      <TrainingBundleLanding
        resource={resource}
        isPaid={isPaid}
        inCart={inCart}
        onBuy={handleAddToCart}
      />
    );
  }

  return (
    <Container
      maxWidth="lg"
      component="main"
      sx={{ pt: { xs: "110px", sm: "130px" }, pb: 10 }}
    >
      {/* Back link */}
      <button
        onClick={() => navigate("/resources")}
        className="flex items-center gap-1 text-[#f9644d] font-semibold hover:underline mb-6"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <ArrowBack fontSize="small" />
        Back to Resources
      </button>

      {/* Hero: image (or preview gallery) + details */}
      <div className="flex t:flex-row flex-col gap-10 items-start">
        {preview && !isPaid ? (
          <HeroPreview preview={preview} title={resource.title} />
        ) : (
          <img
            src={resource.image?.asset?.url}
            alt={resource.title}
            className="w-full t:w-1/2 rounded-lg shadow-lg object-cover"
          />
        )}

        <div className="flex-1">
          <h1 className="text-3xl ml:text-4xl font-extrabold text-[#45B4B3]">
            {resource.title}
          </h1>

          <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip label={resource.category} size="small" />
            <Chip label={resource.type} size="small" variant="outlined" />
          </Box>

          <div className="flex items-center gap-3 flex-wrap mt-4">
            {!!compareAt && (
              <span className="text-lg text-gray-400 line-through">
                {formatAmount(compareAt, currency)}
              </span>
            )}
            <span className="text-2xl font-bold text-[#f97544]">
              {formatAmount(price, currency)}
            </span>
            {compareAt > price && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                Save {formatAmount(compareAt - price, currency)} (
                {Math.round(((compareAt - price) / compareAt) * 100)}
                %)
              </span>
            )}
          </div>

          <p className="mt-4 text-base leading-relaxed text-black">
            <b className="text-[#f97544]">Description: </b>
            {resource.description}
          </p>

          {!!resource.bundleContents?.length && (
            <div className="mt-5 grid grid-cols-1 t:grid-cols-3 gap-3">
              {resource.bundleContents.map((group) => (
                <div
                  key={group.label}
                  className="border border-[#45B4B3]/30 bg-[#45B4B3]/5 rounded-lg p-3"
                >
                  <div className="text-sm font-bold text-[#265c7e] mb-1.5">
                    {group.label}{" "}
                    <span className="text-[#f97544]">({group.items.length})</span>
                  </div>
                  <ul className="text-xs text-gray-700 space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {!!resource.perks?.length && (
            <List dense className="mt-2 space-y-1">
              {resource.perks.map((item, i) => (
                <ListItem
                  key={i}
                  className="bg-green-50 rounded-lg shadow-sm"
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CheckCircle className="text-emerald-500" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item}
                    primaryTypographyProps={{
                      fontWeight: 500,
                      color: "green.800",
                      variant: "body2",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-4 mt-8">
            {isPaid ? (
              <button onClick={handleOpen} style={actionButtonStyle}>
                {resource.category === "Downloadable" ? "Download" : "Watch"}
              </button>
            ) : inCart ? (
              <div style={{ ...actionButtonStyle, cursor: "default" }}>
                Added to cart ✔
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                style={actionButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {compareAt > price
                  ? `Buy the Bundle for ${formatAmount(price, currency)}`
                  : `Buy for ${formatAmount(price, currency)}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Training disclaimer + trainer bio */}
      <section className="mt-12">
        {resource.category === "Training" && (
          <Alert severity="warning">
            Our trainings are for <strong>educational purposes only</strong> and
            do not qualify for continuing education units (CEUs).
          </Alert>
        )}

        <AuthorIntro authors={resource.authors} />
      </section>
    </Container>
  );
}
