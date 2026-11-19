---
"@trasm/thrift-jsma": patch
---

fix: emit serializable references for recursive Thrift fields and nested containers
fix: 为递归 Thrift 字段和嵌套容器生成可序列化的引用

fix: isolate conversions, honor required named fields, and report unresolved types
fix: 隔离每次转换，保留命名类型字段的必填约束，并报告未解析的类型

fix: infer omitted enum values from the previous member
fix: 按前一个枚举成员推算省略的值
