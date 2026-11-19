import { IconBook, IconLaunch } from '@arco-design/web-react/icon'
import { StreamLanguage } from '@codemirror/language'
import { javascript } from '@codemirror/legacy-modes/mode/javascript'
import { classHighlighter, highlightTree } from '@lezer/highlight'
import { type ReactNode, useState } from 'react'
import CopyButton from './CopyButton'

const snippets = [
	{
		title: '生成 JSON',
		detail: 'parseThriftToJsonSchema 返回 JSON 字符串，可以直接写入文件或通过网络传输。',
		code: `import { parseThriftToJsonSchema } from '@trasm/thrift-jsma'

const idl = 'struct User { 1: required string name }'
const json = parseThriftToJsonSchema(idl)
console.log(JSON.parse(json).required) // ['name']`,
	},
	{
		title: 'TypeBox 校验',
		detail: '安装 typebox 后，使用 Compile 编译 SDK 返回的 schema，再用 Check 校验数据。',
		code: `import { parseThriftToTypeBox } from '@trasm/thrift-jsma'
import { Compile } from 'typebox/compile'

const idl = 'struct User { 1: required string name }'
const schema = parseThriftToTypeBox(idl)
if (schema) console.log(Compile(schema).Check({ name: 'Ada' })) // true`,
	},
]

const parser = StreamLanguage.define(javascript).parser
function highlight(code: string) {
	const pieces: ReactNode[] = []
	let end = 0
	highlightTree(parser.parse(code), classHighlighter, (from, to, classes) => {
		pieces.push(
			code.slice(end, from),
			<span key={from} className={classes}>
				{code.slice(from, to)}
			</span>
		)
		end = to
	})
	return [...pieces, code.slice(end)]
}
const highlighted = snippets.map(({ code }) => highlight(code))

export default function QuickStart() {
	const [selected, setSelected] = useState(0)
	const snippet = snippets[selected]
	return (
		<section id='sdk-usage' aria-labelledby='usage-title'>
			<div className='section-heading'>
				<h2 id='usage-title'>SDK 用法</h2>
				<a
					className='doc-link'
					href='https://github.com/cjinhuo/thrift-to-json-schema#usage'
					target='_blank'
					rel='noreferrer'
				>
					<IconBook />
					查看文档
					<IconLaunch />
				</a>
			</div>
			<div className='usage-panel'>
				<div className='usage-options'>
					<div className='usage-switch'>
						{snippets.map(({ title }, index) => (
							<button type='button' key={title} aria-pressed={selected === index} onClick={() => setSelected(index)}>
								{title}
							</button>
						))}
					</div>
					<p>{snippet.detail}</p>
				</div>
				<div className='snippet'>
					<CopyButton text={snippet.code} label='复制用法代码' />
					<pre>
						<code>{highlighted[selected]}</code>
					</pre>
				</div>
			</div>
		</section>
	)
}
