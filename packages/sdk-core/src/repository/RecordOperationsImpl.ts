/**
 * RecordOperationsImpl - Low-level record CRUD operations
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { NetworkError, ValidationError } from "../core/errors.js";
import type { LexiconRegistry } from "./LexiconRegistry.js";
import type { RecordOperations } from "./interfaces.js";
import type { CreateResult, UpdateResult, PaginatedList } from "./types.js";

export class RecordOperationsImpl implements RecordOperations {
  constructor(
    private agent: Agent,
    private repoDid: string,
    private lexiconRegistry: LexiconRegistry,
  ) {}

  async create(params: { collection: string; record: unknown; rkey?: string }): Promise<CreateResult> {
    const validation = this.lexiconRegistry.validate(params.collection, params.record);
    if (!validation.valid) {
      throw new ValidationError(`Invalid record for collection ${params.collection}: ${validation.error}`);
    }

    try {
      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection: params.collection,
        record: params.record as Record<string, unknown>,
        rkey: params.rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create record");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to create record: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

  async update(params: { collection: string; rkey: string; record: unknown }): Promise<UpdateResult> {
    const validation = this.lexiconRegistry.validate(params.collection, params.record);
    if (!validation.valid) {
      throw new ValidationError(`Invalid record for collection ${params.collection}: ${validation.error}`);
    }

    try {
      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection: params.collection,
        rkey: params.rkey,
        record: params.record as Record<string, unknown>,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update record");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to update record: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

  async get(params: { collection: string; rkey: string }): Promise<{ uri: string; cid: string; value: unknown }> {
    try {
      const result = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection: params.collection,
        rkey: params.rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to get record");
      }

      return { uri: result.data.uri, cid: result.data.cid ?? "", value: result.data.value };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get record: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

  async list(params: { collection: string; limit?: number; cursor?: string }): Promise<PaginatedList<{ uri: string; cid: string; value: unknown }>> {
    try {
      const result = await this.agent.com.atproto.repo.listRecords({
        repo: this.repoDid,
        collection: params.collection,
        limit: params.limit,
        cursor: params.cursor,
      });

      if (!result.success) {
        throw new NetworkError("Failed to list records");
      }

      return {
        records: result.data.records?.map((r) => ({ uri: r.uri, cid: r.cid, value: r.value })) || [],
        cursor: result.data.cursor ?? undefined,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to list records: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

  async delete(params: { collection: string; rkey: string }): Promise<void> {
    try {
      const result = await this.agent.com.atproto.repo.deleteRecord({
        repo: this.repoDid,
        collection: params.collection,
        rkey: params.rkey,
      });

      if (!result.success) {
        throw new NetworkError("Failed to delete record");
      }
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to delete record: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }
}
