# overview
thrift to JSON schema

# install
`pnpm add @trasm/thrift-jsma`

# usage
```js
import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'
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
```

