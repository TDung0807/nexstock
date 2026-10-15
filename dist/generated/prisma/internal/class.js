import * as runtime from "@prisma/client/runtime/client";
const config = {
    "previewFeatures": [],
    "clientVersion": "7.10.0",
    "engineVersion": "0edf323efd1d98336f3f0a68684b56f689b900d3",
    "activeProvider": "postgresql",
    "inlineSchema": "generator client {\n  provider     = \"prisma-client\"\n  output       = \"../src/generated/prisma\"\n  moduleFormat = \"cjs\"\n}\n\ndatasource db {\n  provider = \"postgresql\"\n}\n\nenum UserStatus {\n  ACTIVE\n  DISABLED\n  LOCKED\n}\n\nmodel User {\n  id           String     @id @default(uuid()) @db.Uuid\n  email        String     @unique\n  passwordHash String     @map(\"password_hash\")\n  fullName     String?    @map(\"full_name\")\n  status       UserStatus @default(ACTIVE)\n  createdAt    DateTime   @default(now()) @map(\"created_at\")\n  updatedAt    DateTime   @updatedAt @map(\"updated_at\")\n\n  @@map(\"users\")\n}\n",
    "runtimeDataModel": {
        "models": {},
        "enums": {},
        "types": {}
    },
    "parameterizationSchema": {
        "strings": [],
        "graph": ""
    }
};
config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"password_hash\"},{\"name\":\"fullName\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"full_name\"},{\"name\":\"status\",\"kind\":\"enum\",\"type\":\"UserStatus\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"created_at\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"updated_at\"}],\"dbName\":\"users\",\"schema\":null}},\"enums\":{},\"types\":{}}");
config.parameterizationSchema = {
    strings: JSON.parse("[\"where\",\"User.findUnique\",\"User.findUniqueOrThrow\",\"orderBy\",\"cursor\",\"User.findFirst\",\"User.findFirstOrThrow\",\"User.findMany\",\"data\",\"User.createOne\",\"User.createMany\",\"User.createManyAndReturn\",\"User.updateOne\",\"User.updateMany\",\"User.updateManyAndReturn\",\"create\",\"update\",\"User.upsertOne\",\"User.deleteOne\",\"User.deleteMany\",\"having\",\"_count\",\"_min\",\"_max\",\"User.groupBy\",\"User.aggregate\",\"AND\",\"OR\",\"NOT\",\"id\",\"email\",\"passwordHash\",\"fullName\",\"UserStatus\",\"status\",\"createdAt\",\"updatedAt\",\"equals\",\"in\",\"notIn\",\"lt\",\"lte\",\"gt\",\"gte\",\"not\",\"contains\",\"startsWith\",\"endsWith\",\"set\"]"),
    graph: "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"
};
async function decodeBase64AsWasm(wasmBase64) {
    const { Buffer } = await import('node:buffer');
    const wasmArray = Buffer.from(wasmBase64, 'base64');
    return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
    getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.js"),
    getQueryCompilerWasmModule: async () => {
        const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js");
        return await decodeBase64AsWasm(wasm);
    },
    importName: "./query_compiler_fast_bg.js"
};
export function getPrismaClientClass() {
    return runtime.getPrismaClient(config);
}
//# sourceMappingURL=class.js.map