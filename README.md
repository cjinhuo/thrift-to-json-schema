# overview
parse Thrift to JSON schema with typescript

# demo
[Online Demo](https://cjinhuo.github.io/thrift-to-json-schema/)

# install
`pnpm add @trasm/thrift-jsma`

# usage
```js
import { parseThriftToJsonSchema,parseThriftToTypeBox } from '@trasm/thrift-jsma'
  const structString = `
    struct EmptyStruct {
    string field_string
    double field_double
    i32 field_i32
    i64 field_i64
    bool field_bool
    optional string field_optional_string
    }
  `
  const jsonSchema = parseThriftToJsonSchema(structString)
  const jsonTypeBox = parseThriftToTypeBox(structString)
```

# references
* parse thrift to AST:https://github.com/creditkarma/thrift-parser
* built JSON schema with typescript:https://github.com/sinclairzx81/typebox



