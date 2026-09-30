import request from "supertest";
import { describe, expect, it, beforeAll } from "vitest";

import app from "../../src/app";

const uniqueEmail = (): string =>
    `cat-test-${Date.now()}-${Math.random().toString(36).slice(2)}@imperium.test`;

let token: string;

beforeAll(async () => {
    const res = await request(app)
        .post("/api/auth/register")
        .send({ email: uniqueEmail(), password: "securePass1" });

    token = res.body.data.accessToken;
});

const authGet = (path: string) =>
    request(app).get(path).set("Authorization", `Bearer ${token}`);

const authPost = (path: string) =>
    request(app).post(path).set("Authorization", `Bearer ${token}`);

const authPut = (path: string) =>
    request(app).put(path).set("Authorization", `Bearer ${token}`);

const authDelete = (path: string) =>
    request(app).delete(path).set("Authorization", `Bearer ${token}`);

describe("Categories Module", () => {
    describe("GET /api/categories", () => {
        it("returns default categories after registration", async () => {
            const res = await authGet("/api/categories");

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThanOrEqual(10);

            const defaults = res.body.data.filter((c: { isDefault: boolean }) => c.isDefault);
            expect(defaults.length).toBe(10);
        });

        it("returns 401 without auth token", async () => {
            const res = await request(app).get("/api/categories");

            expect(res.status).toBe(401);
        });
    });

    describe("POST /api/categories", () => {
        it("creates a custom category", async () => {
            const res = await authPost("/api/categories").send({
                name: "Subscriptions",
                type: "expense"
            });

            expect(res.status).toBe(201);
            expect(res.body.data.name).toBe("Subscriptions");
            expect(res.body.data.type).toBe("expense");
            expect(res.body.data.isDefault).toBe(false);
            expect(res.body.data.id).toBeDefined();
        });

        it("returns 409 for duplicate category name", async () => {
            const name = `Unique-${Date.now()}`;

            await authPost("/api/categories").send({ name, type: "income" });

            const res = await authPost("/api/categories").send({ name, type: "income" });

            expect(res.status).toBe(409);
            expect(res.body.code).toBe("CATEGORY_ALREADY_EXISTS");
        });

        it("returns 400 for missing fields", async () => {
            const res = await authPost("/api/categories").send({ name: "X" });

            expect(res.status).toBe(400);
            expect(res.body.code).toBe("VALIDATION_ERROR");
        });
    });

    describe("PUT /api/categories/:categoryId", () => {
        it("renames a custom category", async () => {
            const createRes = await authPost("/api/categories").send({
                name: "Old Name",
                type: "expense"
            });
            const categoryId = createRes.body.data.id;

            const res = await authPut(`/api/categories/${categoryId}`).send({
                name: "New Name"
            });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe("New Name");
        });

        it("returns 409 when renaming to an existing name", async () => {
            const name1 = `Cat-A-${Date.now()}`;
            const name2 = `Cat-B-${Date.now()}`;

            await authPost("/api/categories").send({ name: name1, type: "expense" });
            const createRes = await authPost("/api/categories").send({
                name: name2,
                type: "expense"
            });
            const categoryId = createRes.body.data.id;

            const res = await authPut(`/api/categories/${categoryId}`).send({
                name: name1
            });

            expect(res.status).toBe(409);
            expect(res.body.code).toBe("CATEGORY_ALREADY_EXISTS");
        });

        it("returns 409 when trying to rename a default category", async () => {
            const listRes = await authGet("/api/categories");
            const defaultCat = listRes.body.data.find((c: { isDefault: boolean }) => c.isDefault);

            const res = await authPut(`/api/categories/${defaultCat.id}`).send({
                name: "Renamed Default"
            });

            expect(res.status).toBe(409);
            expect(res.body.code).toBe("DEFAULT_CATEGORY");
        });

        it("returns 404 for non-existent category", async () => {
            const res = await authPut("/api/categories/non-existent-id").send({
                name: "Whatever"
            });

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
        });
    });

    describe("DELETE /api/categories/:categoryId", () => {
        it("deletes a custom category with no linked transactions", async () => {
            const createRes = await authPost("/api/categories").send({
                name: `Deletable-${Date.now()}`,
                type: "expense"
            });
            const categoryId = createRes.body.data.id;

            const res = await authDelete(`/api/categories/${categoryId}`);

            expect(res.status).toBe(200);
            expect(res.body.data.deleted).toBe(true);
        });

        it("returns 404 for non-existent category", async () => {
            const res = await authDelete("/api/categories/non-existent-id");

            expect(res.status).toBe(404);
            expect(res.body.code).toBe("CATEGORY_NOT_FOUND");
        });
    });
});
