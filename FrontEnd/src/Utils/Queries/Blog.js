// src/Utils/Queries/fetchAllBlogs.js
import { gql } from "@apollo/client";

// ---- BLOG QUERIES ----
export const ALL_BLOGS = gql`
  {
    allBlog {
      _id
      title
      categories
      authors {
        name
        image {
          asset {
            url
          }
        }
      }
      description
      mainImage {
        asset {
          url
        }
      }
      publishedAt
    }
  }
`;

export const BLOGS = gql`
  query GetBlog($id: ID!) {
    Blog(id: $id) {
      _id
      title
      categories
      description
      mainImage {
        asset {
          altText
          url
        }
      }
      authors {
        name
        description
        image {
          asset {
            url
          }
        }
        facebook
        instagram
        linkedIn
      }
      sections {
        subheading
        contentRaw
      }
      publishedAt
    }
  }
`;

// ---- RESOURCE QUERIES ----
export const ALL_RESOURCES = gql`
  {
    allResource {
      _id
      title
      category
      type
      price
      url
      perks
      image {
        asset {
          url
        }
      }
      authors {
        name
        description
        image {
          asset {
            url
          }
        }
      }
      description
    }
  }
`;

export const RESOURCE = gql`
  query GetResource($id: ID!) {
    Resource(id: $id) {
      _id
      title
      category
      type
      price
      url
      transcripturl
      perks
      image {
        asset {
          url
        }
      }
      authors {
        name
        description
        image {
          asset {
            url
          }
        }
      }
      description
    }
  }
`;
