export const examples = [
	{
		id: 'fields',
		title: '基础字段',
		subtitle: '必填字段与可选字段',
		file: 'user_profile.thrift',
		hint: '试着把 bio 的 optional 改成 required，观察右侧 required 数组，再用有效样例校验。',
		source: `// 用户档案
struct UserProfile {
  1: required string username
  # @schema minLength:2
  2: required i32 level

  // 公开资料
  3: optional string bio
  4: optional bool is_public
}`,
		valid: { username: 'ada', level: 3, is_public: true },
		invalid: { username: 'ada', level: 'three' },
	},
	{
		id: 'collections',
		title: '枚举与容器',
		subtitle: 'list · set · map',
		file: 'team.thrift',
		hint: 'Role 限定了成员角色的取值，set 生成 uniqueItems。试着在 tags 中重复一个标签。',
		source: `// 团队成员与角色
# @flag header
struct Team {
  1: required list<string> members
  2: required set<string> tags
  3: required map<string, Role> roles
}

enum Role {
  VIEWER = 0
  EDITOR = 1
}`,
		valid: { members: ['ada', 'lin'], tags: ['sdk', 'web'], roles: { ada: 1, lin: 0 } },
		invalid: { members: ['ada'], tags: ['sdk', 'sdk'], roles: { ada: 1 } },
	},
	{
		id: 'references',
		title: '递归引用',
		subtitle: '嵌套结构与 $ref',
		file: 'flex_filter.thrift',
		hint: 'sub_conditions 可以继续嵌套 FlexFilter。生成的 $ref 指向根结构的 $id，校验会深入每一层。',
		source: `// 可以嵌套任意层的筛选条件
struct FlexFilter {
  1: required string type
  2: optional string value
  3: optional list<FlexFilter> sub_conditions
}`,
		valid: { type: 'group', sub_conditions: [{ type: 'equals', value: 'active' }] },
		invalid: { type: 'group', sub_conditions: [{ type: 7 }] },
	},
	{
		id: 'annotations',
		title: '注解约束',
		subtitle: '@schema · @flag',
		file: 'product.thrift',
		hint: '@flag header 选择 Product 作为根结构，@schema 把 sku 的最大长度设为 12。试着修改表达式再校验。',
		source: `struct Price {
  1: required i32 cents
}

# @flag header
struct Product {
  1: required string sku
  # @schema maxLength:4 * 3
  2: required Price price
}`,
		valid: { sku: 'T-042', price: { cents: 1800 } },
		invalid: { sku: 'SKU-TOO-LONG-12345', price: { cents: 1800 } },
	},
] as const

export type Example = (typeof examples)[number]
export type ExampleId = Example['id']

export interface Draft {
	source: string
	payload: string
}

export function initialDraft(example: Example): Draft {
	return { source: example.source, payload: JSON.stringify(example.valid, null, 2) }
}
