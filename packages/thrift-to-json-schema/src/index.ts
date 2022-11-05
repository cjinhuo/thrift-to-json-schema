import { parseThriftToJsonSchema } from './parser'
const ThriftString = `
# @flag header
struct HttpSend {
    # @scheme breadcrumbs 111
    list<Breadcrumb> breadcrumbs // 面包屑
    # @scheme breadcrumbs 22
    
    common.Common common
    /* comment aaaa */
    string a
    # @scheme aaaaa
    string b
    # @scheme bbbbb
}
# @flag second
struct Breadcrumb {
    string type // dom | http 
}
struct Common {
    string type // dom | http 
}
`

console.log(JSON.stringify(parseThriftToJsonSchema(ThriftString)))
