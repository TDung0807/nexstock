import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    apiKey = process.env.INTERNAL_API_KEY as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / is public', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('GET /auth/me without a token is rejected', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('GET /users without a token is rejected', () => {
    return request(app.getHttpServer()).get('/users').expect(401);
  });

  describe('POST /auth/verify', () => {
    it('rejects calls without the internal API key', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .send({ token: 'whatever' })
        .expect(401);
    });

    it('rejects a wrong internal API key', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .set('x-internal-api-key', 'wrong-key')
        .send({ token: 'whatever' })
        .expect(401);
    });

    it('validates the request body (missing token)', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .set('x-internal-api-key', apiKey)
        .send({})
        .expect(400);
    });

    it('rejects an invalid token with a valid API key', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .set('x-internal-api-key', apiKey)
        .send({ token: 'not-a-real-jwt' })
        .expect(401);
    });
  });
});
