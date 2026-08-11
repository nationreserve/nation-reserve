import { Redis } from "ioredis";

import type { ManagedDependency } from "./types.js";

export interface RedisDependency extends ManagedDependency {
  consumeRateLimit(key:string,limit:number,windowSeconds:number):Promise<boolean>;
  getJson<T>(key:string):Promise<T|undefined>;
  setJson(key:string,value:unknown,ttlSeconds:number,tags:string[]):Promise<void>;
  invalidateTag(tag:string):Promise<number>;
}

export function createRedisDependency(redisUrl: string): RedisDependency {
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });

  client.on("error", () => {
    // Connection state is surfaced through /ready and the startup logger.
  });

  return {
    async connect() {
      if (client.status === "wait") {
        await client.connect();
      }
      await client.ping();
    },
    async check() {
      try {
        if (client.status === "wait") {
          await client.connect();
        }
        await client.ping();
        return "up";
      } catch {
        return "down";
      }
    },
    async consumeRateLimit(key,limit,windowSeconds) {
      const count=await client.incr(key);
      if(count===1)await client.expire(key,windowSeconds);
      return count<=limit;
    },
    async getJson<T>(key:string) {
      const value=await client.get(`rwp:cache:${key}`);return value===null?undefined:JSON.parse(value) as T;
    },
    async setJson(key,value,ttlSeconds,tags) {
      const cacheKey=`rwp:cache:${key}`,pipeline=client.pipeline().set(cacheKey,JSON.stringify(value),"EX",ttlSeconds);
      for(const tag of tags)pipeline.sadd(`rwp:cache-tag:${tag}`,cacheKey).expire(`rwp:cache-tag:${tag}`,ttlSeconds+60);
      await pipeline.exec();
    },
    async invalidateTag(tag) {
      const tagKey=`rwp:cache-tag:${tag}`,keys=await client.smembers(tagKey);if(!keys.length){await client.del(tagKey);return 0;}const pipeline=client.pipeline();for(const key of keys)pipeline.del(key);pipeline.del(tagKey);await pipeline.exec();return keys.length;
    },
    async close() {
      if (client.status !== "end") {
        client.disconnect();
      }
      await Promise.resolve();
    },
  };
}


