import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

describe("Auth Module", () => {
    describe("POST /api/auth/register", () => {
        it("creates a new user and returns access token", async () => {
            const email = uniqueEmail();

            const response = await request(app)
                .post("/api/auth/register")
                .send({ email, password: "securePass1" });

            expect(response.status).toBe(201);
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.user.email).toBe(email);
            expect(response.body.data.user.id).toBeDefined();
            expect(response.body.data.user.createdAt).toBeDefined();
        });

        it("creates a user with an optional name", async () => {
            const email = uniqueEmail();

            const response = await request(app)
                .post("/api/auth/register")
                .send({ email, password: "securePass1", name: "John Doe" });

            expect(response.status).toBe(201);
            expect(response.body.data.user.name).toBe("John Doe");
        });

        it("returns 409 when email is already registered", async () => {
            const email = uniqueEmail();

            await request(app)
                .post("/api/auth/register")
                .send({ email, password: "securePass1" });

            const response = await request(app)
                .post("/api/auth/register")
                .send({ email, password: "securePass2" });

            expect(response.status).toBe(409);
            expect(response.body.code).toBe("EMAIL_ALREADY_IN_USE");
        });

        it("returns 400 for invalid email", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({ email: "not-an-email", password: "securePass1" });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("VALIDATION_ERROR");
        });

        it("returns 400 for short password", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({ email: uniqueEmail(), password: "short" });

            expect(response.status).toBe(400);
            expect(response.body.code).toBe("VALIDATION_ERROR");
        });
    });

    describe("POST /api/auth/login", () => {
        const email = uniqueEmail();
        const password = "securePass1";

        it("registers a user to use in login tests", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({ email, password });

            expect(response.status).toBe(201);
        });

        it("returns access token for valid credentials", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({ email, password });

            expect(response.status).toBe(200);
            expect(response.body.data.accessToken).toBeDefined();
        });

        it("returns 401 for wrong password", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({ email, password: "wrongPassword1" });

            expect(response.status).toBe(401);
            expect(response.body.code).toBe("INVALID_CREDENTIALS");
        });

        it("returns 401 for unknown email", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({ email: "unknown@imperium.test", password: "securePass1" });

            expect(response.status).toBe(401);
            expect(response.body.code).toBe("INVALID_CREDENTIALS");
        });
    });

    describe("GET /api/auth/me", () => {
        it("returns the authenticated user profile", async () => {
            const email = uniqueEmail();

            const registerRes = await request(app)
                .post("/api/auth/register")
                .send({ email, password: "securePass1", name: "Jane Doe" });

            const token = registerRes.body.data.accessToken;

            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.email).toBe(email);
            expect(response.body.data.name).toBe("Jane Doe");
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.createdAt).toBeDefined();
        });

        it("returns 401 when no token is provided", async () => {
            const response = await request(app).get("/api/auth/me");

            expect(response.status).toBe(401);
            expect(response.body.code).toBe("MISSING_TOKEN");
        });

        it("returns 401 for an invalid token", async () => {
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", "Bearer invalid.token.here");

            expect(response.status).toBe(401);
            expect(response.body.code).toBe("INVALID_TOKEN");
        });
    });
});
