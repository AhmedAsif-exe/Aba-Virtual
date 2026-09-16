import {defineType, defineField} from 'sanity'
import type {StringRule, NumberRule} from 'sanity'

export default defineType({
  name: 'resource',
  title: 'Resource',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule: StringRule) => rule.required(),
    }),
    defineField({
      name: 'authors',
      title: 'Authors',
      type: 'array',
      of: [{type: 'author'}],
      hidden: ({parent}) => parent?.category !== 'Training', // 👈 CONDITIONAL VISIBILITY
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          {title: 'Downloadable', value: 'Downloadable'},
          {title: 'Training', value: 'Training'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          {title: 'PDF', value: 'PDF'},
          {title: 'PPT', value: 'PPT'},
          {title: 'Short Video', value: 'Short Video'},
          {title: 'Long Video', value: 'Long Video'},
        ],
      },
    }),
    defineField({
      name: 'price',
      title: 'Price (EUR)',
      description:
        'Items with a fixed PKR price in BackEnd/Services/pricing.js ignore this value',
      type: 'number',
      validation: (rule: NumberRule) => rule.min(0),
    }),
    defineField({
      name: 'url',
      title: 'File/Video URL',
      type: 'string',
      description: 'Cloud storage link, PayPal item ID, or video identifier',
    }),
    defineField({
      name: 'transcripturl',
      title: 'transcript URL',
      type: 'string',
      description: 'Cloud storage link, PayPal item ID, or video identifier',
    }),
    defineField({
      name: 'image',
      title: 'Preview Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Important for accessibility and SEO',
        },
      ],
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'perks',
      title: 'Perks',
      type: 'array',
      of: [{type: 'string'}],
      description: 'List the benefits of this resource',
    }),
  ],
})
