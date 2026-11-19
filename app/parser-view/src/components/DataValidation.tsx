import { IconCheckCircle, IconExclamationCircle } from '@arco-design/web-react/icon'
import type { ThriftSchema } from '@trasm/thrift-jsma'
import { useMemo } from 'react'
import { Compile } from 'typebox/compile'
import type { Example } from '../examples'
import CodeEditor from './CodeEditor'

interface Props {
	example: Example
	schema: ThriftSchema
	payload: string
	onChange: (payload: string) => void
}

function messageOf(error: unknown) {
	return error instanceof Error ? error.message : String(error)
}

export default function DataValidation({ example, schema, payload, onChange }: Props) {
	// 校验器只随 schema 重新编译，编辑样例数据时可以直接复用。
	const compiled = useMemo(() => {
		try {
			return { validator: Compile(schema) }
		} catch (error) {
			return { error: messageOf(error) }
		}
	}, [schema])
	const result = useMemo(() => {
		if (!compiled.validator) return { title: 'Schema 无法编译', detail: compiled.error }
		let data: unknown
		try {
			data = JSON.parse(payload)
		} catch (error) {
			return { title: 'JSON 格式有误', detail: messageOf(error) }
		}
		try {
			const validator = compiled.validator
			if (validator.Check(data)) return { title: '校验通过', valid: true }
			// 使用 TypeBox 的 JSON Pointer，保留嵌套字段和数组下标。
			return { title: '校验失败', issues: validator.Errors(data) }
		} catch (error) {
			return { title: '校验失败', detail: messageOf(error) }
		}
	}, [compiled, payload])

	return (
		<div className='validation-pane'>
			<div className='payload-tools'>
				<span>JSON 数据</span>
				<div className='preset-buttons'>
					<button type='button' onClick={() => onChange(JSON.stringify(example.valid, null, 2))}>
						有效样例
					</button>
					<button type='button' onClick={() => onChange(JSON.stringify(example.invalid, null, 2))}>
						无效样例
					</button>
				</div>
			</div>
			<CodeEditor label='JSON 样例数据' language='json' value={payload} onChange={onChange} />
			<div role='status' className={result.valid ? 'validation-status passed' : 'validation-status failed'}>
				<strong>
					{result.valid ? <IconCheckCircle /> : <IconExclamationCircle />}
					{result.title}
				</strong>
				{result.detail && <div>{result.detail}</div>}
				{result.issues?.map((issue) => (
					<div key={JSON.stringify(issue)} className='validation-issue'>
						<code>{issue.instancePath || '根节点'}</code> {issue.message}
					</div>
				))}
			</div>
		</div>
	)
}
