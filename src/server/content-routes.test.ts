import { describe, it, expect } from 'vitest';

interface RouteLayer {
  route?: {
    path: string;
    methods: {
      get?: boolean;
      post?: boolean;
      put?: boolean;
      delete?: boolean;
      patch?: boolean;
    };
  };
}

describe('Content API Routes', () => {
  describe('Articles Router', () => {
    it('has GET / route for listing articles', async () => {
      const { default: articlesRouter } = await import('./routes/articles.js');
      const route = articlesRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has GET /:id route for getting single article', async () => {
      const { default: articlesRouter } = await import('./routes/articles.js');
      const route = articlesRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has POST / route for creating articles', async () => {
      const { default: articlesRouter } = await import('./routes/articles.js');
      const route = articlesRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.post);
      expect(route).toBeDefined();
    });

    it('has PUT /:id route for updating articles', async () => {
      const { default: articlesRouter } = await import('./routes/articles.js');
      const route = articlesRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.put);
      expect(route).toBeDefined();
    });

    it('has DELETE /:id route for deleting articles', async () => {
      const { default: articlesRouter } = await import('./routes/articles.js');
      const route = articlesRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.delete);
      expect(route).toBeDefined();
    });
  });

  describe('FAQs Router', () => {
    it('has GET / route for listing FAQs', async () => {
      const { default: faqsRouter } = await import('./routes/faqs.js');
      const route = faqsRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has GET /:id route for getting single FAQ', async () => {
      const { default: faqsRouter } = await import('./routes/faqs.js');
      const route = faqsRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has POST / route for creating FAQs', async () => {
      const { default: faqsRouter } = await import('./routes/faqs.js');
      const route = faqsRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.post);
      expect(route).toBeDefined();
    });

    it('has PUT /:id route for updating FAQs', async () => {
      const { default: faqsRouter } = await import('./routes/faqs.js');
      const route = faqsRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.put);
      expect(route).toBeDefined();
    });

    it('has DELETE /:id route for deleting FAQs', async () => {
      const { default: faqsRouter } = await import('./routes/faqs.js');
      const route = faqsRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.delete);
      expect(route).toBeDefined();
    });
  });

  describe('Videos Router', () => {
    it('has GET / route for listing videos', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has GET /:id route for getting single video', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has GET /:id/status route for video analysis status', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id/status' && r.route?.methods?.get);
      expect(route).toBeDefined();
    });

    it('has POST / route for creating videos', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/' && r.route?.methods?.post);
      expect(route).toBeDefined();
    });

    it('has PUT /:id route for updating videos', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.put);
      expect(route).toBeDefined();
    });

    it('has DELETE /:id route for deleting videos', async () => {
      const { default: videosRouter } = await import('./routes/videos.js');
      const route = videosRouter.stack.find((r: RouteLayer) => r.route?.path === '/:id' && r.route?.methods?.delete);
      expect(route).toBeDefined();
    });
  });
});
