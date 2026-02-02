import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const pageCount = await strapi.db.query('api::page.page').count();
    if (pageCount > 0) {
      return;
    }

    const richText = (text: string) => [
      {
        type: 'paragraph',
        children: [{ text }],
      },
    ];

    const pages = [
      {
        title: 'Policies',
        order: 1,
        description: richText('Core policies and guidance documents.'),
      },
      {
        title: 'Procedures',
        order: 2,
        description: richText('Operational procedures and reference material.'),
      },
    ];

    const createdPages = [];
    for (const page of pages) {
      const created = await strapi.entityService.create('api::page.page', {
        data: page,
      });
      createdPages.push(created);
    }

    const topicData = [
      { pageIndex: 0, title: 'General Policies', order: 1 },
      { pageIndex: 0, title: 'Compliance', order: 2 },
      { pageIndex: 1, title: 'Standard Operating Procedures', order: 1 },
      { pageIndex: 1, title: 'Field Guides', order: 2 },
    ];

    const createdTopics = [];
    for (const topic of topicData) {
      const created = await strapi.entityService.create('api::topic.topic', {
        data: {
          title: topic.title,
          order: topic.order,
          page: createdPages[topic.pageIndex].id,
        },
      });
      createdTopics.push(created);
    }

    const subtopicData = [
      {
        topicIndex: 0,
        title: 'Overview',
        order: 1,
        content: richText('Summary of overarching policy expectations.'),
        internalNumber: 'POL-001',
      },
      {
        topicIndex: 1,
        title: 'Reporting',
        order: 1,
        content: richText('Compliance reporting procedures and timelines.'),
        internalNumber: 'CMP-100',
      },
      {
        topicIndex: 2,
        title: 'Site Setup',
        order: 1,
        content: richText('Step-by-step setup guidance for new sites.'),
        internalNumber: 'SOP-010',
      },
      {
        topicIndex: 3,
        title: 'Quick Reference',
        order: 1,
        content: richText('Field-ready checklists and quick tips.'),
        internalNumber: 'FG-001',
      },
    ];

    for (const subtopic of subtopicData) {
      await strapi.entityService.create('api::subtopic.subtopic', {
        data: {
          title: subtopic.title,
          order: subtopic.order,
          content: subtopic.content,
          internalNumber: subtopic.internalNumber,
          topic: createdTopics[subtopic.topicIndex].id,
        },
      });
    }
  },
};
