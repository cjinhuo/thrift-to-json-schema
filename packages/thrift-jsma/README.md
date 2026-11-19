# @trasm/thrift-jsma

Convert Thrift definitions to JSON Schema text with `parseThriftToJsonSchema`, or get the schema object with `parseThriftToTypeBox`.

```js
import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'

const schema = parseThriftToJsonSchema('struct User { 1: string name }')
```

Schema annotations accept JavaScript expressions. For example, `@schema maxLength:4 * 8` sets the limit to 32. If evaluation throws, the annotation keeps its original value as text. Use trusted Thrift input with this parser.

The package supports ESM and CommonJS and includes TypeScript declarations. See the [project documentation](https://github.com/cjinhuo/thrift-to-json-schema) for schema annotations and the [online editor](https://cjinhuo.github.io/thrift-to-json-schema/) to try a conversion.
