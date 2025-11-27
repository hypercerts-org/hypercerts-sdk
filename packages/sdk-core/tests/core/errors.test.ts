import { describe, it, expect } from "vitest";
import {
  ATProtoSDKError,
  AuthenticationError,
  SessionExpiredError,
  ValidationError,
  NetworkError,
  SDSRequiredError,
} from "../../src/core/errors.js";

describe("ATProtoSDKError", () => {
  it("should create error with message and code", () => {
    const error = new ATProtoSDKError("Test error", "TEST_ERROR", 500);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.status).toBe(500);
    expect(error.name).toBe("ATProtoSDKError");
  });

  it("should include cause if provided", () => {
    const cause = new Error("Original error");
    const error = new ATProtoSDKError("Test error", "TEST_ERROR", 500, cause);
    expect(error.cause).toBe(cause);
  });
});

describe("AuthenticationError", () => {
  it("should create authentication error with 401 status", () => {
    const error = new AuthenticationError("Auth failed");
    expect(error.message).toBe("Auth failed");
    expect(error.code).toBe("AUTHENTICATION_ERROR");
    expect(error.status).toBe(401);
    expect(error.name).toBe("AuthenticationError");
  });
});

describe("SessionExpiredError", () => {
  it("should create session expired error with default message", () => {
    const error = new SessionExpiredError();
    expect(error.message).toBe("Session expired");
    expect(error.code).toBe("SESSION_EXPIRED");
    expect(error.status).toBe(401);
  });

  it("should accept custom message", () => {
    const error = new SessionExpiredError("Custom message");
    expect(error.message).toBe("Custom message");
  });
});

describe("ValidationError", () => {
  it("should create validation error with 400 status", () => {
    const error = new ValidationError("Invalid input");
    expect(error.message).toBe("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.status).toBe(400);
  });
});

describe("NetworkError", () => {
  it("should create network error with 503 status", () => {
    const error = new NetworkError("Network failure");
    expect(error.message).toBe("Network failure");
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.status).toBe(503);
  });
});

describe("SDSRequiredError", () => {
  it("should create SDS required error with default message", () => {
    const error = new SDSRequiredError();
    expect(error.message).toBe("This operation requires a Shared Data Server (SDS)");
    expect(error.code).toBe("SDS_REQUIRED");
    expect(error.status).toBe(400);
  });

  it("should accept custom message", () => {
    const error = new SDSRequiredError("Custom SDS error");
    expect(error.message).toBe("Custom SDS error");
  });
});
