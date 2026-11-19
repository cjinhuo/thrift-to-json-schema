# @trasm/thrift-jsma

Convert Thrift definitions to JSON Schema text with `parseThriftToJsonSchema`, or get the schema object with `parseThriftToTypeBox`.

```js
import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'

const schema = parseThriftToJsonSchema('struct User { 1: string name }')
```

Self-references and mutual references work in fields, lists, sets, and map values. A recursive field refers back to its enclosing struct by `$ref`. Both public APIs produce a serializable schema.

```js
const filter = JSON.parse(
	parseThriftToJsonSchema(`
  struct FlexFilter {
    1: string type
    5: list<FlexFilter> sub_conditions
  }
`)
)
console.log(filter.properties.sub_conditions.items.$ref === filter.$id) // true
```

Schema annotations accept JavaScript expressions. For example, `@schema maxLength:4 * 8` sets the limit to 32. If evaluation throws, the annotation keeps its original value as text. Use trusted Thrift input with this parser.

The SDK returns TypeBox 1 schemas. Applications using TypeBox validators should add `typebox` as a direct dependency with `pnpm add typebox@^1`. When migrating from `@sinclair/typebox`, import `Value` from `typebox/value` and replace `TypeCompiler.Compile` with `Compile` from `typebox/compile`. The SDK's CommonJS entry still supports synchronous `require()`.

```js
import { parseThriftToTypeBox } from '@trasm/thrift-jsma'
import { Compile } from 'typebox/compile'

const schema = parseThriftToTypeBox('struct User { 1: string name }')
if (schema) console.log(Compile(schema).Check({ name: 'Ada' })) // true
```

The package supports ESM and CommonJS and includes TypeScript declarations. See the [project documentation](https://github.com/cjinhuo/thrift-to-json-schema) for schema annotations and the [online editor](https://cjinhuo.github.io/thrift-to-json-schema/) to try a conversion.
