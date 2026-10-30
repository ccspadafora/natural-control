import { defineConfig } from "orval"

const schema =
  process.env.ORVAL_SCHEMA ??
  (process.env.ORVAL_OFFLINE ? "./openapi.stub.json" : "http://localhost:8000/api/schema/")

export default defineConfig({
  nc: {
    input: { target: schema },
    output: {
      mode: "tags-split",
      target: "./src/generated/endpoints",
      schemas: "./src/generated/models",
      client: "react-query",
      clean: true,
      override: {
        mutator: {
          path: "./src/orval-mutator.ts",
          name: "ncFetch",
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
})
